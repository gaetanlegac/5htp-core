/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

// Core: libs
import ClientRequest from './request';
import ClientResponse from './response';

// Core: types
import BaseRouter, { defaultOptions, } from '@common/router'
import { PageResponse } from '@common/router/response';
import type { TSsrData } from '@server/services/router/response';
import type { ClientContext } from '@client/context';

// Type xports
export type { default as ClientResponse } from "./response";
export { Link } from './Link';
import type { 
    TClientRoute,
    TUnresolvedRoute,
    TSsrUnresolvedRoute,
    TRoutesLoaders,
    TRouteCallback,
    TFetchedRoute,
    TRegisterPageArgs
} from './route';

// Temporary
// TODO: Import these types directly from router/routes
export type { 
    TClientRoute,
    TUnresolvedRoute,
    TSsrUnresolvedRoute,
    TRoutesLoaders,
    TRouteCallback,
    TFetchedRoute,
    TRegisterPageArgs
} from './route';

/*----------------------------------
- CONFIG
----------------------------------*/

const debug = true;
const LogPrefix = '[router]'

/*----------------------------------
- TYPES
----------------------------------*/

export type THookCallback = (request: ClientRequest) => void;

type THookName = 'locationChange'

/*----------------------------------
- ROUTER
----------------------------------*/
class Router extends BaseRouter {

    /*----------------------------------
    - HOOKS
    ----------------------------------*/
    private hooks: {
        [hookname in THookName]?: (THookCallback | null)[]
    } = {}
    
    public on( hookName: THookName, callback: THookCallback ) {

        debug && console.info(LogPrefix, `Register hook ${hookName}`);

        let cbIndex: number;
        let callbacks = this.hooks[ hookName ];
        if (!callbacks) {
            cbIndex = 0;
            callbacks = this.hooks[ hookName ] = [callback]
        } else {
            cbIndex = callbacks.length;
            callbacks.push(callback);
        }

        // Listener remover
        return () => {
            debug && console.info(LogPrefix, `De-register hook ${hookName} (index ${cbIndex})`);
            delete (callbacks as THookCallback[])[ cbIndex ];
        }

    }
    private runHook( hookName: THookName, request: ClientRequest ) {
        const callbacks = this.hooks[hookName];
        if (callbacks)
            for (const callback of callbacks)
                // callback can be null since we use delete to unregister
                callback && callback(request);
    }

    /*----------------------------------
    - ROUTES MANAGEMENT
    ----------------------------------*/

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

        this.runHook('locationChange', request);

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