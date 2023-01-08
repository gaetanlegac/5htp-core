/*----------------------------------
- DEPENDANCES
----------------------------------*/

import type { HttpMethod } from '@server/services/router';

/*----------------------------------
- TYPES
----------------------------------*/

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

// https://stackoverflow.com/questions/44851268/typescript-how-to-extract-the-generic-parameter-from-a-type
type TypeWithGeneric<T> = TFetcher<T>
type extractGeneric<Type> = Type extends TypeWithGeneric<infer X> ? X : never

export type TDataReturnedByFetchers<TProvidedData extends TFetcherList = {}> = {
    [Property in keyof TProvidedData]: undefined | (extractGeneric<TProvidedData[Property]> extends ((...args: any[]) => any) 
        ? ThenArg<ReturnType< extractGeneric<TProvidedData[Property]> >>
        : extractGeneric<TProvidedData[Property]>
    )
}

/*----------------------------------
- CLASS
----------------------------------*/
export default abstract class ApiClient {

    /*----------------------------------
    - TOP LEVEL
    ----------------------------------*/

    public abstract get<TData extends unknown = unknown>(path: string, data?: TObjetDonnees, opts?: TApiFetchOptions): TFetcher<TData>;

    public abstract post<TData extends unknown = unknown>(path: string, data?: TObjetDonnees, opts?: TApiFetchOptions): TFetcher<TData>;

    public abstract put<TData extends unknown = unknown>(path: string, data?: TObjetDonnees, opts?: TApiFetchOptions): TFetcher<TData>;

    public abstract delete<TData extends unknown = unknown>(path: string, data?: TObjetDonnees, opts?: TApiFetchOptions): TFetcher<TData>;

    /*----------------------------------
    - LOW LEVEL
    ----------------------------------*/

    public abstract createFetcher<TData extends unknown = unknown>(...args: TFetcherArgs): TFetcher<TData>;

    public abstract fetchSync(fetchers: TFetcherList): Promise<TObjetDonnees>;
}