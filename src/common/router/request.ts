/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Core
import Response, { TResponseData } from './response';
import PageResponse from './response/page';
import { TRoute } from '.';
import type { HttpMethod } from "@server/services/router";

/*----------------------------------
- TYPES
----------------------------------*/

// Modeles
import type { User } from '@models';

export type TFetcherList = { [id: string]: TFetcher }

export type TFetcher<TData extends unknown = unknown> = {

    // For async calls: api.post(...).then((data) => ...)
    then: (callback: (data: TData) => void) => Promise<TData>,
    run: () => Promise<TData>,
    
    method: HttpMethod,
    path: string,
    data?: object,
    options?: TApiFetchOptions
}

export type TFetcherArgs = [
    method: HttpMethod,
    path: string,
    data?: object,
    options?: TApiFetchOptions
]

export type TApiFetchOptions = {
    captcha?: string, // Action id (required by recaptcha)
    onProgress?: (percent: number) => void
}

/*----------------------------------
- CONTEXT
----------------------------------*/
export default abstract class BaseRequest {

    // Permet d'accèder à l'instance complète via spread
    public request: this = this;
    public host!: string;

    public data: TObjetDonnees = {};
    public abstract response?: Response;
    public user: User | null = null;

    public constructor(
        public path: string,
    ) {

    }

    public api = {
        get: <TData extends unknown = unknown>(path: string, data?: TObjetDonnees, opts?: TApiFetchOptions) => 
            this.createFetcher<TData>('GET', path, data, opts),

        post: <TData extends unknown = unknown>(path: string, data?: TObjetDonnees, opts?: TApiFetchOptions) => 
            this.createFetcher<TData>('POST', path, data, opts),

        put: <TData extends unknown = unknown>(path: string, data?: TObjetDonnees, opts?: TApiFetchOptions) => 
            this.createFetcher<TData>('PUT', path, data, opts),

        delete: <TData extends unknown = unknown>(path: string, data?: TObjetDonnees, opts?: TApiFetchOptions) => 
            this.createFetcher<TData>('DELETE', path, data, opts),
    }

    public abstract createFetcher<TData extends unknown = unknown>(...args: TFetcherArgs): TFetcher<TData>;

    public abstract fetchSync(fetchers: TFetcherList): Promise<TObjetDonnees>;

    public abstract fetchAsync(...args: TFetcherArgs): Promise<any>;

}