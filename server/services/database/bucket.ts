/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Core
import { TQueryOptions } from './connection';

/*----------------------------------
- TYPES
----------------------------------*/

const LogPrefix = '[database][bucket]';

/*----------------------------------
- CLASS
----------------------------------*/
export default class Queriesbucket {

    public queries: Set<string>;

    public constructor( 
        private queryOptions: TQueryOptions<'bucket'> = {},
        queriesList: string[] = [],  
    ) {
        this.queries = new Set<string>(queriesList);
    }

    public add( query: string ) {
        this.queries.add(query);
        return this;
    }

    public delete( query: string ) {
        this.queries.delete(query);
    }

    public run() {
        this.queryOptions.log && console.log(LogPrefix, `Run queries bucket`, ...this.queries);
    }
}