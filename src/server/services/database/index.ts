/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import mysql from 'mysql2/promise';
import type { ResultSetHeader } from 'mysql2';
import dottie from 'dottie';
const safeStringify = require('fast-safe-stringify'); // remplace les références circulairs par un [Circular]

// Core: general
import type Application from '@server/app';
import Service from '@server/app/service';
import { callableInstance } from '@common/data/objets';
import { NotFound } from '@common/errors';

// Services
import Database, { DatabaseServiceConfig, TQueryOptions } from './connection';
import type { TMetasTable } from './metas';

/*----------------------------------
- SERVICE TYPES
----------------------------------*/

export { default as Repository } from './repository';

export type Config = {

}

export type Hooks = {

}

/*----------------------------------
- DEFINITIONS TYPES
----------------------------------*/

export type SqlQuery = ReturnType<SQL["sql"]>

export type TSelectQueryOptions = TQueryOptions & {

}

export type TUpdateQueryOptions<TData extends TObjetDonnees = TObjetDonnees> = TQueryOptions;

export type TInsertQueryOptions<TData extends TObjetDonnees = TObjetDonnees> = TQueryOptions & {
    upsert?: TColsToUpsert<TData>, // When "*", we use table.upsertableColumns
    upsertMode?: 'increment'
    try?: boolean
}

type TColsToUpsert<TData extends TObjetDonnees> = (
    // Update all updatable columns (default)
    '*' 
    | 
    // Specify which values exactly we have to update
    // If '*', provided, we update all the updatable values and override with specific values
    // { '*': true } is equivalent to '*'
    ({ '*'?: true } & Partial<TData>)
    | 
    // A list of columns to update
    (keyof TData)[] 
)

/*----------------------------------
- HELPERS
----------------------------------*/

const LogPrefix = '[database]'

const equalities = (data: TObjetDonnees, keys = Object.keys(data)) => 
    keys.map(k => '' + k + ' = ' + mysql.escape( data[k] ))

/*----------------------------------
- CORE
----------------------------------*/

// TODO: build callable instance sithut instanciating the service

export default class SQL extends Service<Config, Hooks, Application> {

    public database: Database;

    public constructor( app: Application, config: DatabaseServiceConfig ) {
        
        super(app, {});

        this.database = new Database(app, config);
    }

    public async register() {
        await this.database.register();
    }

    public async start() {
        await this.database.start();
    }

    public callableInstance() {
        return callableInstance( this, 'sql' );
    }

    /*----------------------------------
    - OPERATIONS: PARSING
    ----------------------------------*/
    public sql<TRowData extends TObjetDonnees = {}>( strings: TemplateStringsArray, ...data: any[] ) {

        const string = this.string(strings, ...data);

        const query = (opts: TSelectQueryOptions = {}) => this.select<TRowData>(string, opts);

        query.all = query;
        query.run = (opts: TQueryOptions = {}) => this.database.query<TRowData[]>(string, opts);
        query.then = (cb: (data: any) => void) => query().then(cb);

        query.first = <TRowData extends TObjetDonnees = {}>(opts: TSelectQueryOptions = {}) => this.first<TRowData>(string, opts);
        query.firstOrFail = (message?: string, opts: TQueryOptions = {}) => this.firstOrFail<TRowData>(string, message, opts);

        query.value = <TValue extends any = number>(opts: TQueryOptions = {}) => this.selectVal<TValue>(string, opts);
        
        query.count = (opts: TQueryOptions = {}) => this.count(string, opts);
        query.exists = (opts: TQueryOptions = {}) => this.exists(string, opts);

        /*query.stats = (periodStr: string, intervalStr: string, columns: string[]) =>
            fetchStats(columns, string, periodStr, intervalStr)*/

        query.mergeValues = (options: TQueryOptions = {}) => 
            this.database.query(string, options).then( queriesResult => {

                const data: TObjetDonnees = {};
                for (const queryResult of queriesResult)
                    if (queryResult.length !== 0)
                        for (const k in queryResult[0])
                            data[k] = queryResult[0][k];
                return data;

            })

        query.string = string;

        return query;
    }

    public esc(data: any) {

        // JSON object
        // TODO: do it via datatypes.ts
        if (typeof data === 'object' && data !== null) {

            if (Array.isArray(data))
                data = data.join(',')
            else if (data.constructor.name === "Object")
                data = safeStringify(data);
        }
    
        return mysql.escape(data);
    }

    public string = (strings: TemplateStringsArray, ...data: any[]) => {
        const iMax = data.length - 1;

        if (typeof data === 'function') 
            throw new Error(`A function has been passed into the sql string template: ` + data);

        return strings.map((stringBefore, i) => {

            if (i <= iMax) {

                let value = data[i];
                stringBefore = stringBefore.trim();
                const prefix = stringBefore[stringBefore.length - 1];

                // Null
                if (value === undefined || value === null) {

                    value = 'NULL';

                    // Replace ""= NULL" by "IS NULL"
                    if (prefix === '=')
                        stringBefore = stringBefore.substring(0, stringBefore.length - 1) + 'IS ';

                // Prefix = special parse
                } else if (prefix === ':' || prefix === '&') {

                    // Remove the prefix
                    stringBefore = stringBefore.substring(0, stringBefore.length - 1);

                    // Object: `WHERE :${filters}` => `SET requestId = "" AND col = 3`
                    if (typeof value === 'object') {

                        const keyword = prefix === '&' ? ' AND ' : ', '

                        value = Object.keys(value).length === 0 ? '1' : equalities(value).join( keyword );
                        
                    // String: `SET :${column} = ${data}` => `SET balance = 10`
                    } else {


                    }

                // SQL query
                } else if (typeof value === 'function' && value.string !== undefined)
                    value = value.string;
                else
                    value = mysql.escape(value);

                stringBefore += value;

            }

            return stringBefore;

        }).join(' ').trim();
    }

    /*----------------------------------
    - OPERATIONS: LOW LEVELf
    ----------------------------------*/

    public bulk = (queries: (SqlQuery | string)[], opts?: TQueryOptions) => {
        const allqueries = queries.map(q => typeof q === "string" ? q : q.string).join(';\n');
        //console.log("Bulk query", allqueries);
        return this.database.query(allqueries, opts);
    }

    /*----------------------------------
    - OPERATIONS: READ
    ----------------------------------*/

    public select = async <TRowData extends any>(query: string, opts: TSelectQueryOptions = {}): Promise<TRowData[]> => {
        const rows = await this.database.query(query, opts);
        return dottie.transform(rows);
    }
    public query = this.select;

    public first = <TRowData extends TObjetDonnees = {}>(query: string, opts: TSelectQueryOptions = {}): Promise<TRowData> =>
        this.database.query(query, opts).then((resultatRequetes: any) => {
            return resultatRequetes[0] || null;
        });

    public firstOrFail = <TRowData extends TObjetDonnees = {}>(query: string, message?: string, opts: TSelectQueryOptions = {}): Promise<TRowData> =>
        this.database.query(query, opts).then((resultatRequetes: any) => {

            if (resultatRequetes.length === 0)
                throw new NotFound(message);

            return resultatRequetes[0];

        });

    public selectVal = <TVal extends any>(query: string, opts?: TQueryOptions): Promise<TVal | null> =>
        this.database.query(query, opts).then((resultatRequetes: any) => {

            const resultat = resultatRequetes[0];

            if (!resultat)
                return null;

            return Object.values(resultat)[0] as TVal;

        });

    public count = (query: string, opts?: TQueryOptions): Promise<number> =>
        this.selectVal<number>('SELECT COUNT(*) ' + query).then(val => 
            val === null ? 0 : val
        );

    public exists = async (query: string, opts?: TQueryOptions): Promise<boolean> => {
        const count = await this.count(query, opts);
        return count !== 0;
    }

    /*----------------------------------
    - OPERATIONS: UPDATE
    ----------------------------------*/

    // Update multiple records
    public update<TData extends TObjetDonnees>(
        tableName: string, 
        data: TData[], 
        where: (keyof TData)[], 
        opts?: TUpdateQueryOptions<TData>
    );

    // Update one record
    public update<TData extends TObjetDonnees>(
        tableName: string, 
        data: TData, 
        where: (keyof TData)[] | TObjetDonnees, 
        opts?: TUpdateQueryOptions<TData>
    );

    public update<TData extends TObjetDonnees>(...args: [
        tableName: string, 
        data: TData[], 
        where: (keyof TData)[], 
        opts?: TUpdateQueryOptions<TData>
    ] | [
        tableName: string, 
        data: TData, 
        where: (keyof TData)[] | TObjetDonnees, 
        opts?: TUpdateQueryOptions<TData>
    ]) {

        let [tableName, data, where, opts] = args;

        // Multiple updates in one
        if (Array.isArray( data ))
            return this.database.query(
                data.map(record => this.update(tableName, record, where, opts)).join(';\n')
            )

        // No condition specified = use the pks
        if (Array.isArray(where)) {
            const whereColNames = where;
            where = {}
            for (const whereCol of whereColNames) {
                const whereValue = data[whereCol];
                if (whereValue === undefined)
                    throw new Error(`The column "${whereCol}" is used as a where value, but no value has been provided in the data to update.`);
                where[ whereCol ] = whereValue;
            }
        }

        // Create equalities
        const egalitesData = equalities(data).join(', ')
        const egalitesWhere = equalities(where).join(' AND ')

        // Build query
        return this.database.query(`
            UPDATE ${tableName} SET ${egalitesData} WHERE ${egalitesWhere};
        `, opts);

    }

    public upsert<TData extends TObjetDonnees>(
        path: string, 
        data: TData[] | TData, 
        colsToUpdate: TColsToUpsert<TData> = '*', 
        opts: TInsertQueryOptions<TData> = {}
    ) {
        return this.insert(path, data, {
            ...opts,
            upsert: colsToUpdate
        });
    }

    /*----------------------------------
    - OPERATIONS: INSERT
    ----------------------------------*/

    public tryInsert = (table: string, data: TObjetDonnees) =>
        this.insert(table, data, { try: true });

    public async insert<TData extends TObjetDonnees>(
        path: string, 
        data: TData | TData[], 
        opts: TInsertQueryOptions<TData> = {}
    ): Promise<ResultSetHeader> {

        const table = this.database.getTable(path);

        // Normalize data
        if (!Array.isArray(data))
            data = [data];
        else if (data.length === 0) {
            console.warn(LogPrefix, `Insert nothing in ${path}. Cancelled.`);
            return {
                fieldCount: 0,
                affectedRows: 0,
                changedRows: 0,
                insertId: 0,
                serverStatus: 0,
                warningStatus: 0,
                info: undefined
            };
        }

        let querySuffix: string = '';

        // Upsert
        if (opts.upsert !== undefined)
            querySuffix += ' ' + this.buildUpsertStatement<TData>(table, opts as With<TInsertQueryOptions<TData>, 'upsert'>);
        
        // Create basic insert query
        const query = this.buildInsertStatement(table, data, opts) + querySuffix;

        const queryResult = await this.database.query<mysql.OkPacket>(query + ';', opts);

        return {
            fieldCount: queryResult.fieldCount,
            affectedRows: queryResult.affectedRows,
            changedRows: queryResult.changedRows,
            insertId: queryResult.insertId,
            serverStatus: queryResult.serverStatus,
            warningCount: queryResult.warningCount,
            message: queryResult.message,
            procotol41: queryResult.procotol41,
        };
        
        // OLD: return [data, queryResult?.insertId, queryResult];
    }

    private buildInsertStatement<TData extends TObjetDonnees>(
        table: TMetasTable, 
        data: TData[],
        opts:  TInsertQueryOptions<TData>
    ) {

        const colNames = Object.keys(table.colonnes);

        return (
            `INSERT ` + (opts.try ? 'IGNORE ' : '') + 
            `INTO ` + table.chemin + ` (` + colNames.map( col => '`' + col + '`').join(', ') + `) VALUES ` +
            data.map(entry => {

                const values: string[] = [];
                for (const col of colNames)
                    if (col in entry)
                        values.push( this.esc( entry[col] ));
                    else
                        values.push("DEFAULT");

                return '(' + values.join(', ') + ')';

            }).join(', ')
        )
    }

    private buildUpsertStatement<TData extends TObjetDonnees>( 
        table: TMetasTable, 
        opts: With<TInsertQueryOptions<TData>, 'upsert'> 
    ): string {

        const valuesToUpdate = this.getValuesToUpdate(table, opts.upsert);

        // All columns are ps
        const valuesToUpdatesEntries = Object.entries(valuesToUpdate);
        if (valuesToUpdatesEntries.length === 0)
            throw new Error(`You should provide at least one column to update in case of the record already exists.`);

        return 'ON DUPLICATE KEY UPDATE ' + valuesToUpdatesEntries.map(([ colName, value ]) => 
            '`' + colName + '` = ' + value
        )
    }

    // TODO: Fix typings
    private getValuesToUpdate<TData extends TObjetDonnees>(
        table: TMetasTable,
        colsToUpdate: TColsToUpsert<TData>
    ) {

        // Column name => SQL
        let valuesToUpdate: Partial<TData> = {};

        // Define which columns to update when the record already exists
        let valuesNamesToUpdate: (keyof TData)[] = [];
        if (colsToUpdate === '*') {

            console.log(LogPrefix, `Automatic upsert into ${table.chemin} using ${table.pk.join(', ')} as pk`);
            valuesNamesToUpdate = Object.keys(table.colonnes);// table.columnNamesButPk;
            // We don't take columnNamesButPk, because if all the columns are pks, we don't have yny value for the ON DUPLICATE KEY
            //  Meaning

        } else if (Array.isArray( colsToUpdate )) {

            valuesNamesToUpdate = colsToUpdate;

        } else {

            const { '*': updateAll, ...customValuesToUpdate } = colsToUpdate;

            for (const colKey in customValuesToUpdate)
                valuesToUpdate[ colKey ] = this.esc(customValuesToUpdate[ colKey ]);

            if (updateAll)
                valuesNamesToUpdate = Object.keys(table.colonnes);//table.columnNamesButPk;

        }

        for (const colToUpdate of valuesNamesToUpdate)   
            if (!( colToUpdate in valuesToUpdate ))
                valuesToUpdate[ colToUpdate ] = "VALUES(`" + colToUpdate + "`)";

        return valuesToUpdate;
    }

    /*----------------------------------
    - OTHER
    ----------------------------------*/
    public delete(
        table: string, 
        where: TObjetDonnees | SQL = {}, 
        opts?: TQueryOptions
    ): Promise<ResultSetHeader> {

        const whereSql = typeof where === 'function' && where['string'] !== undefined
            ? where['string']
            : equalities(where).join(' AND ');

        return this.database.query(`DELETE FROM ${table} WHERE ${whereSql};`, opts);   
    }
}