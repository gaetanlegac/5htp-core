/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import { Location } from 'history'; 
import type Bowser from 'bowser';

// Core 
import BaseRequest, { TFetcherArgs, TFetcherList } from '@common/router/request';
import ClientResponse from '../response';
import apiRequest from '@client/context/api';
import { ClientContext } from '@client/context';
import { NetworkError } from "@common/errors";

/*----------------------------------
- TYPES
----------------------------------*/

// Modeles
import type { User } from '@models';

/*----------------------------------
- ROUTER
----------------------------------*/
export default class ClientRequest extends BaseRequest {

    public gui!: ClientContext; // a initialiser le plus tot possible
    public response?: ClientResponse;
    public context: ClientContext;

    public hash?: string;

    public constructor( location: Location, context: ClientContext ) {

        super(
            location.pathname
        );

        this.context = context;
        this.host = window.location.host;
        this.hash = location.hash;

    }

    public device(): Bowser.Parser.ParsedResult | undefined {
        // We load bowser only when required
        const Bowser = require("bowser");
        return Bowser.parse(window.navigator.userAgent);
    }

    public createFetcher(...args: TFetcherArgs) {
        const [method, path, data, options] = args;
        return {
            method, path, data, options,
            // For async calls: api.post(...).then((data) => ...)
            then: (callback: (data: any) => void) => this.fetchAsync(...args).then(callback),
            catch: (callback: (data: any) => void) => this.fetchAsync(...args).catch(callback),
            finally: (callback: () => void) => this.fetchAsync(...args).finally(callback),
            run: () => this.fetchAsync(...args)
        };
    }

    public async fetchAsync(...[method, path, data, options]: TFetcherArgs): Promise<any> {

        /*if (options?.captcha !== undefined)
            await this.gui.captcha.check(options?.captcha);*/

        return await apiRequest(this.context, method, path, data, options).catch((e) => {
            this.gui.handleError(e);
            throw e;
        })
    }

    public async fetchSync(fetchers: TFetcherList): Promise<TObjetDonnees> {

        const ids = Object.keys(fetchers);
        if (ids.length === 1) {
            const id = ids[0];
            const fetcher = fetchers[id];
            return {
                [id]: await apiRequest( this.context, fetcher.method, fetcher.path, fetcher.data, undefined )
            };
        }

        const fetchersArgs: {[id: string]: TFetcherArgs} = {};
        for (const id in fetchers)
            fetchersArgs[id] = [
                fetchers[id].method,
                fetchers[id].path,
                fetchers[id].data,
            ]

        return await apiRequest(this.context, "POST", "/api", { fetchers: fetchersArgs }, undefined).then((res) => {

            const data: TObjetDonnees = {};
            for (const id in res) 
                data[id] = res[id];

            return data;

        });

    }

}