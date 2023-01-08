/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import mysql from 'mysql2/promise';
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

export type Config = {

}

export type Hooks = {

}

/*----------------------------------
- DEFINITIONS TYPES
----------------------------------*/

export type SqlQuery = SQL

export type TSelectQueryOptions = TQueryOptions & {

}

export type TInsertQueryOptions<TData extends TObjetDonnees = TObjetDonnees> = TQueryOptions & {
    upsert?: (keyof TData)[] | true, // When true, we use table.upsertableColumns
    upsertMode?: 'increment'
    try?: boolean
}

type TInsertResult = {
    fieldCount: number;
    affectedRows: number;
    changedRows: number;
    insertId: number;
    serverStatus: number;
    warningCount: number;
    message: string;
    procotol41: boolean;
}

/*----------------------------------
- HELPERS
----------------------------------*/

const LogPrefix = '[database]'

const equalities = (data: TObjetDonnees, keys = Object.keys(data)) => 
    keys.map(k => '`' + k + '` = ' + mysql.escape( data[k] ))

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

                if (value === undefined || value === null) {

                    value = 'NULL';

                    // Replace ""= NULL" by "IS NULL"
                    console.log("signBeforesignBefore", prefix, stringBefore);
                    if (prefix === '=')
                        stringBefore = stringBefore.substring(0, stringBefore.length - 1) + 'IS ';

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

    public update = <TData extends TObjetDonnees>(
        table: string, 
        data: TData, 
        where: TObjetDonnees, 
        opts?: TInsertQueryOptions<TData>
    ) => {

        const egalitesData = equalities(data).join(', ')
        const egalitesWhere = equalities(where).join(' AND ')

        return this.database.query(`
            UPDATE ${table} SET ${egalitesData} WHERE ${egalitesWhere};
        `, opts);

    }

    public upsert<TData extends TObjetDonnees>(
        path: string, 
        data: TData[] | TData, 
        colsToUpdate?: (keyof TData)[], 
        opts: TInsertQueryOptions<TData> = {}
    ) {
        return this.insert(path, data, {
            ...opts,
            upsert: colsToUpdate || true
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
    ): Promise<TInsertResult> {

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
                warningCount: 0,
                message: '',
                procotol41: false,
            };
        }

        let querySuffix: string = '';

        // Upsert
        if (opts.upsert !== undefined) {
            const upsertStatement = this.buildUpsertStatement<TData>(table, opts as With<TInsertQueryOptions<TData>, 'upsert'>);
            if (upsertStatement === null)
                opts.try = true;
            else
                querySuffix += ' ' + upsertStatement;
        }

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
    ): string | null {

        let upsert = opts.upsert;

        // Auto
        if (upsert === true) {
            console.log(LogPrefix, `Automatic upsert into ${table.chemin} using ${table.pk.join(', ')} as pk`);
            upsert = table.columnNamesButPk;
        }

        // All columns are ps
        if (upsert.length === 0)
            // Replace by insert ignore
            return null;

        return 'ON DUPLICATE KEY UPDATE ' + upsert.map((col: string) => 
            '`' + col + '` = ' + (opts.upsertMode === 'increment' ? '`' + col + '` + ' : '') + 'VALUES(' + col + ')'
        )
    }

    /*----------------------------------
    - OTHER
    ----------------------------------*/
    public delete = (table: string, where: TObjetDonnees = {}, opts?: TQueryOptions) =>
        this.database.query(`
            DELETE FROM ${table} WHERE ${equalities(where).join(' AND ')};
        `, opts);   
}