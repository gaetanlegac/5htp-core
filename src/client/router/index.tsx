/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import type { ComponentChild } from 'preact';
import type { Location } from 'history';

// Core: libs
import ClientRequest from './request';
import ClientResponse from './response';
import { history } from './request/history';

// Core: types
import BaseRouter, { TBaseRoute, TRouteOptions, defaultOptions, } from '@common/router'
import { PageResponse } from '@common/router/response';
import { TFetcher, TFetcherList } from '@common/router/request';
import type { TSsrData, default as ServerResponse } from '@server/services/router/response';
import type { ClientContext } from '@client/context';

// Type xports
export type { default as ClientResponse } from "./response";

/*----------------------------------
- TYPES: PARTIAL ROUTES
----------------------------------*/

export type TSsrUnresolvedRoute = Pick<TClientRoute, 'type' | 'keys'> & {
    regex: string,
    chunk: string,
}

export type TUnresolvedRoute = Pick<TClientRoute, 'type' | 'keys'> & {
    regex: RegExp,
    chunk: string,
    load: TRouteLoader,
}

type TFetchedRoute = Pick<TClientRoute, 'path' | 'options' | 'controller' | 'renderer' | 'method'>

/*----------------------------------
- TYPES: REGISTER
----------------------------------*/

type TRouteLoader = () => Promise<{ default: TFetchedRoute }>;

export type TRoutesLoaders = {
    [chunkId: string]: /* Preloaded via require() */TFetchedRoute | /* Loader via import() */TRouteLoader/* | undefined*/
}

type TRouteCallback = (route?: TClientRoute) => void;

export type TRegisterPageArgs<TControllerData extends TFetcherList = {}> = [
    path: string,
    options: Partial<TRouteOptions>,
    controller: TFrontController<TControllerData> | null,
    renderer: TFrontRenderer<TControllerData>
];

/*----------------------------------
- TYPES: COMPLETE ROUTES
----------------------------------*/

export type TClientRoute = TBaseRoute & {
    type: 'PAGE',
    method: 'GET',
    controller: TFrontController | null,
    renderer: TFrontRenderer
}

// https://stackoverflow.com/questions/44851268/typescript-how-to-extract-the-generic-parameter-from-a-type
type TypeWithGeneric<T> = TFetcher<T>
type extractGeneric<Type> = Type extends TypeWithGeneric<infer X> ? X : never

export type TFrontController<TControllerData extends TFetcherList = {}> = 
    (urlParams: TObjetDonnees, context: ClientContext) => TControllerData

export type TFrontRenderer<TControllerData extends TFetcherList = {}> = (
    data: {
        [Property in keyof TControllerData]: undefined | (extractGeneric<TControllerData[Property]> extends ((...args: any[]) => any) 
            ? ThenArg<ReturnType< extractGeneric<TControllerData[Property]> >>
            : extractGeneric<TControllerData[Property]>
        )
    },
    context: ClientContext
) => ComponentChild

// Simple link
export const Link = ({ to, ...props }: { 
    to: string,
    children?: ComponentChild,
    class?: string,
    className?: string
}) => {

    return (
        <a {...props} href={to} onClick={(e) => {
            history?.push(to);
            e.preventDefault();
            return false
        }}/>
    )

}

const debug = true;

/*----------------------------------
- ROUTER
----------------------------------*/
class Router extends BaseRouter {

    public disableResolver = false;

    public routes: (TClientRoute | TUnresolvedRoute)[] = [];

    public set(data: TObjetDonnees) {
        throw new Error(`router.set was not attached to the router component.`);
    }

    public async initialize( loaders: TRoutesLoaders, callback: TRouteCallback, context: ClientContext ) {
        debug && console.log(`Initializing client router ...`);

        const ssrRoutes = window["routes"] as TSsrUnresolvedRoute[];
        const ssrResponse = window["ssr"] as TSsrData | undefined;
        let foundPage: boolean = false;

        // Associe la liste des routes (obtenue via ssr) à leur loader
        for (let i = 0; i < ssrRoutes.length; i++) {

            const ssrRoute = ssrRoutes[i];

            if (loaders[ssrRoute.chunk] === undefined)
                throw new Error(`Loader not found for chunk id ${ssrRoute.chunk}`);

            let route: TUnresolvedRoute = {
                type: 'PAGE',
                regex: ssrRoute.regex ? new RegExp(ssrRoute.regex) : null,
                chunk: ssrRoute.chunk,
                load: loaders[ssrRoute.chunk],
                keys: ssrRoute.keys || [],
            }

            debug && console.log(`- ${route.regex} => ${route.chunk}`, route);

            if (ssrResponse !== undefined && route.chunk === ssrResponse?.page.id) {

                const loaded = ('load' in route) ? await this.load( route, context ) as TClientRoute : route;
                callback(loaded);
                this.routes[i] = loaded;
                foundPage = true;
                continue;
            }

            this.routes[i] = route;
        }

        if (!foundPage)
            callback(undefined);

    }

    public async resolve( request: ClientRequest, context: ClientContext ): Promise<PageResponse | undefined | null> {
        debug && console.log('Resolving request', request.path, Object.keys(request.data));

        for (let iRoute = 0; iRoute < this.routes.length; iRoute++) {

            let route = this.routes[iRoute];
            if (route.regex === null)
                continue;

            const match = route.regex.exec(request.path);
            //console.log('Trying', route.regex.source, match);
            if (!match)
                continue;

            // Non résolue = on charge le chunk
            if ('load' in route) {
                const loaded = await this.load(route, context);
                if (loaded === null) return null;
                route = this.routes[iRoute] = loaded;
            }

            // URL data
            for (let iKey = 0; iKey < route.keys.length; iKey++) {
                const nomParam = route.keys[iKey];
                if (typeof nomParam === 'string') // number = sans nom
                    request.data[nomParam] = match[iKey + 1]
            }

            // Create response
            new ClientResponse<PageResponse>(request, route);
            const page = await context.createPage(route).catch((e) => {

                return this.handleError(e, request, iRoute, context);

            });

            return page;
            
        };

        return undefined;

    }

    private async handleError(e: Error, request: ClientRequest, iRoute: number, context: ClientContext ) {

        const code = 'http' in e ? e.http : 500;
        console.log(`Loading error page ` + code);

        // ERROR PAGE

        let route = this.routes.find( r => r.chunk === 'pages/_messages_' + code);
        if (route === undefined) {
            console.error(`Error page for http error code ${code} not found.`, this.routes);
            context.handleError(e);
            return;
        }

        // Non résolue = on charge le chunk
        if ('load' in route) {
            const loaded = await this.load(route, context);
            if (loaded === null) return null;
            route = this.routes[iRoute] = loaded;
        }
            
        new ClientResponse<PageResponse>(request, route);
        return await context.createPage(route);
    }

    private async load<TRoute extends TUnresolvedRoute>( 
        route: TRoute, 
        context: ClientContext 
    ): Promise<TClientRoute | null> {
        debug && console.log(`Fetching route ${route.chunk} ...`, route);

        let fetched: TFetchedRoute;
        if (typeof route.load === 'function') {
            
            try {
                fetched = (await route.load()).default;
            } catch (e) {
                console.error(`Failed to fetch the route ${route.chunk}`, e);
                context.toast.error("Failed to load content. Please make sure you're connected to Internet.");
                return null;
            }

        } else {

            debug && console.log(`Route already fetched: ${route.chunk}`, route.load);
            fetched = route.load;

        }

        debug && console.log(`Route fetched: ${route.chunk}`, fetched);
        return {
            ...fetched,
            type: route.type,
            regex: route.regex,
            keys: route.keys
        }
    }

    protected registerPage( ...args: TRegisterPageArgs ): TFetchedRoute | void {

        const { path, options, controller, renderer } = this.getRegisterPageArgs(...args);

        console.log('Registering PAGE', path, options);

        const id = options["id"];

        // S'il s'agit d'une page, son id doit avoir été injecté via le plugin babel
        if (id === undefined)
            return console.error(`ID not found for the following page route:`, { path });

        return {
            method: 'GET',
            options: {
                ...defaultOptions,
                ...options
            },
            path,
            controller,
            renderer
        };
        
        
    }

}

export default new Router