/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Core

import RequestService from './service';

import ApiClientService, { 
    TApiFetchOptions, TFetcherList, TFetcherArgs, TFetcher 
} from '@common/router/request/api';

/*----------------------------------
- TYPES
----------------------------------*/


/*----------------------------------
- SERVICE
----------------------------------*/
export default class ApiClientRequest extends RequestService implements ApiClientService {

    public async start() {

    }

    /*----------------------------------
    - HIGH LEVEL
    ----------------------------------*/

    public get = <TData extends unknown = unknown>(path: string, data?: TObjetDonnees, opts?: TApiFetchOptions) => 
        this.createFetcher<TData>('GET', path, data, opts);

    public post = <TData extends unknown = unknown>(path: string, data?: TObjetDonnees, opts?: TApiFetchOptions) => 
        this.createFetcher<TData>('POST', path, data, opts);

    public put = <TData extends unknown = unknown>(path: string, data?: TObjetDonnees, opts?: TApiFetchOptions) => 
        this.createFetcher<TData>('PUT', path, data, opts);

    public delete = <TData extends unknown = unknown>(path: string, data?: TObjetDonnees, opts?: TApiFetchOptions) => 
        this.createFetcher<TData>('DELETE', path, data, opts);

    /*----------------------------------
    - API CALLS FROM SERVER
    ----------------------------------*/

    public createFetcher<TData extends unknown = unknown>(...[method, path, data, options]: TFetcherArgs): TFetcher<TData> {
        return { 
            method, path, data, options,
            then: () => { throw new Error("Async resolvers should not be run from server side."); },
            run: () => { throw new Error("Async resolvers should not be run from server side."); },
        };
    }

    public async fetchSync(fetchers: TFetcherList, alreadyLoadedData: {}): Promise<TObjetDonnees> {

        const fetchedData: TObjetDonnees = { ...alreadyLoadedData };

        for (const id in fetchers) {

            const { method, path, data, options } = fetchers[id];
            //this.router.config.debug && console.log(`[api] Resolving from internal api`, method, path, data);

            // We don't fetch the already given data
            if (id in fetchedData)
                continue;

            // Create a children request to resolve the api data
            const internalHeaders = { accept: 'application/json' }
            const request = this.request.children(method, path, data, { ...internalHeaders/*, ...headers*/ });
            fetchedData[id] = await request.router.resolve(request).then(res => res.data);
        }

        return fetchedData;
    } 
}