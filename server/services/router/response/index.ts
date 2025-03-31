/* INSPIRATION:
    https://laravel.com/docs/8.x/responses
    https://docs.adonisjs.com/guides/response
*/

/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import express from 'express';

// Core
import { Application } from '@server/app';
import type ServerRouter from '@server/services/router';
import ServerRequest from '@server/services/router/request';
import { TRoute, TAnyRoute, TDomainsList } from '@common/router';
import { NotFound, Forbidden, Anomaly } from '@common/errors';
import BaseResponse, { TResponseData } from '@common/router/response';
import Page from './page';

// To move into a new npm module: json-mask
import jsonMask from './mask';

// Types
import type { TBasicUser } from '@server/services/auth';

/*----------------------------------
- TYPES
----------------------------------*/

const debug = true;

export type TBasicSSrData = {
    request: { data: TObjetDonnees, id: string },
    page: { chunkId: string, data?: TObjetDonnees },
    user: TBasicUser | null,
    domains: TDomainsList
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
        user: TBasicUser,

        Router: TRouter,
    }
    //& TRouterContextServices<TRouter>
)

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
    public clearCookie: express.Response["clearCookie"];
    public canonicalUrl: URL;

    // If data was provided by at lead one controller
    public wasProvided = false;

    public constructor( request: ServerRequest<TRouter> ) {

        super(request);

        this.cookie = this.request.res.cookie.bind(this.request.res);
        this.clearCookie = this.request.res.clearCookie.bind(this.request.res);

        this.router = request.router;
        this.app = this.router.app;

        this.canonicalUrl = new URL(request.url);
        this.canonicalUrl.search = '';
    }

    public async runController( route: TAnyRoute, additionnalData: {} = {} ) {

        this.route = route;

        // Update canonical url
        this.updateCanonicalUrl(route);

        // Create response context for controllers
        const context = await this.createContext(route);

        // Static rendering
        const chunkId = route.options["id"];
        if (route.options.static && 
            chunkId !== undefined 
            && 
            this.router.cache[ chunkId ] !== undefined
        ) {
            await this.html( this.router.cache[ chunkId ] );
            return;
        }

        // Run controller
        const content = await this.route.controller( context );
        if (content === undefined)
            return;

        // No need to process the content
        if (content instanceof ServerResponse)
            return;
        // Render react page to html
        else if (content instanceof Page)
            await this.render(content, context, additionnalData);
        // Return HTML
        else if (typeof content === 'string' && this.route.options.accept === 'html')
            await this.html(content);
        // Return JSON
        else
            await this.json(content);

        // Cache
        if (route.options.static)
            this.router.cache[ chunkId ] = this.data;
    }

    private updateCanonicalUrl( route: TAnyRoute ) {

        if (!route.options.canonicalParams)
            return;

        for (const key of route.options.canonicalParams) {
            const paramValue = this.request.data[ key ];
            if (paramValue !== undefined)
                this.canonicalUrl.searchParams.set(key, paramValue);
        }
    }

    /*----------------------------------
    - INTERNAL
    ----------------------------------*/

    // Start controller services
    private async createContext( route: TRoute ): Promise<TRequestContext> {

        const contextServices = this.router.createContextServices(this.request);

        const customSsrData = this.router.config.context(this.request, this.app);

        // TODO: transmiss safe data (especially for Router), as Router info could be printed on client side
        const context: TRequestContext = {
            // Router context
            app: this.app,
            context: undefined as TRequestContext,
            request: this.request,
            response: this,
            route: route,
            api: this.request.api,

            Router: this.router,

            // Router services
            ...(contextServices as TRouterContextServices<TRouter>),
            ...customSsrData
        }

        context.context = context;

        return context;
    }

    public forSsr( page: Page<TRouter> ): TBasicSSrData {

        const customSsrData = this.router.config.context(this.request, this.app);

        return {
            request: {
                id: this.request.id,
                data: this.request.data,
            },
            page: {
                chunkId: page.chunkId,
                data: page.data
            },
            domains: this.router.config.domains,
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

    public type( mimetype: string ) {
        this.headers['Content-Type'] = mimetype;
        return this;
    }

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

    public xml(xml: string) {

        this.headers['Content-Type'] = 'text/xml';
        this.data = xml;
        return this.end();
    }

    public text(text: string, mimetype: string = 'text/plain') {

        this.headers['Content-Type'] = mimetype;
        this.data = text;
        return this.end();
    }

    // TODO: https://github.com/adonisjs/http-server/blob/develop/src/Response/index.ts#L430
    public async file( filename: string, mimetype?: string ) {

        // Securité
        if (filename.includes('..'))
            throw new Forbidden("Disallowed");

        // // Force absolute path
        // if (!filename.startsWith( this.app.path.root ))
        //     filename = filename[0] === '/'
        //         ? this.app.path.root + '/bin' + filename
        //         : this.app.path.data + '/' + filename;
        // Disk not provided = file response disabled
        if (this.router.disks === undefined)
            throw new Anomaly("Router: Unable to return file response in router, because no disk has been given in the router config.");

        // Retirve disk driver
        const disk = this.router.disks.get('default');

        // Verif existance
        const fileExists = await disk.exists('data', filename);
        if (!fileExists) {
            console.log("File " + filename + " was not found.");
            throw new NotFound();
        }

        // envoi filename
        const file = await disk.readFile('data', filename, {
            encoding: 'buffer'
        });
        this.data = file;
        

        // Mimetype
        if (mimetype !== undefined)
            this.headers['Content-Type'] = mimetype;

        return this.end();
    }

    public redirect(url: string, code: number = 302) {

        debug && console.log("[routeur][response] Redirect", url);
        this.statusCode = code;
        this.headers['Location'] = this.router.url( url );
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