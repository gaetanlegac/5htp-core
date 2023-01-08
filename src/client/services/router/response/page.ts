/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Core
import type { TClientOrServerContext } from '@common/router';
import PageResponse, { TDataProvider, TFrontRenderer } from "@common/router/response/page";
import { history } from '@client/services/router/request/history';

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
    public scrollToId: string;

    public constructor(
        public dataProvider: TDataProvider | null,
        public component: TFrontRenderer,
        public context: TClientOrServerContext,

        public route = context.route
    ) {

        super(dataProvider, component, context);

        this.bodyId = context.route.options.bodyId;
        this.scrollToId = context.request.hash;
    }
    
    public async render( data?: TObjetDonnees ) {

        // Add the page to the context
        this.context.page = this;
         
        // Load the fetchers list to load data if needed
        if (this.dataProvider)
            this.fetchers = this.dataProvider( this.context );

        // Data succesfully loaded
        if (data !== undefined) {
            this.isLoading = false;
            this.data = data;
        }

        // Fetch data
        this.data = await this.fetchData();

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

    public go( url: string ) {
        history?.replace(url);
    }

    public loadIndicator;
    public loading(state: boolean) {

        if (state === true) {
            if (!document.body.classList.contains("loading"))
                document.body.classList.add("loading");
        } else {
            document.body.classList.remove("loading");
        }

    }
}