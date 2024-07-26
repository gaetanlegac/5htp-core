/*----------------------------------
- DEPENDANCES
----------------------------------*/

import type Application from "@server/app";

import type SQL from "@server/services/database";

/*----------------------------------
- TYPES
----------------------------------*/

/*----------------------------------
- CLASS
----------------------------------*/
export default abstract class Model<TData extends {}> {

    public abstract tableName: string;

    public constructor( app: Application & { SQL: SQL }, private SQL = app.SQL) {

    }

    public async create( data: TData | TData[] ): Promise< TData | TData[] > {
        return await this.SQL.insert( this.tableName, data );
    }

}