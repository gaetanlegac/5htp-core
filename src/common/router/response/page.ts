/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import type { VNode } from 'preact';

// Core libs
import { ClientOrServerRouter, TClientOrServerContext, TRoute, TErrorRoute } from '@common/router';
import { TFetcherList, TDataReturnedByFetchers } from '@common/router/request/api';
import { history } from '@client/services/router/request/history';

/*----------------------------------
- TYPES
----------------------------------*/

// The function that fetch data from the api before to pass them as context to the renderer
export type TDataProvider<TProvidedData extends TFetcherList = TFetcherList> = (
    context: TClientOrServerContext & {
        // URL query parameters
        // TODO: typings
        data: {[key: string]: string | number}
    }
) => TProvidedData

// The function that renders routes
export type TFrontRenderer<
    TProvidedData extends TFetcherList = TFetcherList, 
    TAdditionnalData extends {} = {},
    TRouter = ClientOrServerRouter,
> = ( 
    context: (
        TClientOrServerContext 
        &
        TAdditionnalData
        &
        {
            data: TDataReturnedByFetchers<TProvidedData>
        }
    )
) => VNode<any> | null

// Script or CSS resource
export type TPageResource = {
    id: string,
    attrs?: TObjetDonnees
} & ({
    inline: string
} | {
    url: string,
    preload?: boolean
})

const debug = false;

/*----------------------------------
- CLASS
----------------------------------*/
export default abstract class PageResponse<TRouter extends ClientOrServerRouter = ClientOrServerRouter> {

    // Metadata
    public chunkId: string;
    public title?: string;
    public description?: string;
    public bodyClass: Set<string> = new Set<string>();
    public bodyId?: string;

    // Resources
    public amp?: boolean;
    public scripts: TPageResource[] = [];
    public style: TPageResource[] = [];

    // Data
    public fetchers: TFetcherList = {};
    public data: TObjetDonnees = {};

    public constructor(
        public route: TRoute | TErrorRoute,
        public renderer: TFrontRenderer,
        public context: TClientOrServerContext
    ) {

        this.chunkId = context.route.options["id"];
       
    }
    
    public async fetchData() {

        // Load the fetchers list to load data if needed
        const dataFetcher = this.route.options.data;
        if (dataFetcher)
            this.fetchers = dataFetcher({
                ...this.context,
                data: this.context.request.data
            });

        // Execute the fetchers for missing data
        debug && console.log(`[router][page] Fetching api data:` + Object.keys(this.fetchers));
        this.data = await this.context.request.api.fetchSync( this.fetchers, this.data );
        return this.data;
    }
}