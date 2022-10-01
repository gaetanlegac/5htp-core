
// INSPIRATION: 
// https://adonisjs.com/docs/4.1/routing
// https://laravel.com/docs/8.x/routing
// https://github.com/adonisjs/http-server/blob/develop/src/Router/indexApi.ts
// https://github.com/expressjs/express/blob/06d11755c99fe4c1cddf8b889a687448b568472d/lib/response.js#L1016

/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import type express from 'express';
import { v4 as uuid } from 'uuid';

// Core: Router
import context from '@server/context';
import ServerRequest from "./request";
import ServerResponse from './response';
import AuthService from './request/services/auth';
import TrackingService from './request/services/tracking';

// Core: libs
import app, { $ } from '@server/app';
import { Introuvable } from '@common/errors';

// Core: types
import type { TSsrUnresolvedRoute, TRegisterPageArgs } from '@client/router';
import BaseRouter, { 
    TBaseRoute, TRoute, TErrorRoute,
    TRouteOptions, defaultOptions
} from '@common/router';
import { TFetcherArgs } from '@common/router/request';

/*----------------------------------
- SERVICE CONFIG
----------------------------------*/

export type RouterServiceConfig = {
    // Routes to systematically preload
    
}

declare global {
    namespace Core {
        namespace Config {
            interface Services {
                router: RouterServiceConfig
            }
        }
    }
}

/*----------------------------------
- TYPES: REGISTER
----------------------------------*/

export type { default as Request } from "./request";
export type { default as Response } from "./response";

export type TApiRegisterArgs = ([ 
    path: string, 
    controller: TServerController
] | [ 
    path: string, 
    options: Partial<TRouteOptions>, 
    controller: TServerController
])

/*----------------------------------
- TYPES: ROUTE
----------------------------------*/

export type TServerController = (request: With<ServerRequest, 'response'>, data: TObjetDonnees) => any;

export type HttpHeaders = {[cle: string]: string}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS'
export type TRouteHttpMethod = HttpMethod | '*';

export type TApiServerRoute = TBaseRoute & {
    controller: TServerController,
    type: 'API',
    method: TRouteHttpMethod
}

export type TApiResponseData = {
    data: any,
    triggers?: {[cle: string]: any}
}

/*----------------------------------
- CLASSE
----------------------------------*/
export class Router extends BaseRouter {

    public app = app;

    public routes: TRoute[] = []; // API + pages front front

    public ssrRoutes: TSsrUnresolvedRoute[] = [];

    /*----------------------------------
    - SERVICE
    ----------------------------------*/

    public constructor() {
        super();
        app.on('ready', () => this.afterRegister());
    }

    public async load() {

    }

    /*----------------------------------
    - INDEXING
    ----------------------------------*/

    public all = (...args: TApiRegisterArgs) => this.registerApi('*', ...args);
    public options = (...args: TApiRegisterArgs) => this.registerApi('OPTIONS', ...args);
    public get = (...args: TApiRegisterArgs) => this.registerApi('GET', ...args);
    public post = (...args: TApiRegisterArgs) => this.registerApi('POST', ...args);
    public put = (...args: TApiRegisterArgs) => this.registerApi('PUT', ...args);
    public delete = (...args: TApiRegisterArgs) => this.registerApi('DELETE', ...args)

    protected registerApi(method: TRouteHttpMethod, ...args: TApiRegisterArgs): TRoute {

        let path: string;
        let options: Partial<TRouteOptions> = {};
        let controller: TServerController;

        if (args.length === 2)
            ([path, controller] = args)
        else
            ([path, options, controller] = args)

        const { regex, keys } = this.buildRegex(path);

        const route: TRoute = {
            type: 'API',
            method: method,
            path: path,
            regex,
            keys: keys.map(k => k.name),
            options: {
                ...defaultOptions,
                ...options
            },
            controller
        }

        this.routes.push(route);

        return route;
    }

    protected registerPage( ...args: TRegisterPageArgs ) {

        const { path, options, controller, renderer } = this.getRegisterPageArgs(...args);

        const { regex, keys } = this.buildRegex(path);

        this.routes.push({
            type: 'PAGE',
            method: 'GET',
            path,
            regex,
            keys: keys.map(k => k.name),
            options: {
                ...defaultOptions,
                accept: 'html', // Les pages retournent forcémment du html
                ...options
            },
            controller,

            renderer
        });

        return this;

    }

    private async afterRegister() {

        console.info("Pre-Loading request services");
        await TrackingService.LoadCache();

        console.info("Loading routes ...");

        // Ordonne par ordre de priorité
        this.routes.sort((r1, r2) => {

            const prioDelta = r2.options.priority - r1.options.priority;
            if (prioDelta !== 0)
                return prioDelta;

            // HTML avant json
            if (r1.options.accept === 'html' && r2.options.accept !== 'html')
                return -1;

            // Unchanged
            return 0;
        })
        // - Génère les définitions de route pour le client
        console.info(`Registered routes:`);
        for (const route of this.routes) {

            console.info('-',
                route.type,
                route.method,
                route.path,
                ' :: ', JSON.stringify(route.options)
            );

            if ('renderer' in route)
                this.ssrRoutes.push({
                    type: route.type,
                    regex: route.regex.source,
                    keys: route.keys,
                    chunk: route.options["id"]
                });

        }

        console.info(`Registered error pages:`);
        for (const code in this.errors) {

            const route = this.errors[code];
            console.info('-', code);

            this.ssrRoutes.push({
                type: route.type,
                chunk: route.options["id"],
                code
            });
        }

        console.info(this.routes.length + " routes where registered.");
    }

    /*----------------------------------
    - RESOLUTION
    ----------------------------------*/
    public async middleware(req: express.Request, res: express.Response) {

        // Don't cache HTML, because in case of update, assets file name will change (hash.ext)
        // https://github.com/helmetjs/nocache/blob/main/index.ts
        res.setHeader("Surrogate-Control", "no-store");
        res.setHeader(
            "Cache-Control",
            "no-store, no-cache, must-revalidate, proxy-revalidate"
        );
        res.setHeader("Pragma", "no-cache");

        // Create request
        let requestId = uuid();
        const request = new ServerRequest(
            requestId,
            req.method as HttpMethod,
            req.path, // url sans params
            // Exclusion de req.files, car le middleware multipart les a normalisé dans req.body
            { ...req.query, ...req.body },
            req.headers,

            res,
            this
        );

        const now = new Date;

        // Identify Guest & create log entry
        const username = request.user?.name;
        let clientId: string = request.cookies.clientId;
        const newClient = !(typeof clientId === 'string' && clientId.length <= 39)
        if (newClient) {
            clientId = uuid();
            res.cookie('clientId', clientId, { expires: new Date(253402300000000) }); // Never expires
        }

        const keepLogs = request.ip !== '86.76.176.80';
        if (!keepLogs)  
            requestId = 'admin';

        // Create request context & resolve it
        context.run({ channelType: 'request', channelId: requestId }, async () => {

            let response: ServerResponse;
            try {
                
                request.user = await AuthService.decode(req, true);
                // If use auth failed, we remove the jwt token so we avoid to trigger the same auth error in the next request
                if (request.user === null)
                    res.clearCookie('authorization');

                if (request.path === '/api' && typeof request.data.fetchers === "object") {

                    const responseData: TObjetDonnees = {};
                    for (const id in request.data.fetchers) {

                        const [method, path, data] = request.data.fetchers[id] as TFetcherArgs;

                        const response = await this.resolve(
                            request.children(method, path, data)
                        );

                        responseData[id] = response.data;

                        // TODO: merge response.headers ?

                    }

                    // Status
                    res.status(200);
                    // Data
                    res.json(responseData);

                    return;

                } else {
                    response = await this.resolve(request);
                }
            } catch (e) {
                response = await this.handleError(e, request);
            }

            // Status
            res.status(response.statusCode);
            // Headers
            res.header(response.headers);
            // Data
            res.send(response.data);

            if (newClient)
                $.console.client({
                    id: clientId,
                    ip: request.ip,
                    user: username,
                    device: request.deviceString(),
                    meet: now,
                    activity: now,
                });

            $.console.request({

                id: requestId,
                date: now,

                method: request.method,
                url: request.path,
                data: request.data,

                ip: request.ip,
                user: request.user?.name,
                clientId,

                statusCode: response.statusCode,
                time: Date.now() - now.valueOf()
            });
        });

    }

    private async handleError(e: Error, request: ServerRequest) {

        const code = 'http' in e ? e.http : 500;
        const route = this.errors[code];
        if (route === undefined)
            throw new Error(`No route for error code ${code}`);

        const response = new ServerResponse(request).status(code).setRoute(route);

        // Rapport / debug
        if (code === 500) {

            for (const callback of app.hooks.error)
                callback(e);

            $.console.bugReport.server(e, request);

        // Pour déboguer les erreurs HTTP
        } else if (app.env.profile === "dev")
            console.warn(e);

        if (request.accepts("html"))
            await response.runController( route, { message: e.message });
        else if (request.accepts("json"))
            await response.json(e.message);
        else
            await response.text(e.message);

        return response;

    }

    public async resolve( request: ServerRequest ): Promise<ServerResponse> {

        console.info(request.ip, request.method, request.domain, request.path);

        const response = new ServerResponse(request);

        request.tracking.event('pageview');

        for (const route of this.routes) {

            // Method
            if (request.method !== route.method && route.method !== '*')
                continue;

            // Response format
            if (!request.accepts(route.options.accept))
                continue;

            // URL
            const match = route.regex.exec(request.path);
            if (!match)
                continue;

            // Testing = must be admin
            if (route.options.TESTING === true && !(request.user && request.user.name === "Decentraliseur"))
                break;

            // Auth
            if (route.options.auth !== undefined)
                request.auth.check(route.options.auth);

            //console.log('Resolved route:', route.regex.source);
            
            for (let iKey = 0; iKey < route.keys.length; iKey++) {
                const nomParam = route.keys[iKey];
                if (typeof nomParam === 'string') // number = sans nom
                    request.data[nomParam] = match[iKey + 1]
            }

            // Create response
            await response.runController(route);
            if (response.wasProvided) 
                // On continue l'itération des routes, sauf si des données ont été fournie dans la réponse (.json(), .html(), ...)
                return response;
        }

        throw new Introuvable(`The requested endpoint was not found.`);
    }

}

/*----------------------------------
- REGISTER SERVICE
----------------------------------*/
app.register('router', Router);
declare global {
    namespace Core {
        interface Services {
            router: Router;
        }
    }
}

// Exceptionnally, we export the @router module
// Bacause import router from '@router'; need to be available both on client and sevrer side.
export default app.services.router;