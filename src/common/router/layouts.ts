/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import type { ComponentChild } from 'preact';
// Core
import type { ClientContext } from '@/client/context';
import type { TRouteOptions } from '.';
// App
import internalLayout from '@client/pages/_layout';
import layouts from '@/client/pages/**/_layout/index.tsx';

/*----------------------------------
- CONST
----------------------------------*/

export const layoutsList = layouts as ImportedLayouts;

/*----------------------------------
- TYPES
----------------------------------*/
type LayoutComponent = (attributes: { context: ClientContext }) => ComponentChild;

export type Layout = { path: string, Component: LayoutComponent }

export type ImportedLayouts = {
    [chunkId: string]: Layout["Component"]
}

/*----------------------------------
- UTILS
----------------------------------*/
// TODO: getLayot only on server side, and pass the layout chunk id
export const getLayout = (routePath: string, routeOptions?: TRouteOptions): Layout | undefined => {

    if (routeOptions === undefined)
        return undefined;
    // W don't want a layout on this page
    if (routeOptions.layout === false)
        return undefined;

    // options.id has been injected via the babel plugon
    const chunkId = routeOptions["id"];
    if (chunkId === undefined)
        throw new Error(`ID has not injected for the following page route: ${routePath}`);
    
    // Layout via name
    if (routeOptions.layout !== undefined) {

        const LayoutComponent = layouts[routeOptions.layout];
        if (LayoutComponent === undefined)
            throw new Error(`No layout found with ID: ${routeOptions.layout}. registered layouts: ${Object.keys(layouts)}`);

        return { 
            path: routeOptions.layout, 
            Component: layouts[routeOptions.layout] 
        }
    } 
            
    // Automatic layout via the nearest _layout folder
    for (const layoutPath in layouts)
        if (
            // The layout is nammed index when it's at the root (@/client/pages/_layout)
            layoutPath === 'index' 
            // Exact match
            || chunkId === layoutPath 
            // Parent
            || chunkId.startsWith( layoutPath + '_' )
        )
            return { 
                path: layoutPath, 
                Component: layouts[layoutPath] 
            };

    // Internal layout
    return {
        path: '/',
        Component: internalLayout
    }
}