/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import mysql from 'mysql2/promise';

// Core: general
import Application from '@server/app';
import Service from '@server/app/service';

// Core: specific
import { SqlError } from './debug';
import type Console from '../console';
import MetadataParser, { TDatabasesList, TMetasTable, TColumnTypes, TMetasColonne } from './metas';
import { TMySQLTypeName, mysqlToJs, js as jsTypes } from './datatypes';
import Bucket from './bucket';

/*----------------------------------
- CONFIG
----------------------------------*/

const LogPrefix = '[database][connection]';

/*----------------------------------
- SERVICE CONFIG
----------------------------------*/

export type DatabaseServiceConfig = {
    list: string[],
    dev: {
        host: string,
        port: number,
        login: string,
        password: string,
    },
    prod: {
        host: string,
        port: number,
        login: string,
        password: string,
    }
}

export type THooks = {

}

/*----------------------------------
- TYPES
----------------------------------*/

type TBasicQueryOptions = {
    bucket?: Bucket,
    simulate?: boolean,
    log?: boolean,
    returnQuery?: boolean,
}

export type TQueryOptions<TOmitValues extends keyof TBasicQueryOptions = never, TRequireValues extends keyof TBasicQueryOptions = never> = (
    Omit<TBasicQueryOptions, TOmitValues> 
    & 
    Required<Pick<TBasicQueryOptions, TRequireValues>>
)

export type TQueryResult = TSelectQueryResult;

// TODO: specifiy return type of every mysql query type
type TSelectQueryResult = any;

/*----------------------------------
- SERVICES
----------------------------------*/
export default class DatabaseConnection extends Service<DatabaseServiceConfig, THooks, Application> {

    private initialized = false;
    public connection!: mysql.Pool;

    public tables: TDatabasesList = {};
    public metas = new MetadataParser(this);

    /*----------------------------------
    - HOOKS
    ----------------------------------*/

    public async register() {

    }
    
    public loading: Promise<void> | undefined = undefined;
    public async start() {

        this.initialized = false;

        this.app.on('cleanup', () => this.cleanup());

        this.connection = await this.connect();

        this.tables = await this.metas.load( this.config.list );

        this.initialized = true;

    }

    public async cleanup() {
        return this.connection.end();
    }

    /*----------------------------------
    - INIT
    ----------------------------------*/
    public async connect() {

        console.info(LogPrefix, `Connecting to databases ...`);

        const creds = this.config[ this.app.env.profile ];

        return await mysql.createPool({

            // Identification
            host: creds.host,
            port: creds.port,
            user: creds.login,
            password: creds.password,
            database: this.config.list[0],

            // Pool
            waitForConnections: true,
            connectionLimit: 100,
            queueLimit: 0,

            // Dates & timezone
            dateStrings: true,
            timezone: 'local', // Utilise le timezone du serveur

            // Gestion types données personnalisées
            typeCast: this.typeCast.bind(this),

            // Transforme les décimaux en flottants (par d"faut, mysql retourne une chaine)
            // https://github.com/sidorares/node-mysql2/tree/master/documentation#known-incompatibilities-with-node-mysql
            decimalNumbers: true,

            // Permet lusieurs requetes en une
            multipleStatements: true,

            queryFormat: function (query, values) {
                //console.info(LogPrefix, 'queryFormat', query);
                return query;
            }
        });
    }

    private typeCast( field: mysql.Field, next: Function ) {

        // Wait for the connection to be initialized
        if (!this.initialized)
            return next();

        // Normal column
        let databaseColumn: TMetasColonne | undefined;
        if (field.db && field.table && field.name) {

            const db = this.tables[ field.db ];
            if (db === undefined) {
                console.error("Field infos:", field);
                throw new Error(`Database metadatas for ${field.db} were not loaded.`);
            }

            const table = db[field.table];
            if (table === undefined) {
                console.error("Field infos:", field);
                throw new Error(`Table metadatas for ${field.db}.${field.table} were not loaded.`);
            }

            databaseColumn = table.colonnes[field.name];
        }


        let type: TColumnTypes;
        if (databaseColumn !== undefined) {

            type = databaseColumn.type;

        // If the column name has not been found in the concerned table, 
        //  We assume it's a computed column
        } else {

            const mysqlType = {
                name: field.type as TMySQLTypeName,
                params: []
            }

            let jsTypeName = mysqlToJs[ mysqlType.name ];
            if (jsTypeName === undefined) {
                console.warn(`The mySQL data type « ${mysqlType.name} » has not been associated with a JS equivalent in mysqlToJs. Using any instead.`);
                jsTypeName = mysqlToJs['UNKNOWN'];
            }

            type = {
                sql: mysqlType,
                js: {
                    name: jsTypeName,
                    params: []
                }
            }
        }

        // Retrieve value
        let val = field.string();
        if (val === null)   
            return undefined;

        // Cast value
        const jsTypeParser = jsTypes[ type.js.name ];
        const castedVal = jsTypeParser.parse(val);
        //console.log(LogPrefix, `type cast`, val, `(${type.sql.name}) =>`, castedVal, `(${type.js.name})`);
        
        return castedVal;
    }

    /*----------------------------------
    - METADATA
    ----------------------------------*/

    public getTable( path: string ): TMetasTable {

        // Parse path
        let db: string, table: string;
        if (path.includes('.'))
            ([db, table] = path.split('.'));
        else {
            // Only the table = use the main database (first of the list in the config)
            db = this.config.list[0];
            table = path;
        }
            
        // Retrieve table info
        if (this.tables[db] === undefined)
            throw new Error(`Database "${db}" not loaded. Did you add it in the database config ?`);
        if (this.tables[db][table] === undefined)
            throw new Error(`Table "${db}.${table}" not loaded.`);

        return this.tables[db][table];

    }

    /*----------------------------------
    - QUERY
    ----------------------------------*/
    public bucket(
        queryOptions: TQueryOptions<'bucket'> = {},
        queriesList: string[] = [], 
    ) {
        return new Bucket(queryOptions, queriesList);
    }

    public async query<TResult extends TQueryResult>(
        query: string,
        opts: TQueryOptions<'bucket', 'bucket'>
    ): Promise<Bucket>;

    public async query<TResult extends TQueryResult>(
        query: string,
        opts: TQueryOptions<'returnQuery', 'returnQuery'>
    ): Promise<string>;

    public async query<TResult extends TQueryResult>(
        query: string,
        opts: TQueryOptions<'simulate', 'simulate'>
    ): Promise<void>;

    public async query<TResult extends TQueryResult>(
        query: string,
        opts?: TQueryOptions
    ): Promise<TResult>;

    public async query<TResult extends TQueryResult>(
        query: string,
        opts: TQueryOptions = {}
    ): Promise<TResult | Bucket | string | void> {

        if (opts.bucket) 
            return opts.bucket.add(query);

        if (opts.returnQuery === true)
            return query;

        if (opts.log === true)
            console.log(`[database][query]`, query);

        if (opts.simulate === true)
            return;

        try {

            const startTime = Date.now();

            // Lancement de la requête
            const [rows, fields] = await this.connection.query(query);

            if (opts.log !== false)
                this.log(query, startTime);

            return rows as unknown as TResult;
            
        } catch (error) {

            throw new SqlError(error, query);
        }
    }

    private log( query: string, startTime: number ) {

        const console = this.app.use<Console>('console');
        if (!console) return;

        const { channelType, channelId } = console.getChannel();
        if (channelId !== 'admin')
            console.sqlQueries.push({
                channelType,
                channelId,
                date: new Date(),
                query: query.trim(),
                time: Date.now() - startTime,
            });
    }
}