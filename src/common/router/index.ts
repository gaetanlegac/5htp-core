/*----------------------------------
- DEPENDANCES
----------------------------------*/

// types
import type {
    default as ClientRouter,
    TRouterContext as ClientRouterContext,
    TRegisterPageArgs
} from '@client/services/router';

import type { 
    default as ServerRouter, 
    TRouterContext as ServerRouterContext,
    TRouteHttpMethod 
} from '@server/services/router';

import type { TUserRole } from '@server/services/auth';

import type { TAppArrowFunction } from '@common/app';

// Specfic
import type { default as Page, TFrontRenderer, TDataProvider } from './response/page';

/*----------------------------------
- TYPES: ROUTES
----------------------------------*/

export type { Layout } from './layouts';

export type { default as Request } from './request';
export type { default as Response } from './response';

export type ClientOrServerRouter = ClientRouter | ServerRouter;

export type TRoute<RouterContext extends TClientOrServerContext = TClientOrServerContext> = {

    // Match
    method: TRouteHttpMethod,
    path: string,
    regex: RegExp,
    keys: (number | string)[],

    // Execute
    controller: TRouteController<RouterContext>,//TServerController<TRouter> | TFrontRenderer<TRouter>,
    options: TRouteOptions
}

export type TErrorRoute<RouterContext extends TClientOrServerContext = TClientOrServerContext> = {
    code,
    controller: TRouteController<RouterContext>,
    options: TRouteOptions
}

export type TAnyRoute<RouterContext extends TClientOrServerContext = TClientOrServerContext> =
    TRoute<RouterContext> | TErrorRoute<RouterContext>

export type TClientOrServerContext = (
    (
        //{[serverContextKey in keyof ServerRouterContext/*Omit<ClientRouterContext, TClientOnlyContextKeys>*/]: undefined} 
        //& 
        ClientRouterContext
    )
    | 
    (
        // Tell that all the keys of client context are existing but undefined
        //  This avoids errors: "Property 'page' is optional in type '{ app: Application; ..."
        //  When we destructure the context from the page controller
        //  While making reference to a key only available in client context
        // So here, we put the
        //{[clientContextKey in keyof ClientRouterContext/*Omit<ClientRouterContext, TClientOnlyContextKeys>*/]: undefined} 
        //& 
        ServerRouterContext
    )
)

export type TRouteController<RouterContext extends TClientOrServerContext = TClientOrServerContext> = 
    (context: RouterContext) => /* Page to render */Page | /* Any data (html, json) */Promise<any>

export type TRouteOptions = {

    // Injected by the page plugin
    filepath?: string,
    data?: TDataProvider

    // Indexing
    bodyId?: string,
    priority: number,
    preload?: boolean,

    // Resolving
    domain?: string,
    accept?: string,
    auth?: TUserRole | boolean,

    // Rendering
    static?: boolean,
    layout?: false | string, // The nale of the layout

    // To cleanup
    TESTING?: boolean,
    logging?: boolean,
}

export type TRouteModule<TRegisteredRoute = any> = { 
    // exporing __register is a way to know we axport a TAppArrowFunction
    __register?: TAppArrowFunction<TRegisteredRoute> 
}

export type TDomainsList = {
    [endpointId: string]: string
} & {
    current: string
}

export const defaultOptions = {
    priority: 0,
}

/*----------------------------------
- FUNCTIONS
----------------------------------*/
export const buildUrl = (
    path: string,
    params: {[key: string]: any},
    domains: {[alias: string]: string},
    absolute: boolean
) => {

    let prefix: string = '';

    // Relative to domain
    if (path[0] === '/' && absolute)
        prefix = domains.current;
    // Other domains of the project
    else if (path[0] === '@') {

        // Extract domain ID from path
        let domainId: string;
        let slackPos = path.indexOf('/');
        if (slackPos === -1)
            slackPos = path.length;
        domainId = path.substring(1, slackPos);
        path = path.substring(slackPos);

        // Get domain
        const domain = domains[ domainId ];
        if (domain === undefined)
            throw new Error("Unknown API endpoint ID: " + domainId);

        // Return full url
        prefix = domain;

    // Absolute URL
    }

    // Path parapeters
    const searchParams = new URLSearchParams();
    for (const key in params) {

        // Exclude undefined of empty
        if (!params[key])
            continue;
        // Path placeholder
        else if (path.includes(':' + key))
            path = path.replace(':' + key, params[key]);
        // Query string
        else 
            searchParams.set(key, params[key]);
    }

    // Return final url
    return prefix + path + (searchParams.toString() ? '?' + searchParams.toString() : '');
}

/*----------------------------------
- BASE ROUTER
----------------------------------*/

export default abstract class RouterInterface {

    public abstract page<TControllerData extends TObjetDonnees = {}>(...args: TRegisterPageArgs<TControllerData>);

    public abstract error(code: number, options, renderer: TFrontRenderer<{}, { message: string }>);

}