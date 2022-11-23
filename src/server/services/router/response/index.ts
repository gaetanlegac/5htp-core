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
import { $ } from '@server/app';
import { NotFound, Forbidden } from '@common/errors';

// Libs métier
import * as render from '../../../libs/pages/render';
import filter from './filter';
import ServerRequest from '@server/services/router/request';
import { TRoute } from '@common/router';
import BaseResponse, { TResponseData, PageResponse } from '@common/router/response';
import { ClientContext } from '@client/context';

/*----------------------------------
- TYPES
----------------------------------*/

const debug = true;

export type TSsrData = {
    request: { data: TObjetDonnees, id: string },
    page: { id: string, data?: TObjetDonnees },
    user: User | null
}

/*----------------------------------
- CLASSE
----------------------------------*/
export default class ServerResponse<TData extends TResponseData = TResponseData> extends BaseResponse<TData, ServerRequest> {

    public statusCode: number = 200;
    public headers: {[cle: string]: string} = {}
    private triggers: {[cle: string]: any[]} = {}
    public cookie: express.Response["cookie"];

    public wasProvided = false;

    public constructor( request: ServerRequest ) {

        super(request);

        this.cookie = this.request.res.cookie.bind(this.request.res);
    }

    public async runController( route: TRoute, additionnalData?: TObjetDonnees ) {

        this.route = route;

        if (this.route.type === 'PAGE') {

            const context = new ClientContext(this.request);

            // Prepare page & fetch data
            const page = await context.createPage(this.route);
            await page.fetchData();
            if (additionnalData !== undefined) // Example: error message for error pages
                page.data = { ...page.data, ...additionnalData }

            // Render page
            const document = await render.page(page, this, context);
            this.html(document);

            // Never put html in the cache
            // Because assets urls need to be updated when their hash has been changed by a release
            this.request.res.setHeader("Expires", "0");

        } else {

            // Validate form data
            if (this.route.options.form !== undefined) {
                const formData = await this.request.schema.validate( this.route.options.form );
                console.log("FORM DATA VIA RESPONSE", formData);
                this.request.data = { ...this.request.data, ...formData }
            }

            const controllerData = additionnalData === undefined
                ? this.request.data
                // Example: error message for error pages
                : { ...this.request.data, ...additionnalData }

                // Run controller
            const returnedData = await this.route.controller(this.request, controllerData);

            // Default data type for `return <raw data>`
            if (returnedData !== undefined && !(returnedData instanceof ServerResponse)) {
                if (typeof returnedData === 'string' && this.route.options.accept === 'html')
                    await this.html(returnedData);
                else
                    await this.json(returnedData);
            }
        }
    }

    /*----------------------------------
    - INTERNAL
    ----------------------------------*/

    public async forSsr(page: PageResponse): Promise<TSsrData> {
        return {
            request: {
                id: this.request.id,
                data: this.request.data,
            },
            page: {
                id: page.id,
                data: page.data
            },

            user: this.request.user
                ? await filter(this.request.user, $.auth.SsrMask, this.request.user)
                : null
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

    public async json(data?: any, mask?: string) {

        // RAPPEL: On filter aussi les requetes internes, car leurs données seront imprimées au SSR pour le contexte client
        // filtreApi vérifie systèmatiquement si la donnée a été filtrée
        // NOTE: On évite le filtrage sans masque spécifié (performances + risques erreurs)
        if (mask !== undefined)
            data = await filter(data, mask, this.request.user);

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

        const app = this.request.router.app;

        // Securité
        if (fichier.includes('..'))
            throw new Forbidden("Disallowed");

        // Force absolute path
        if (!fichier.startsWith( app.path.root ))
            fichier = fichier[0] === '/'
                ? app.path.root + '/bin' + fichier
                : app.path.data + '/' + fichier;

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