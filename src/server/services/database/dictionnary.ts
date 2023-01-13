/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Specific
import type Database from '.';

/*----------------------------------
- TYPES
----------------------------------*/

/*----------------------------------
- CLASS
----------------------------------*/
export default class QueriesDictionnary {

    public constructor( 
        protected database: Database
    ) {

    }

    protected sql( strings: TemplateStringsArray, ...data: any[] ) {
        return this.database.sql(strings, ...data);
    }
}