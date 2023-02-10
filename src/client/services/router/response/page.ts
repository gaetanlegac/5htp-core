/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import type { ComponentChild } from 'preact';

// Core
import type { TClientOrServerContext, Layout } from '@common/router';
import PageResponse, { TDataProvider, TFrontRenderer } from "@common/router/response/page";

// Specific
import type ClientRouter from '..';

/*----------------------------------
- TYPES
----------------------------------*/



/*----------------------------------
- CLASS
----------------------------------*/

export default class ClientPage<TRouter = ClientRouter> extends PageResponse<TRouter> {

    public isLoading: boolean = false;
    public loading: false | ComponentChild;
    public scrollToId: string;

    public constructor(
        public dataProvider: TDataProvider | null,
        public component: TFrontRenderer,
        public context: TClientOrServerContext,
        public layout?: Layout,

        public route = context.route
    ) {

        super(dataProvider, component, context);

        this.bodyId = context.route.options.bodyId;
        this.scrollToId = context.request.hash;
    }
    
    public async preRender( data?: TObjetDonnees ) {

        // Add the page to the context
        this.context.page = this;
        this.isLoading = true;

        // Data succesfully loaded
        this.data = data || await this.fetchData();
        this.isLoading = false;

        return this;
    }

   /*----------------------------------
    - ACTIONS
    ----------------------------------*/
    // Should be called AFTER rendering the page
    public updateClient() {

        document.body.id = this.bodyId || this.id;
        document.title = this.title || APP_NAME;
        document.body.className = [...this.bodyClass].join(' ');
        
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

    public setLoading(state: boolean) {

        if (state === true) {
            if (!document.body.classList.contains("loading"))
                document.body.classList.add("loading");
        } else {
            document.body.classList.remove("loading");
        }

    }
}