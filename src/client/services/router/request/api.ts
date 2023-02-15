/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import axios, { AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';

// Core
import type { TApiResponseData } from '@server/services/router';
import ApiClientService, { 
    TPostData,
    TApiFetchOptions, TFetcherList, TFetcherArgs, TFetcher 
} from '@common/router/request/api';
import { instancierViaCode, NetworkError } from '@common/errors';
import type ClientApplication from '@client/app';

import { toMultipart } from './multipart';

// Specific
import type { default as Router, Request } from '..';

/*----------------------------------
- TYPES
----------------------------------*/

const debug = true;

export type Config = {

}

/*----------------------------------
- FUNCTION
----------------------------------*/
export default class ApiClient implements ApiClientService {

    // APO Client needs to know the current request so we can monitor which api request is made from which page
    public constructor( 
        public app: ClientApplication, 
        public request: Request,
        public router = request.router
    ) {

    }

    /*----------------------------------
    - HIGH LEVEL
    ----------------------------------*/
    public get = <TData extends unknown = unknown>(path: string, data?: TPostData, opts?: TApiFetchOptions) => 
        this.createFetcher<TData>('GET', path, data, opts);

    public post = <TData extends unknown = unknown>(path: string, data?: TPostData, opts?: TApiFetchOptions) => 
        this.createFetcher<TData>('POST', path, data, opts);

    public put = <TData extends unknown = unknown>(path: string, data?: TPostData, opts?: TApiFetchOptions) => 
        this.createFetcher<TData>('PUT', path, data, opts);

    public delete = <TData extends unknown = unknown>(path: string, data?: TPostData, opts?: TApiFetchOptions) => 
        this.createFetcher<TData>('DELETE', path, data, opts);

    
    public set( newData: TObjetDonnees ) {

        console.log("[api] Update page data", newData);
        if (this.app.page)
            this.app.page.setAllData(curData => ({ ...curData, ...newData }));
        
    }

    public reload( ids?: string | string[], params?: TObjetDonnees ) {
        
        if (this.app.page === undefined)
            throw new Error("context.page is missing");

        if (ids === undefined)
            ids = Object.keys(this.app.page.fetchers);
        else if (typeof ids === 'string')   
            ids = [ids];

        console.log("[api] Reload data", ids, params, this.app.page.fetchers);

        for (const id of ids) {

            const fetcher = this.app.page.fetchers[id];
            if (fetcher === undefined)
                return console.error(`Unable to reload ${id}: Request not found in fetchers list.`);

            if (params !== undefined)
                fetcher.data = { ...(fetcher.data || {}), ...params };

            console.log("[api][reload]", id, fetcher.method, fetcher.path, fetcher.data);

            this.fetchAsync(fetcher.method, fetcher.path, fetcher.data).then((data) => {

                this.set({ [id]: data });

            })
        }
    }

    /*----------------------------------
    - LOW LEVEL
    ----------------------------------*/
    public createFetcher<TData extends unknown = unknown>(...args: TFetcherArgs): TFetcher<TData> {
        const [method, path, data, options] = args;
        return {
            method, path, data, options,
            // For async calls: api.post(...).then((data) => ...)
            then: (callback: (data: any) => void) => this.fetchAsync<TData>(...args).then(callback),
            catch: (callback: (data: any) => void) => this.fetchAsync<TData>(...args).catch(callback),
            finally: (callback: () => void) => this.fetchAsync<TData>(...args).finally(callback),
            run: () => this.fetchAsync<TData>(...args)
        };
    }

    public async fetchAsync<TData extends unknown = unknown>(...[
        method, path, data, options
    ]: TFetcherArgs): Promise<TData> {

        /*if (options?.captcha !== undefined)
            await this.gui.captcha.check(options?.captcha);*/

        return await this.fetch<TData>(method, path, data, options).catch((e) => {
            this.app.handleError(e);
            throw e; // Throw to break the loop
        })
    }

    public async fetchSync(fetchers: TFetcherList, alreadyLoadedData: {}): Promise<TObjetDonnees> {

        // Pick the fetchers where the data is needed
        const fetchersToRun: TFetcherList = {};
        let fetchersCount: number = 0;
        for (const fetcherId in fetchers) 
            // The fetcher can be undefined
            if (!( fetcherId in alreadyLoadedData ) && fetchers[ fetcherId ]) {
                fetchersToRun[ fetcherId ] = fetchers[ fetcherId ]
                fetchersCount++;
            }

        // Fetch all the api data thanks to one http request
        const fetchedData = fetchersCount === 0
            ? 0
            : await this.fetch("POST", "/api", { 
                fetchers: fetchersToRun 
            }).then((res) => {

                const data: TObjetDonnees = {};
                for (const id in res) 
                    data[id] = res[id];

                return data;

            });

        // Errors will be catched in the caller

        return { ...alreadyLoadedData, ...fetchedData }
    }

    public configure = (...[method, path, data, options]: TFetcherArgs): AxiosRequestConfig => {

        const { onProgress, captcha } = options || {};
    
        debug && console.log(`[api] Sending request`, method, path, data);
    
        const config: AxiosRequestConfig = {
    
            url: path,
            method: method,
            headers: {
                'Content-Type': "application/json",
                'Accept': "application/json",
            },
    
            validateStatus: function (status: number) {
                return status === 200;
            },
    
            onUploadProgress: onProgress === undefined ? undefined : (e) => {
                const percentCompleted = Math.round((e.loaded * 100) / e.total);
                onProgress(percentCompleted);
            }
    
        };
    
        if (data) {
            // URL params
            if (method === "GET") {
                config.params = data;
            // Post form data
            } else if (options?.encoding === 'multipart') {
                config.headers["Content-Type"] = 'multipart/form-data';
                config.data = toMultipart(data);
            // Post JSON
            } else {
                config.data = data;
            }
        }
    
        return config;
    }
    
    public fetch<TData = unknown>(...args: TFetcherArgs): Promise<TData> {
    
        const config = this.configure(...args);
        
        return axios.request(config)
            .then((res: AxiosResponse<TApiResponseData>) => {
    
                debug && console.log(`[api] Success:`, res);
                return res.data as TData;
    
            })
            .catch((e: AxiosError) => {
    
                if (e.response !== undefined) {
    
                    console.warn(`[api] Failure:`, e);
                    throw instancierViaCode(
                        e.response.status || 500,
                        e.response.data
                    );
    
                // Erreur réseau: l'utilisateur n'ets probablement plus connecté à internet
                } else {
                    const error = new NetworkError(e.message);
                    this.app.handleError(error);
                    throw error;
                }
            });
    }
}