/*----------------------------------
- DEPENDANCES
----------------------------------*/

import { Layout } from './layouts';

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

import type { TUserRole } from '@server/services/users';

import type { TAppArrowFunction } from '@common/app';

// Specfic
import type ApiClient from './request/api';
import type Request from './request';
import type Response from './response';
import type { default as Page, TFrontRenderer } from './response/page';

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

export type TClientOrServerContext<
    TClientOnlyContextKeys extends keyof ClientRouterContext = keyof (ClientRouterContext | ServerRouterContext)
> = (
    (
        {[serverContextKey in keyof ServerRouterContext/*Omit<ClientRouterContext, TClientOnlyContextKeys>*/]: undefined} 
        & 
        ClientRouterContext
    )
    | 
    (
        // Tell that all the keys of client context are existing but undefined
        //  This avoids errors: "Property 'page' is optional in type '{ app: Application; ..."
        //  When we destructure the context from the page controller
        //  While making reference to a key only available in client context
        // So here, we put the
        {[clientContextKey in keyof ClientRouterContext/*Omit<ClientRouterContext, TClientOnlyContextKeys>*/]: undefined} 
        & 
        ServerRouterContext
    )
)

export type TRouteController<RouterContext extends TClientOrServerContext = TClientOrServerContext> = 
    (context: RouterContext) => /* Page to render */Page | /* Any data (html, json) */Promise<any>

export type TRouteOptions = {

    // Injected by the page plugin
    filepath?: string,

    // Indexing
    bodyId?: string,
    priority: number,
    preload?: boolean,

    // Resolving
    domain?: string,
    accept?: string,

    // Access Restriction
    auth?: TUserRole | boolean,
    //form?: TSchema,
    layout?: false | string, // The nale of the layout

    TESTING?: boolean,
    logging?: boolean,

}

export type TRouteModule<TRegisteredRoute = any> = { 
    // exporing __register is a way to know we axport a TAppArrowFunction
    __register?: TAppArrowFunction<TRegisteredRoute> 
}

export const defaultOptions = {
    priority: 0,
}

/*----------------------------------
- BASE ROUTER
----------------------------------*/

export default abstract class RouterInterface {

    public abstract page<TControllerData extends TObjetDonnees = {}>(...args: TRegisterPageArgs<TControllerData>);

    public abstract error(code: number, options, renderer: TFrontRenderer<{}, { message: string }>);

}