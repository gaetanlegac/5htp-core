/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import mysql from 'mysql2/promise';

// Core: general
import Application from '@server/app';
import Service from '@server/app/service';
import { Anomaly } from '@common/errors';

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

type ConnectionConfig = {
    name: string,
    databases: string[],
    host: string,
    port: number,
    login: string,
    password: string,
}

export type DatabaseServiceConfig = {
    debug: boolean,
    connections: ConnectionConfig[]
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
export default class DatabaseManager extends Service<DatabaseServiceConfig, THooks, Application> {

    private initialized = false;
    public connection!: mysql.Pool;
    public connectionConfig?: ConnectionConfig;

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

        // Try to connect to one of the databases
        const connectionErrors: string[] = []
        for (const connectionConfig of this.config.connections){
            try {
                await this.connect(connectionConfig)
                break;
            } catch (error) {
                console.warn(LogPrefix, `Failed to connect to ${connectionConfig.name}: ` + error);
                connectionErrors.push(connectionConfig.name + ': ' + error);
            }
        }

        // Coudnt connect to any database
        if (this.connectionConfig === undefined)
            throw new Anomaly(`Couldnt connect to any database.`, { connectionErrors });

        // Disconnect from the database when the app is terminated
        this.app.on('cleanup', () => this.disconnect());

        // Ready to make queries
        this.initialized = true;
    }

    public async disconnect() {
        return this.connection.end();
    }

    /*----------------------------------
    - INIT
    ----------------------------------*/
    public async connect(config: ConnectionConfig) {

        console.info(LogPrefix, `Trying to connect to ${config.name} ...`);
        this.connection = mysql.createPool({

            // Identification
            host: config.host,
            port: config.port,
            user: config.login,
            password: config.password,
            database: config.databases[0],

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
        })

        this.connectionConfig = config;

        this.tables = await this.metas.load( config.databases );
        console.info(LogPrefix, `Successfully connected to ${config.name}.`);
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
                params: [],
                raw: 'undefined', // Not needed here
            }

            let jsTypeName = mysqlToJs[ mysqlType.name ];
            if (jsTypeName === undefined) {
                this.config.debug && console.warn(`Column "${field.table}.${field.name}": The mySQL data type « ${mysqlType.name} » has not been associated with a JS equivalent in mysqlToJs. Using any instead.`);
                jsTypeName = mysqlToJs['UNKNOWN'];
            }

            type = {
                sql: mysqlType,
                js: {
                    name: jsTypeName,
                    params: [],
                    raw: 'undefined', // Not needed here
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

        if (this.connectionConfig === undefined)
            throw new Error(`No connection has been initialised.`);

        // Parse path
        let db: string, table: string;
        if (path.includes('.'))
            ([db, table] = path.split('.'));
        else {
            // Only the table = use the main database (first of the list in the config)
            db = this.connectionConfig.databases[0];
            table = path;
        }
            
        // Retrieve table info
        if (this.tables[db] === undefined)
            throw new Error(`Database "${db}" not loaded. Did you add it in the database config ?`);
        if (this.tables[db][table] === undefined)
            throw new Error(`Table "${db}.${table}" not loaded.`);

        return this.tables[db][table];

    }

    public checkValue( value: unknown, column: TMetasColonne ): string | false {

        const jsType = jsTypes[ column.type.js.name ];
        
        const isValid = (value === undefined || value === null) 
            ? column.optional
            : jsType.check( value, column );

        if (isValid)
            return false;

        console.log(column.type.sql.params)

        return `Data expected to match: ${column.type.js.raw} (MySQL: ${column.type.sql.raw}) ||. Got: ` + JSON.stringify(value);;

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

    public query<TResult extends TQueryResult>(
        query: string,
        opts: TQueryOptions<'bucket', 'bucket'>
    ): Bucket;

    public query<TResult extends TQueryResult>(
        query: string,
        opts: TQueryOptions<'returnQuery', 'returnQuery'>
    ): string;

    public query<TResult extends TQueryResult>(
        query: string,
        opts: TQueryOptions<'simulate', 'simulate'>
    ): void;

    public query<TResult extends TQueryResult>(
        query: string,
        opts?: TQueryOptions
    ): Promise<TResult>;

    public query<TResult extends TQueryResult>(
        query: string,
        opts: TQueryOptions = {}
    ): Promise<TResult> | Bucket | string | void {

        if (opts.bucket) 
            return opts.bucket.add(query);

        if (opts.returnQuery === true)
            return query;

        if (opts.log === true || opts.simulate === true)
            console.log(`[database][query]`, query);

        if (opts.simulate === true)
            return;
            
        const startTime = Date.now();
        return this.connection.query(query).then(([rows, fields]) => {

            if (opts.log !== false)
                this.log(query, startTime);

            return rows as unknown as TResult;

        }).catch((error) => {

            throw new SqlError(error, query);

        })
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