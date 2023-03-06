/* INSPIRATION:
    https://laravel.com/docs/8.x/responses
    https://docs.adonisjs.com/guides/response
*/

/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import fs from 'fs-extra';
import express from 'express';

// Core
import Application from '@server/app';
import type ServerRouter from '@server/services/router';
import ServerRequest from '@server/services/router/request';
import { TRoute } from '@common/router';
import { NotFound, Forbidden } from '@common/errors';
import BaseResponse, { TResponseData } from '@common/router/response';
import Page from './page';

// To move into a new npm module: json-mask
import jsonMask from './mask';

/*----------------------------------
- TYPES
----------------------------------*/

const debug = true;

export type TBasicSSrData = {
    request: { data: TObjetDonnees, id: string },
    page: { chunkId: string, data?: TObjetDonnees },
    //user: User | null
}

export type TRouterContext<TRouter extends ServerRouter = ServerRouter> = (
    // Request context
    {
        app: Application,
        context: TRouterContext<TRouter>, // = this
        request: ServerRequest<TRouter>,
        api: ServerRequest<TRouter>["api"],
        response: ServerResponse<TRouter>,
        route: TRoute,
        page?: Page,
        user: User
    }
    &
    TRouterContextServices<TRouter>
)

type TRouterContextWithPage = With<TRouterContext, 'page'>

export type TRouterContextServices<TRouter extends ServerRouter> = (
    // Custom context via servuces
    // For each roiuter service, return the request service (returned by roiuterService.requestService() )
    {
        [serviceName in keyof TRouter["services"]]: ReturnType< TRouter["services"][serviceName]["requestService"] >
    }
)


/*----------------------------------
- CLASSE
----------------------------------*/
export default class ServerResponse<
    TRouter extends ServerRouter,
    TRequestContext = TRouterContext<ServerRouter>,
    TData extends TResponseData = TResponseData
> extends BaseResponse<TData, ServerRequest<TRouter>> {

    // Services
    public app: Application;
    public router: ServerRouter;

    // Response metadata
    public statusCode: number = 200;
    public headers: {[cle: string]: string} = {}
    public cookie: express.Response["cookie"];

    // If data was provided by at lead one controller
    public wasProvided = false;

    public constructor( request: ServerRequest<TRouter> ) {

        super(request);

        this.cookie = this.request.res.cookie.bind(this.request.res);

        this.router = request.router;
        this.app = this.router.app;
    }

    public async runController( route: TRoute, additionnalData: {} = {} ) {

        this.route = route;

        // Create response context for controllers
        const context = await this.createContext(route);

        // Run controller
        const response = await this.route.controller( context );

        // Handle response type
        if (response === undefined)
            return;

        // No need to process the response
        if (response instanceof ServerResponse)
            return;
        // Render react page to html
        else if (response instanceof Page)
            await this.render(response, context, additionnalData);
        // Return HTML
        else if (typeof response === 'string' && this.route.options.accept === 'html')
            await this.html(response);
        // Return JSON
        else
            await this.json(response);
    }

    /*----------------------------------
    - INTERNAL
    ----------------------------------*/

    // Start controller services
    private async createContext( route: TRoute ): Promise<TRequestContext> {


        const contextServices: Partial<TRouterContextServices<TRouter>> = {}
        for (const serviceName in this.router.services) {

            const routerService = this.router.services[serviceName];
            const requestService = routerService.requestService( this.request );
            if (requestService !== null)
                contextServices[ serviceName ] = requestService;

        }

        const customSsrData = this.router.config.context(this.request);

        const context: TRequestContext = {
            // Router context
            app: this.app,
            context: undefined as TRequestContext,
            request: this.request,
            response: this,
            route: route,
            api: this.request.api,
            // Router services
            ...(contextServices as TRouterContextServices<TRouter>),
            ...customSsrData
        }

        context.context = context;

        return context;
    }

    public forSsr( page: Page<TRouter> ): TBasicSSrData {

        const customSsrData = this.router.config.context(this.request);

        return {
            request: {
                id: this.request.id,
                data: this.request.data,
            },
            page: {
                chunkId: page.chunkId,
                data: page.data
            },
            ...customSsrData
        }
    }

    public status(code: number) {
        this.statusCode = code;
        return this;
    }

    public setHeaders( headers: {[cle: string]: string} ) {
        this.headers = { ...this.headers, ...headers };
        return this;
    }
    
    /*----------------------------------
    - DATA RESPONSE
    ----------------------------------*/

    public async render( page: Page, context: TRouterContext, additionnalData: {} ) {

        // Set page in context for the client side
        context.page = page;
        
        // Prepare page & fetch data
        page.data = await page.fetchData();
        if (additionnalData !== undefined) // Example: error message for error pages
            page.data = { ...page.data, ...additionnalData }

        // Render page
        await this.router.runHook('render', page);
        const document = await page.render();
        this.html(document);

        // Never put html in the cache
        // Because assets urls need to be updated when their hash has been changed by a release
        this.request.res.setHeader("Expires", "0");

    }

    public async json(data?: any, mask?: string) {

        // RAPPEL: On jsonMask aussi les requetes internes, car leurs données seront imprimées au SSR pour le contexte client
        // filtreApi vérifie systèmatiquement si la donnée a été filtrée
        // NOTE: On évite le filtrage sans masque spécifié (performances + risques erreurs)
        if (mask !== undefined)
            data = await jsonMask(data, mask, this.request.user);

        this.headers['Content-Type'] = 'application/json';
        this.data = this.request.isVirtual ? data : JSON.stringify(data);
        return this.end();
    }

    public html(html: string) {

        this.headers['Content-Type'] = 'text/html';
        this.data = html;
        return this.end();

    }

    public text(text: string) {

        this.headers['Content-Type'] = 'text/plain';
        this.data = text;
        return this.end();

    }

    // TODO: https://github.com/adonisjs/http-server/blob/develop/src/Response/index.ts#L430
    public file( fichier: string ) {

        // Securité
        if (fichier.includes('..'))
            throw new Forbidden("Disallowed");

        // Force absolute path
        if (!fichier.startsWith( this.app.path.root ))
            fichier = fichier[0] === '/'
                ? this.app.path.root + '/bin' + fichier
                : this.app.path.data + '/' + fichier;

        console.log(`[response] Serving file "${fichier}"`);

        // Verif existance
        if (!fs.existsSync(fichier)) {
            console.log("File " + fichier + " was not found.");
            throw new NotFound();
        }

        // envoi fichier
        this.data = fs.readFileSync(fichier);
        return this.end();
    }

    public redirect(url: string, code: number = 302) {

        debug && console.log("[routeur][response] Redirect", url);
        this.statusCode = code;
        this.headers['Location'] = url;
        return this.end();
    }

    public end() {
        this.wasProvided = true;
        return this;
    }

    public next() {
        this.wasProvided = false;
        return this;
    }

}