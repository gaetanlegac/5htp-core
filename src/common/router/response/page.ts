/*----------------------------------
- DEPENDANCES
----------------------------------*/

import type { ComponentChild, FunctionComponent } from 'preact';

// Core libs
import { ClientOrServerRouter, TClientOrServerContext } from '@common/router';
import { TFetcherList, TDataReturnedByFetchers } from '@common/router/request/api';
import { history } from '@client/services/router/request/history';

/*----------------------------------
- TYPES
----------------------------------*/

// The function that fetch data from the api before to pass them as context to the renderer
export type TDataProvider<TProvidedData extends TFetcherList = {}> = 
    (context: TClientOrServerContext/* & TUrlData */) => TProvidedData

// The function that renders routes
export type TFrontRenderer<
    TProvidedData extends TFetcherList = {}, 
    TAdditionnalData = {},
    TRouter = ClientOrServerRouter,
> = FunctionComponent<(
    TClientOrServerContext 
    & 
    TDataReturnedByFetchers<TProvidedData>
    &
    TAdditionnalData
)>;

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
export default class PageResponse<TRouter extends ClientOrServerRouter = ClientOrServerRouter> {

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
        public dataProvider: TDataProvider | null,
        public renderer: TFrontRenderer,
        public context: TClientOrServerContext
    ) {

        this.chunkId = context.route.options["id"];
       
    }
    
    public async fetchData() {

        // Load the fetchers list to load data if needed
        if (this.dataProvider)
            this.fetchers = this.dataProvider({ ...this.context, ...this.context.request.data });

        // Execute the fetchers for missing data
        debug && console.log(`[router][page] Fetching api data:` + Object.keys(this.fetchers));
        this.data = await this.context.request.api.fetchSync( this.fetchers, this.data );
        return this.data;
    }
}