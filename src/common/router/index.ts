/*----------------------------------
- DEPENDANCES
----------------------------------*/

import { Layout } from './layouts';

// types
import type {
    default as ClientRouter,
    TRouterContext as ClientRouterContext,
    TRegisterPageArgs
} from '@client/services/router';;

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

export type TRoute<RouterContext = TClientOrServerContext> = {

    // Match
    method: TRouteHttpMethod,
    path: string,
    regex: RegExp,
    keys: (number | string)[],

    // Execute
    controller: TRouteController<RouterContext>,//TServerController<TRouter> | TFrontRenderer<TRouter>,
    options: TRouteOptions
}

export type TErrorRoute<RouterContext = TClientOrServerContext> = {
    code,
    controller: TRouteController<RouterContext>,
    options: TRouteOptions
}

export type TClientOrServerContext = (
    ClientRouterContext<ClientRouter, ClientRouter["app"]>
    | 
    ServerRouterContext<ServerRouter>
)

export type TRouteController<RouterContext = TClientOrServerContext> = 
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
    layout?: false | Layout,

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