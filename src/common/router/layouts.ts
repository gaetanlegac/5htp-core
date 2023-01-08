/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import type { ComponentChild } from 'preact';
// Core
import type { ClientContext } from '@/client/context';
// App
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
export const getLayout = (routePath: string | undefined): Layout | undefined => {

    //console.log(`[router][layouts] Get layout for "${routePath}".`);
    
    let layout: Layout | undefined;
    if (routePath) {
        for (const layoutPath in layouts)
            if (routePath === layoutPath || routePath.startsWith( layoutPath + '_' ))
                layout = { 
                    path: layoutPath, 
                    Component: layouts[layoutPath] 
                };
    }

    //console.log(`[router][layouts] Get layout for "${routePath}". Found:`, layout);

    return layout;
}