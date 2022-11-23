/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import type express from 'express';
import ISO6391 from 'iso-639-1';
import accepts from 'accepts';
import Bowser from "bowser";

// Core libs
import validateurs from '@server/data/input';
import { TSchema, validate as validerSchema, TDonneesValidees } from '@common/data/input/validate';
import app from '@server/app';

// Core libs: router
import ServerResponse from '../response';
import BaseRequest, { TFetcherArgs, TFetcher, TFetcherList } from '@common/router/request';

// Extensions
import AuthService from './services/auth';
import SecurityService from './services/detect';
import TrackingService from './services/tracking';

const debug = true;

/*----------------------------------
- TYPES
----------------------------------*/

import type { default as Router, HttpMethod, HttpHeaders } from '@server/services/router';

const localeFilter = (input: any) => typeof input === 'string' && ISO6391.validate(input) ? input : undefined;

/*----------------------------------
- CONTEXTE
----------------------------------*/
export default class ServerRequest extends BaseRequest {

    /*----------------------------------
    - PROPRIÉTÉS
    ----------------------------------*/

    public id: string;
    public isVirtual: boolean = false;

    // Requete
    public method: HttpMethod;
    public ip: string;
    public locale: string;
    public domain: string;
    public headers: HttpHeaders = {};
    public cookies: TObjetDonnees = {};

    // reponse
    public response?: ServerResponse;
    public router: Router;

    // Origin
    public req: express.Request;
    public res: express.Response;

    // Services
    //public analytics?: ua.Visitor;

    /*----------------------------------
    - INITIALISATION
    ----------------------------------*/
    public constructor( 

        id: string,
        method: HttpMethod, 
        path: string, 
        data: TObjetDonnees | undefined,
        headers: HttpHeaders | undefined,

        res: express.Response, 
        router: Router ,
        isVirtual: boolean = false
    ) {

        super(path);

        this.id = id;
        this.isVirtual = isVirtual;

        this.req = res.req;
        this.res = res
        this.router = router;

        this.host = this.req.get('host') as string;
        this.method = method;
        this.headers = headers || {};
        this.locale = this.getLocale();
        this.domain = res.req.hostname;
        this.cookies = res.req.cookies;

        this.ip = res.req.ip;
        if (this.ip === '::1' && app.env.localIP)
            this.ip = app.env.localIP;

        this.data = data || {};

        // FIX: L'utilisation du sprad sur la classe Servercontext fait perdre le contexte this à ses méthodes
        this.schema.validate = this.schema.validate.bind(this);
        
        //this.url = this.url.bind(this);

    }

    public children(method: HttpMethod, path: string, data: TObjetDonnees | undefined, headers?: HttpHeaders) {
        const children = new ServerRequest( 
            this.id, method, path, data, { ...(headers || {}), accept: 'application/json' },
            this.res, this.router, true
        );
        children.user = this.user;
        return children;
    }

    private getLocale() {

        const fromQuery = localeFilter(this.req.query.lang);
        if (fromQuery) {
            this.res.cookie('lang', fromQuery);
            return fromQuery;
        } 

        const locale = (
            // Member settings
            this.user?.locale 
            ||
            // URL
            localeFilter( this.req.cookies.lang )
            ||
            // Browser
            localeFilter( this.req.acceptsLanguages()[0] )
            || 
            // Default
            'EN'
        )

        return locale ? locale.toUpperCase() : 'EN'
    }

    /*----------------------------------
   - TESTS
   ----------------------------------*/

    public accepts(datatype: string | undefined) {
        // https://github.com/jshttp/accepts
        return datatype === undefined || datatype === '*' || accepts(this).type(datatype);
    }

    public device(): Bowser.Parser.ParsedResult | undefined {
        return this.headers['user-agent'] !== undefined
            ? Bowser.parse(this.headers['user-agent'])
            : undefined;
    }

    public deviceString(): string | undefined {
        const info = this.device();
        if (info === undefined) return undefined;
        const { os, browser } = info;
        return (os.name || 'Unknown OS') + ' ' + (os.versionName || os.version || '') + ' / ' + (browser.name || 'Unknown browser') + ' ' + (browser.version || '');
    }

    /*----------------------------------
    - SERVICES
    ----------------------------------*/
    public schema = {
        ...validateurs,
        // shortcut pour validation données requete
        validate: async <TSchemaA extends TSchema>(schema: TSchemaA): Promise<TDonneesValidees<TSchemaA>> => {

            console.log("Validate request data:", this.data);

            // Les InputError seront propagées vers le middleware dédié à la gestion des erreurs
            const { valeurs } = await validerSchema(
                schema,
                this.data, 
                this.data, 
                {}, 
                {
                    critique: true,
                    validationComplete: true,
                    avecDependances: false
                },
                []
            );

            return valeurs;
        }
    };

    /*public url = (route: string, params: any = {}, absolu: boolean = true) =>
        url(route, params, absolu);*/

    public auth = new AuthService(this);

    public tracking = new TrackingService(this);

    public detect = new SecurityService(this);

    public createFetcher(...[method, path, data, options]: TFetcherArgs) {
        return { 
            method, path, data, options,
            then: () => { throw new Error("Async resolvers should not be run from server side."); },
            run: () => { throw new Error("Async resolvers should not be run from server side."); },
        } as TFetcher;
    }

    public async fetchSync(fetchers: TFetcherList): Promise<TObjetDonnees> {

        const resolved: TObjetDonnees = {};

        for (const id in fetchers) {

            const { method, path, data, options } = fetchers[id];

            debug && console.log(`[api] Resolving from internal api`, method, path, data);

            const internalHeaders = { accept: 'application/json' }
            const request = this.request.children(method, path, data, { ...internalHeaders/*, ...headers*/ });
            resolved[id] = await request.router.resolve(request).then(res => res.data);

        }

        return resolved;

    } 
    
    public fetchAsync(...args: TFetcherArgs): Promise<any> {
        throw new Error("Async resolvers should not be run from server side.");
    }

}