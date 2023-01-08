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

    if (args.length === 3)
        ([path, controller, renderer] = args)
    else
        ([path, options, controller, renderer] = args)

    // S'il s'agit d'une page, son id doit avoir été injecté via le plugin babel
    const chunkId = options["id"];
    if (chunkId === undefined)
        throw new Error(`ID has not injected for the following page route: ${path}`);

    // Bind layout
    if (options.layout !== false)
        options.layout = getLayout(chunkId);

    return { path, options, controller, renderer }

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