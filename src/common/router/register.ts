/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import { pathToRegexp, Key } from 'path-to-regexp';

// Core
import { getLayout } from './layouts';

// types
import type { TRouteOptions } from '.';
import type { TDataProvider, TFrontRenderer } from './response/page';
import type { TRegisterPageArgs } from '@client/services/router';

/*----------------------------------
- UTILS
----------------------------------*/

export const getRegisterPageArgs = (...args: TRegisterPageArgs) => {

    let path: string;
    let options: Partial<TRouteOptions> = {};
    let controller: TDataProvider|null;
    let renderer: TFrontRenderer;

    if (args.length === 4)
        ([path, options, controller, renderer] = args)
    else if (typeof args[1] === 'object')
        ([path, options, renderer] = args)
    else
        ([path, controller, renderer] = args)

    // Automatic layout form the nearest _layout folder
    const layout = getLayout(path, options);

    return { path, options, controller, renderer, layout }

}

export const buildRegex = ( path: string ) => {

    // pathToRegexp ne supporte plus les wildcards depuis 4.0
    if (path.endsWith('*'))
        path = path.substring(0, path.length - 1) + '(.*)';

    // path => regex
    const keys: Key[] = []
    const regex = pathToRegexp(path, keys, {
        sensitive: true
    }); 

    return { 
        keys: keys.map(k => k.name), 
        regex 
    }

}