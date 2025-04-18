
// INSPIRATION: 
// https://adonisjs.com/docs/4.1/routing
// https://laravel.com/docs/8.x/routing
// https://github.com/adonisjs/http-server/blob/develop/src/ServerRouter/indexApi.ts
// https://github.com/expressjs/express/blob/06d11755c99fe4c1cddf8b889a687448b568472d/lib/response.js#L1016

/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Node
// Npm
import type express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import zod from 'zod';
export { default as schema } from 'zod';
import type { GlobImportedWithMetas } from 'babel-plugin-glob-import';

// Core
import type { Application } from '@server/app';
import Service, { AnyService, TServiceArgs } from '@server/app/service';
import type { TRegisteredServicesIndex } from '@server/app/service/container';
import context from '@server/context';
import type DisksManager from '@server/services/disks';
import { CoreError, NotFound, toJson as errorToJson } from '@common/errors';
import BaseRouter, {
    TRoute, TErrorRoute, TRouteModule,
    TRouteOptions, defaultOptions,
    matchRoute, buildUrl, TDomainsList
} from '@common/router';
import { buildRegex, getRegisterPageArgs } from '@common/router/register';
import { layoutsList, getLayout } from '@common/router/layouts';
import { TFetcherList } from '@common/router/request/api';
import type { TFrontRenderer } from '@common/router/response/page';
import type { TSsrUnresolvedRoute, TRegisterPageArgs } from '@client/services/router';

// Specific
import RouterService from './service';
import ServerRequest from "./request";
import ServerResponse, { TRouterContext, TRouterContextServices } from './response';
import Page from './response/page';
import HTTP, { Config as HttpServiceConfig } from './http';
import DocumentRenderer from './response/page/document';

/*----------------------------------
- TYPES
----------------------------------*/

export { default as RouterService } from './service';
export { default as RequestService } from './request/service';
export type { default as Request, UploadedFile } from "./request";
export type { default as Response, TRouterContext } from "./response";
export type { TRoute, TAnyRoute } from '@common/router';

export type TApiRegisterArgs<TRouter extends ServerRouter> = ([
    path: string,
    controller: TServerController<TRouter>
] | [
    path: string,
    options: Partial<TRouteOptions>,
    controller: TServerController<TRouter>
])

export type TServerController<TRouter extends ServerRouter> = (context: TRouterContext<TRouter>) => any;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS'
export type TRouteHttpMethod = HttpMethod | '*';

export type TApiResponseData = {
    data: any,
    triggers?: { [cle: string]: any }
}

export type HttpHeaders = { [cle: string]: string }

/*----------------------------------
- SERVICE CONFIG
----------------------------------*/

const LogPrefix = '[router]';

export type Config<
    TServiceList extends TRouterServicesList = TRouterServicesList,
    TAdditionnalSsrData extends {} = {}
> = {

    debug: boolean,

    disk?: string, // Disk driver ID

    domains: TDomainsList,

    http: HttpServiceConfig,

    context: (
        request: ServerRequest<ServerRouter>, 
        app: Application
    ) => TAdditionnalSsrData,

    plugins: {
        [routerServiceId: string]: RouterService
    }
}

// Set it as a function, so when we instanciate the services, we can callthis.router to pass the router instance in roiuter services
type TRouterServicesList = {
    [serviceName: string]: RouterService<ServerRouter>
}

export type Hooks = {

}

export type TControllerDefinition = {
    path?: string,
    schema?: zod.ZodSchema,
    controller: TServerController<ServerRouter>,
}

/*----------------------------------
- CLASSE
----------------------------------*/
export default class ServerRouter 
    extends Service<Config, Hooks, Application> implements BaseRouter {

    public disks = this.use<DisksManager>('Core/Disks', { optional: true });
    
    // Services
    public http: HTTP;
    public render: DocumentRenderer<this>;

    // Indexed
    public routes: TRoute[] = []; // API + pages front front
    public errors: { [code: number]: TErrorRoute } = {};
    public controllers: {[path: string]: TRoute} = {};
    public ssrRoutes: TSsrUnresolvedRoute[] = [];

    // Cache (ex: for static pages)
    public cache: {[pageId: string]: string} = {}

    /*----------------------------------
    - SERVICE
    ----------------------------------*/

    public constructor( ...args: TServiceArgs<ServerRouter>) {

        super(...args);

        this.http = new HTTP(this.config.http, this);
        this.render = new DocumentRenderer(this);
    }

    /*----------------------------------
    - LIFECYCLE
    ----------------------------------*/

    public async ready() {

        // Detect router services
        for (const serviceName in this.config.plugins) {
            this.app.register( this.config.plugins[serviceName] )
        }

         // Use require to avoid circular references
         this.registerRoutes([
            ...require("metas:@/server/routes/**/*.ts"),
            ...require("metas:@/client/pages/**/([a-z0-9]*).tsx"),
            ...require("metas:@/client/pages/**/([a-z0-9]*).tsx")
        ]);

        // Start HTTP server
        await this.http.start();

    }

    public async shutdown() {

    }

    /*----------------------------------
    - ACTIONS
    ----------------------------------*/

    private registerRoutes(defModules: GlobImportedWithMetas<TRouteModule>) {
        for (const routeModule of defModules) {

            const register = routeModule.exports.__register;
            if (!register)
                continue;

            this.config.debug && console.log(LogPrefix, `Register file:`, routeModule.matches.join('/'));
            try {
                register(this.app);
            } catch (error) {
                console.error("Failed to register route file:", routeModule);
                console.error('Register function:', register.toString());
                throw error;
            }
        }

        this.afterRegister();
    }

    public url = (path: string, params: {} = {}, absolute: boolean = true) => 
        buildUrl(path, params, this.config.domains, absolute);

    /*----------------------------------
    - REGISTER
    ----------------------------------*/

    public page(...args: TRegisterPageArgs) {

        const { path, options, renderer, layout } = getRegisterPageArgs(...args);

        const { regex, keys } = buildRegex(path);

        const route: TRoute = {
            method: 'GET',
            path,
            regex,
            keys,
            controller: (context: TRouterContext<this>) => new Page(route, renderer, context, layout),
            options: {
                ...defaultOptions,
                accept: 'html', // Les pages retournent forcémment du html
                ...options
            },
        }

        this.routes.push(route);

        return this;

    }

    public error(
        code: number,
        options: TRoute["options"],
        renderer: TFrontRenderer<{}, { message: string }>
    ) {

        // Automatic layout form the nearest _layout folder
        const layout = getLayout('Error ' + code, options);

        const route = {
            code,
            controller: (context: TRouterContext<this>) => new Page(route, renderer, context, layout),
            options
        };

        this.errors[code] = route;
    }

    public all = (...args: TApiRegisterArgs<this>) => this.registerApi('*', ...args);
    public options = (...args: TApiRegisterArgs<this>) => this.registerApi('OPTIONS', ...args);
    public get = (...args: TApiRegisterArgs<this>) => this.registerApi('GET', ...args);
    public post = (...args: TApiRegisterArgs<this>) => this.registerApi('POST', ...args);
    public put = (...args: TApiRegisterArgs<this>) => this.registerApi('PUT', ...args);
    public patch = (...args: TApiRegisterArgs<this>) => this.registerApi('PATCH', ...args);
    public delete = (...args: TApiRegisterArgs<this>) => this.registerApi('DELETE', ...args);

    public express( 
        middleware: (
            req: Request,
            res: Response,
            next: NextFunction,
            requestContext: TRouterContext
        ) => void
    ) {
        return (context: TRouterContext) => new Promise((resolve) => {
            
            context.request.res.on('finish', function() {
                //console.log('the response has been sent', request.res.statusCode);
                resolve(true);
            });
    
            middleware(
                context.request.req, 
                context.request.res, 
                () => { resolve(true); }, 
                context
            )
        })
    }

    protected registerApi(method: TRouteHttpMethod, ...args: TApiRegisterArgs<this>): this {

        let path: string;
        let options: Partial<TRouteOptions> = {};
        let controller: TServerController<this>;

        if (args.length === 2)
            ([path, controller] = args)
        else
            ([path, options, controller] = args)

        const { regex, keys } = buildRegex(path);

        const route: TRoute = {

            method: method,
            path: path,
            regex,
            keys: keys,
            options: {
                ...defaultOptions,
                ...options
            },
            controller
        }

        this.routes.push(route);

        return this;
    }

    private async afterRegister() {

        // Ordonne par ordre de priorité
        this.config.debug && console.info("Loading routes ...");
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
        this.config.debug && console.info(`Registered routes:`);
        for (const route of this.routes) {

            const chunkId = route.options["id"];

            this.config.debug && console.info('-',
                route.method,
                route.path,
                ' :: ', JSON.stringify(route.options)
            );

            if (chunkId)
                this.ssrRoutes.push({
                    regex: route.regex.source,
                    keys: route.keys,
                    chunk: chunkId
                });

        }

        this.config.debug && console.info(`Registered error pages:`);
        for (const code in this.errors) {

            const route = this.errors[code];
            const chunkId = route.options["id"];

            this.config.debug && console.info('-', code,
                ' :: ', JSON.stringify(route.options)
            );

            this.ssrRoutes.push({
                code: parseInt(code),
                chunk: chunkId,
            });
        }

        this.config.debug && console.info(`Registered layouts:`);
        for (const layoutId in layoutsList) {

            const layout = layoutsList[layoutId];

            this.config.debug && console.info('-', layoutId, layout);
        }

        this.config.debug && console.info(this.routes.length + " routes where registered.");
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

        // Create request context so we can access request context across all the request-triggered libs
        context.run({ channelType: 'request', channelId: requestId }, async () => {

            let response: ServerResponse<this>;
            try {

                // Hook
                await this.runHook('request', request);

                // Bulk API Requests
                if (request.path === '/api' && typeof request.data.fetchers === "object") {

                    return await this.resolveApiBatch(request.data.fetchers, request);

                } else {
                    response = await this.resolve(request);
                }
            } catch (e) {
                response = await this.handleError(e, request);
            }

            if (!res.headersSent) {
                // Status
                res.status(response.statusCode);
                // Headers
                res.header(response.headers);
                // Data
                res.send(response.data);
            } else if (response.data !== 'true') {
                throw new Error("Can't return data from the controller since response has already been sent via express.");
            }

        });
    }

    public createContextServices( request: ServerRequest<this> ) {

        const contextServices: Partial<TRouterContextServices<this>> = {}
        for (const serviceName in this.config.plugins) {

            const routerService = this.config.plugins[serviceName];
            if (!routerService)
                throw new Error(`Could not access router service ${serviceName}. Maybe the referenced service is not started yet? Try to reduce its priority.`);

            if (!routerService.requestService)
                throw new Error(`Router service ${serviceName} is not implementing the requestService method from the RouterService interface.`);

            const requestService = routerService.requestService( request );
            if (requestService !== null)
                contextServices[ serviceName ] = requestService;

        }

        return contextServices;
    }

    public async resolve(request: ServerRequest<this>): Promise<ServerResponse<this>> {

        const logId = LogPrefix + ' ' + (request.isVirtual ? ' ---- ' : '') + request.ip + ' ' + request.method + ' ' + request.domain + ' ' + request.path;
        console.info(logId);
        const timeStart = Date.now();

        if (this.status === 'starting') {
            console.log(LogPrefix, `Waiting for servert to be resdy before resolving request`);
            await this.started;
        }

        try {

            const response = new ServerResponse<this>(request);

            await this.runHook('resolve', request);

            // Controller route
            let route = this.controllers[request.path];
            if (route !== undefined) {

                // Run on resolution hooks. Ex: authentication check
                await this.runHook('resolved', route);

                // Create response
                await this.resolvedRoute(route, response, logId, timeStart);
                if (response.wasProvided)
                    return response;
            }

            // Classic routes
            for (route of this.routes) {

                // Match Method
                if (request.method !== route.method && route.method !== '*')
                    continue;

                // Match Response format
                if (!request.accepts(route.options.accept))
                    continue;

                const isMatching = matchRoute(route, request);
                if (!isMatching)
                    continue;

                await this.resolvedRoute(route, response, logId, timeStart);
                if (response.wasProvided)
                    return response;
            }

            throw new NotFound();

        } catch (error) {

            if (this.app.env.profile === 'dev') {
                console.log('API batch error:', request.method, request.path, error);
                const errOrigin = request.method + ' ' + request.path;
                if (error.details === undefined)
                    error.details = { origin: errOrigin }
                else
                    error.details.origin = errOrigin;
            }

            this.printTakenTime(logId, timeStart);
            throw error;
        }
    }

    private async resolvedRoute( 
        route: TRoute, 
        response: ServerResponse<this>,
        logId: string,
        timeStart: number
    ) {

        // Run on resolution hooks. Ex: authentication check
        await this.runHook('resolved', route);

        // Create response
        await response.runController(route);
        if (!response.wasProvided)
            return;

        const timeEndResolving = Date.now();
        this.printTakenTime(logId, timeStart, timeEndResolving);
    }

    private printTakenTime = (logId: string, timeStart: number, timeEndResolving?: number) => {

        if (this.app.env.name === 'server') return;

        console.log(logId + ' ' + Math.round(Date.now() - timeStart) + 'ms' + 
            (timeEndResolving === undefined ? '' : ' | Routing: ' + Math.round(timeEndResolving - timeStart))
        );
    }

    private async resolveApiBatch( fetchers: TFetcherList, request: ServerRequest<this> ) {

        // TODO: use api.fetchSync instead

        const responseData: TObjetDonnees = {};
        for (const id in fetchers) {

            const { method, path, data } = fetchers[id];

            const response = await this.resolve(
                request.children(method, path, data)
            );

            responseData[id] = response.data;

            // TODO: merge response.headers ?
        }

        // Status
        request.res.status(200);
        // Data
        request.res.json(responseData);
    }

    private async handleError( e: CoreError, request: ServerRequest<ServerRouter> ) {

        const code = 'http' in e ? e.http : 500;

        const response = new ServerResponse(request).status(code)

        // Rapport / debug
        if (code === 500) {

            // Print the error here so the stacktrace appears in the bug report logs
            console.log(LogPrefix, "Error catched from the router:", e);

            // Report error
            await this.app.runHook('error', e, request);

            // Don't exose technical errors to users
            if (this.app.env.profile === 'prod')
                e.message = "We encountered an internal error, and our team has just been notified. Sorry for the inconvenience.";

        } else {

            // For debugging HTTP errors
            /*if (this.app.env.profile === "dev")
                console.warn(e);*/

            await this.app.runHook('error.' + code, e, request);
        }

        // Return error based on the request format
        if (request.accepts("html")) {

            const route = this.errors[code];
            if (route === undefined)
                throw new Error(`No route for error code ${code}`);

            const jsonError = errorToJson(e);
            await response.setRoute(route).runController(route, { 
                error: jsonError
            });

        } else if (request.accepts("json")) {
            const jsonError = errorToJson(e);
            await response.json(jsonError);
        } else
            await response.text(e.message);

        return response;

    }

}