/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import { pathToRegexp, Key } from 'path-to-regexp';
import type { ComponentChild } from 'preact';

// types
import type {
    TRegisterPageArgs,
    TClientRoute, 
    TFrontRenderer 
} from '@client/router';

import type { TApiServerRoute } from '@server/services/router';

import type { TSchema } from '@common/data/input/validate';

import { TUserRole } from '@common/models';

/*----------------------------------
- TYPES: layouts
----------------------------------*/

import layouts from '@/client/pages/**/_layout/index.tsx';

type LayoutComponent = ({ context: ClientContext }) => ComponentChild;
export type Layout = { path: string, Component: LayoutComponent }
const getLayout = (routePath: string | undefined): Layout | undefined => {
    
    let layout: Layout | undefined = layouts[''];
    if (routePath) {
        for (const layoutPath in layouts)
            if (routePath === layoutPath || routePath.startsWith( layoutPath + '/' ))
                layout = { path: layoutPath, Component: layouts[layoutPath] };
    }
    layout && console.log(`Using Layout: ${layout.path}`);
    return layout;
}

/*----------------------------------
- TYPES: ROUTES
----------------------------------*/

export type TBaseRoute = {
    path: string,

    regex: RegExp,
    keys: (number | string)[],

    options: TRouteOptions
}

export type TRoute = TApiServerRoute | TClientRoute;

export type TErrorRoute = {
    type: 'PAGE',
    renderer: TFrontRenderer,
    options: {}
}

export type TRouteOptions = {

    // Injected by the page plugin
    filepath: string,

    // Indexing
    bodyId?: string,
    priority: number,
    preload?: boolean,

    // Resolving
    domain?: string,
    accept?: string,

    // Access Restriction
    auth?: TUserRole | boolean,
    form?: TSchema,
    layout?: false | Layout,

    TESTING?: boolean,
    logging?: boolean,

}

export const defaultOptions: TRouteOptions = {
    priority: 0,
}

/*----------------------------------
- BASE ROUTER
----------------------------------*/

export default abstract class BaseRouter {

    public page = <TControllerData extends TObjetDonnees = {}>(...args: TRegisterPageArgs<TControllerData>) =>
        this.registerPage(...args);

    public error = (code: number, options, renderer: TFrontRenderer<{ message: string }>) =>
        this.registerErrorPage(code, options, renderer);

    protected abstract registerPage(...page: TRegisterPageArgs ): any;

    public errors: { [code: number]: TErrorRoute } = {};
    protected registerErrorPage( code: number, options, renderer: TFrontRenderer ) {
        return this.errors[code] = {
            type: 'PAGE',
            renderer,
            options
        };
    }

    protected getRegisterPageArgs(...args: TRegisterPageArgs) {

        const [path, options, controller, renderer] = args;

        // S'il s'agit d'une page, son id doit avoir été injecté via le plugin babel
        if (options["id"] === undefined)
            throw new Error(`ID not found for the following page route: ${path}`);

        // Bind layout
        if (options.layout !== false)
            options.layout = getLayout(options.filepath);

        return { path, options, controller, renderer }

    }

    protected buildRegex( path: string ) {

        // pathToRegexp ne supporte plus les wildcards depuis 4.0
        if (path.endsWith('*'))
            path = path.substring(0, path.length - 1) + '(.*)';

        // path => regex
        const keys: Key[] = []
        const regex = pathToRegexp(path, keys, {
            sensitive: true
        }); 

        return { keys, regex }

    }

}