
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
import { v4 as uuid } from 'uuid';
import type { GlobImportedWithMetas } from 'babel-plugin-glob-import';

// Core
import type { Application } from '@server/app';
import Service, { AnyService } from '@server/app/service';
import type { TRegisteredServicesIndex } from '@server/app/service/container';
import context from '@server/context';
import type DisksManager from '@server/services/disks';
import { CoreError, NotFound } from '@common/errors';
import BaseRouter, {
    TRoute, TErrorRoute, TRouteModule,
    TRouteOptions, defaultOptions
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

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS'
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

    http: HttpServiceConfig

    context: (
        request: ServerRequest<ServerRouter>, 
        app: Application
    ) => TAdditionnalSsrData,
}

export type Services = {
    disks?: DisksManager
} & {
    [routerServiceId: string]: RouterService
}

// Set it as a function, so when we instanciate the services, we can callthis.router to pass the router instance in roiuter services
type TRouterServicesList = {
    [serviceName: string]: RouterService<ServerRouter>
}

export type Hooks = {

}

/*----------------------------------
- CLASSE
----------------------------------*/
export default class ServerRouter<
    TConfig extends Config = Config,
    TApplication extends Application = Application
> extends Service<TConfig, Hooks, TApplication, Services> implements BaseRouter {

    // Services
    public http: HTTP;
    public render: DocumentRenderer<this>;
    protected routerServices: {[serviceId: string]: RouterService} = {}

    // Indexed
    public routes: TRoute[] = []; // API + pages front front
    public errors: { [code: number]: TErrorRoute } = {};
    public ssrRoutes: TSsrUnresolvedRoute[] = [];

    /*----------------------------------
    - SERVICE
    ----------------------------------*/

    public constructor( 
        parent: AnyService, 
        config: TConfig,
        services: Services,
        app: TApplication, 
    ) {

        super(parent, config, services, app);

        this.http = new HTTP(config.http, this);
        this.render = new DocumentRenderer(this);

    }

    /*----------------------------------
    - LIFECYCLE
    ----------------------------------*/

    protected async start() { 

        // Detect router services
        for (const serviceName in this.services) {

            const routerService = this.services[serviceName];
            if (routerService instanceof RouterService)
                this.routerServices[ serviceName ] = routerService;
        }

        console.log("this.routerServices", Object.keys( this.routerServices ));
    }

    public async ready() {

         // Use require to avoid circular references
         this.registerRoutes([
            ...require("metas:@/server/routes/**/*.ts"),
            ...require("metas:@/client/pages/**/*.tsx"),
            ...require("metas:@client/pages/**/*.tsx")
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
                register(this.app.services);
            } catch (error) {
                console.error("Failed to register route file:", routeModule);
                console.error('Register function:', register.toString());
                throw error;
            }
        }

        this.afterRegister();
    }

    // TODO: Generate TS type of the routes list
    public url<TRoutePath extends keyof Routes = keyof Routes>( 
        path: TRoutePath, 
        params: Routes[TRoutePath]["params"]
    ) {
        return this.http.publicUrl + path;
    }

    /*----------------------------------
    - REGISTER
    ----------------------------------*/

    public page(...args: TRegisterPageArgs) {

        const { path, options, controller, renderer, layout } = getRegisterPageArgs(...args);

        const { regex, keys } = buildRegex(path);

        const route: TRoute = {
            method: 'GET',
            path,
            regex,
            keys,
            controller: (context: TRouterContext<this>) => new Page(controller, renderer, context, layout),
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

        this.errors[code] = {
            code,
            controller: (context: TRouterContext<this>) => new Page(null, renderer, context, layout),
            options
        };
    }

    public all = (...args: TApiRegisterArgs<this>) => this.registerApi('*', ...args);
    public options = (...args: TApiRegisterArgs<this>) => this.registerApi('OPTIONS', ...args);
    public get = (...args: TApiRegisterArgs<this>) => this.registerApi('GET', ...args);
    public post = (...args: TApiRegisterArgs<this>) => this.registerApi('POST', ...args);
    public put = (...args: TApiRegisterArgs<this>) => this.registerApi('PUT', ...args);
    public delete = (...args: TApiRegisterArgs<this>) => this.registerApi('DELETE', ...args)

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

        // Generate typescript typings
        if (this.app.env.profile === 'dev')
            this.genTypings();

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

            if (route.options["id"])
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

    private genTypings() {
        /*fs.outputFileSync( path.join(this.app.path.typings, 'routes.d.ts'), `
declare type Routes = {
        ${this.routes.map( route => `
            '${route.path}': {
                params: {
                    ${route.keys.map( k => "'" + k + "': string").join(',\n')}
                }
            }
        `).join(',')}
    }
}
        `);*/
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

        // Hook
        await this.runHook('request', request);

        // TODO: move to tracking
        /*const now = new Date;

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
            requestId = 'admin';*/

        // Create request context so we can access request context across all the request-triggered libs
        context.run({ channelType: 'request', channelId: requestId }, async () => {

            let response: ServerResponse<this>;
            try {

                // Bulk API Requests
                if (request.path === '/api' && typeof request.data.fetchers === "object") {

                    return await this.resolveApiBatch(request.data.fetchers, request);

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

            // TODO: move to tracking
            /*if (newClient)
                console.client({
                    id: clientId,
                    ip: request.ip,
                    user: username,
                    device: request.deviceString(),
                    meet: now,
                    activity: now,
                });

            console.request({

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
            });*/
        });
    }

    public createContextServices( request: ServerRequest<this> ) {

        const contextServices: Partial<TRouterContextServices<this>> = {}
        for (const serviceName in this.routerServices) {

            const routerService = this.routerServices[serviceName];
            const requestService = routerService.requestService( request );
            if (requestService !== null)
                contextServices[ serviceName ] = requestService;

        }

        return contextServices;
    }

    public async resolve(request: ServerRequest<this>): Promise<ServerResponse<this>> {

        console.info(LogPrefix, request.ip, request.method, request.domain, request.path);

        if (this.status === 'starting') {
            console.log(LogPrefix, `Waiting for servert to be resdy before resolving request`);
            await this.started;
        }

        const response = new ServerResponse<this>(request);

        await this.runHook('resolve', request);

        for (const route of this.routes) {

            // Match Method
            if (request.method !== route.method && route.method !== '*')
                continue;

            // Match Response format
            if (!request.accepts(route.options.accept))
                continue;

            // Match Path
            const match = route.regex.exec(request.path);
            if (!match)
                continue;

            // Extract URL params
            for (let iKey = 0; iKey < route.keys.length; iKey++) {
                const nomParam = route.keys[iKey];
                if (typeof nomParam === 'string') // number = sans nom
                    request.data[nomParam] = match[iKey + 1]
            }

            // Run on resolution hooks. Ex: authentication check
            await this.runHook('resolved', route);

            // Create response
            await response.runController(route);
            if (response.wasProvided)
                // On continue l'itération des routes, sauf si des données ont été fournie dans la réponse (.json(), .html(), ...)
                return response;
        }

        throw new NotFound();
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
        const route = this.errors[code];
        if (route === undefined)
            throw new Error(`No route for error code ${code}`);

        const response = new ServerResponse(request).status(code).setRoute(route);

        // Rapport / debug
        if (code === 500) {

            // Print the error here so the stacktrace appears in the bug report logs
            console.log(LogPrefix, "Error catched from the router:", e);

            // Report error
            await this.app.runHook('error', e, request);

            // Don't exose technical errors to users
            if (this.app.env.profile === 'prod')
                e.message = "We encountered an internal error, and our team has just been notified. Sorry for the inconvenience.";

        // Pour déboguer les erreurs HTTP
        } else if (code !== 404 && this.app.env.profile === "dev")
            console.warn(e);

        if (request.accepts("html"))
            await response.runController(route, { message: e.message });
        else if (request.accepts("json"))
            await response.json(e.message);
        else
            await response.text(e.message);

        return response;

    }

}