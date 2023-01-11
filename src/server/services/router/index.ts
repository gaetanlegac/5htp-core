
// INSPIRATION: 
// https://adonisjs.com/docs/4.1/routing
// https://laravel.com/docs/8.x/routing
// https://github.com/adonisjs/http-server/blob/develop/src/ServerRouter/indexApi.ts
// https://github.com/expressjs/express/blob/06d11755c99fe4c1cddf8b889a687448b568472d/lib/response.js#L1016

/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import type express from 'express';
import { v4 as uuid } from 'uuid';
import type { GlobImportedWithMetas } from 'babel-plugin-glob-import';

// Core
import Application, { Service } from '@server/app';
import context from '@server/context';
import { Erreur, NotFound } from '@common/errors';
import BaseRouter, {
    TRoute, TErrorRoute, TRouteModule,
    TRouteOptions, defaultOptions
} from '@common/router';
import { buildRegex, getRegisterPageArgs } from '@common/router/register';
import { layoutsList } from '@common/router/layouts';
import { TFetcherList, TFetcher } from '@common/router/request/api';
import type { TFrontRenderer } from '@common/router/response/page';
import type { TSsrUnresolvedRoute, TRegisterPageArgs } from '@client/services/router';

// Specific
import RouterService from './service';
import ServerRequest from "./request";
import ServerResponse, { TRouterContext } from './response';
import Page from './response/page';
import HTTP, { Config as HttpServiceConfig } from './http';
import DocumentRenderer from './response/page/document';

/*----------------------------------
- TYPES
----------------------------------*/

export { default as RouterService } from './service';
export { default as RequestService } from './request/service';
export type { default as Request } from "./request";
export type { default as Response, TRouterContext } from "./response";
export type { TRoute } from '@common/router';

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

export type TRouterServicesList = {
    [serviceName: string]: RouterService<ServerRouter>
}

export type Config<
    TServiceList extends TRouterServicesList = TRouterServicesList,
    TAdditionnalSsrData extends {} = {}
> = {

    debug: boolean,

    http: HttpServiceConfig

    // Set it as a function, so when we instanciate the services, we can callthis.router to pass the router instance in roiuter services
    services: TServiceList,

    ssrData: (request: ServerRequest<ServerRouter>) => Promise<TAdditionnalSsrData>,

    // Protections against bots
    // TODO: move to Protection service
    /*security: {
        recaptcha: {
            prv: string,
            pub: string
        },
        iphub: string
    },*/
}

export type Hooks = {

}

/*----------------------------------
- CLASSE
----------------------------------*/
export default class ServerRouter<
    TConfig extends Config = Config,
    TApplication extends Application = Application
> extends Service<TConfig, Hooks, TApplication> implements BaseRouter {

    // Services
    public http: HTTP;
    public services: TConfig["services"];
    public render: DocumentRenderer;

    // Indexed
    public routes: TRoute[] = []; // API + pages front front
    public errors: { [code: number]: TErrorRoute } = {};
    public ssrRoutes: TSsrUnresolvedRoute[] = [];

    /*----------------------------------
    - SERVICE
    ----------------------------------*/

    public constructor(app: TApplication, config: TConfig) {

        super(app, config);

        this.http = new HTTP(config.http, this);
        this.render = new DocumentRenderer(this);
        this.services = config.services;

    }

    public async register() {

        // Since route registering requires all services to be ready,
        // We load routes only when all services are ready
        this.app.on('ready', async () => {

            // Use require to avoid circular references
            this.registerRoutes([
                ...require("metas:@/server/routes/**/*.ts"),
                ...require("metas:@/client/pages/**/*.tsx"),
                ...require("metas:@client/pages/**/*.tsx")
            ]);
        })
    }

    public async start() {
        this.startServices();
    }

    private async startServices() {
        console.log(LogPrefix, `Starting router services`);

        for (const serviceId in this.services) {
            const service = this.services[serviceId];
            service.attach(this);
            await service.register();
        }
    }

    private registerRoutes(defModules: GlobImportedWithMetas<TRouteModule>) {
        for (const routeModule of defModules) {

            const register = routeModule.exports.__register;
            if (!register)
                continue;

            console.log(LogPrefix, `Register file:`, routeModule.matches.join('/'));
            register(this.app);
        }

        this.afterRegister();
    }

    /*----------------------------------
    - REGISTER
    ----------------------------------*/

    public page(...args: TRegisterPageArgs) {

        const { path, options, controller, renderer } = getRegisterPageArgs(...args);

        const { regex, keys } = buildRegex(path);

        const route: TRoute = {
            method: 'GET',
            path,
            regex,
            keys,
            controller: (context: TRouterContext<this>) => new Page(controller, renderer, context),
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
        this.errors[code] = {
            code,
            controller: (context: TRouterContext<this>) => new Page(null, renderer, context),
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

        console.info("Pre-Loading request services");
        //await TrackingService.LoadCache();

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

            const chunkId = route.options["id"];

            console.info('-',
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

        console.info(`Registered error pages:`);
        for (const code in this.errors) {

            const route = this.errors[code];
            const chunkId = route.options["id"];

            console.info('-', code,
                ' :: ', JSON.stringify(route.options)
            );

            this.ssrRoutes.push({
                code: parseInt(code),
                chunk: chunkId,
            });
        }

        console.info(`Registered layouts:`);
        for (const layoutId in layoutsList) {

            const layout = layoutsList[layoutId];

            console.info('-', layoutId, layout);
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

    public async resolve(request: ServerRequest<this>): Promise<ServerResponse<this>> {

        console.info(request.ip, request.method, request.domain, request.path);

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

        throw new NotFound(`The requested endpoint was not found.`);
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

    private async handleError(e: Erreur, request: ServerRequest<ServerRouter>) {

        const code = 'http' in e ? e.http : 500;
        const route = this.errors[code];
        if (route === undefined)
            throw new Error(`No route for error code ${code}`);

        const response = new ServerResponse(request).status(code).setRoute(route);

        // Rapport / debug
        if (code === 500) {

            await this.app.runHook('error', e, request);

            // Pour déboguer les erreurs HTTP
        } else if (this.app.env.profile === "dev")
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