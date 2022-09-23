/*----------------------------------
- DEPENDANCES
----------------------------------*/

import type { ComponentChild } from 'preact';

// Core libs
import { TClientRoute, TFrontRenderer } from '@client/router';
import { TFetcherList } from '@common/router/request';
import { history } from '@client/router/request/history';
import { ClientContext } from '@client/context';

/*----------------------------------
- TYPES
----------------------------------*/

type TResource = {
    id: string,
    attrs?: TObjetDonnees
} & ({
    inline: string
} | {
    url: string,
    preload?: boolean
})

/*----------------------------------
- CLASS
----------------------------------*/
export default class PageResponse {

    // Render
    public id: string;
    public data: TObjetDonnees = {};
    public loading: ComponentChild = false;
    public component: TFrontRenderer;

    // Metadata
    public title?: string;
    public description?: string;
    public bodyClass: Set<string> = new Set<string>();
    public bodyId?: string;

    // resources
    public amp?: boolean;
    public scripts: TResource[] = [];
    public style: TResource[] = [];

    // State
    public hash?: string; // Element id to scroll to

    public constructor( 
        public context: ClientContext,
        public route: TClientRoute,
        data: TObjetDonnees = {},
    ) {
        this.id = route.options.id; // Binded by the pages babel plugin
        this.bodyId = route.options.bodyId;
        this.component = route.renderer;
        this.data = data;
        this.hash = context.request.hash;
    }

    // API data fetchers
    public fetchers: TFetcherList = {};

    // Should be called AFTER rendering the page
    public updateClient() {

        document.body.id = this.bodyId || this.id;
        document.title = this.title || APP_NAME;
        document.body.className = [...this.bodyClass].join(' ');
        
    }
    

    public async fetchData() {
        this.isDataLoaded = true;
        this.data = await this.context.request.fetchSync(this.fetchers);
        return this.data;
    }

    public setAllData( callback: (data: {[k: string]: any}) => void) { 
        console.warn(`page.setAllData not yet attached to the page Reatc component.`); 
    }
    public setData( key: string, value: ((value: any) => void) | any ) {
        this.setAllData(old => ({ 
            ...old, 
            [key]: typeof value === 'function' ? value(old[key]) : value 
        }));
    }

    public go( url: string ) {
        history?.replace(url);
    }
}