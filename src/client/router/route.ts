/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import type { ComponentChild } from 'preact';

// Core
import type { ClientContext } from '@client/context';
import type { TBaseRoute, TRouteOptions, } from '@common/router'
import type { TFetcher, TFetcherList } from '@common/router/request';

/*----------------------------------
- TYPES: PARTIAL ROUTES
----------------------------------*/

export type TSsrUnresolvedRoute = Pick<TClientRoute, 'type' | 'keys'> & {
    regex: string,
    chunk: string,
}

export type TUnresolvedRoute = Pick<TClientRoute, 'type' | 'keys'> & {
    regex: RegExp | null,
    chunk: string,
    load: TRouteLoader,
}

export type TFetchedRoute = Pick<TClientRoute, 'path' | 'options' | 'controller' | 'renderer' | 'method'>

/*----------------------------------
- TYPES: REGISTER
----------------------------------*/

type TRouteLoader = () => Promise<{ default: TFetchedRoute }>;

export type TRoutesLoaders = {
    [chunkId: string]: /* Preloaded via require() */TFetchedRoute | /* Loader via import() */TRouteLoader/* | undefined*/
}

export type TRouteCallback = (route?: TClientRoute) => void;

export type TRegisterPageArgs<TControllerData extends TFetcherList = {}> = [
    path: string,
    options: Partial<TRouteOptions>,
    controller: TFrontController<TControllerData> | null,
    renderer: TFrontRenderer<TControllerData>
];

/*----------------------------------
- TYPES: COMPLETE ROUTES
----------------------------------*/

export type TClientRoute = TBaseRoute & {
    type: 'PAGE',
    method: 'GET',
    controller: TFrontController | null,
    renderer: TFrontRenderer
}

// https://stackoverflow.com/questions/44851268/typescript-how-to-extract-the-generic-parameter-from-a-type
type TypeWithGeneric<T> = TFetcher<T>
type extractGeneric<Type> = Type extends TypeWithGeneric<infer X> ? X : never

export type TFrontController<TControllerData extends TFetcherList = {}> = 
    (urlParams: TObjetDonnees, context: ClientContext) => TControllerData

export type TFrontRenderer<TControllerData extends TFetcherList = {}> = (
    data: {
        [Property in keyof TControllerData]: undefined | (extractGeneric<TControllerData[Property]> extends ((...args: any[]) => any) 
            ? ThenArg<ReturnType< extractGeneric<TControllerData[Property]> >>
            : extractGeneric<TControllerData[Property]>
        )
    },
    context: ClientContext
) => ComponentChild