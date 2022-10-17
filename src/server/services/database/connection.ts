/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import mysql from 'mysql2/promise';

// Core: general
import app from '@server/app';
import loadMetadata, { TDatabasesList } from './metas';
import { seconds } from '@common/utils';

/*----------------------------------
- DEFINITIONS TYPESSQL
----------------------------------*/


/*----------------------------------
- SERVICES
----------------------------------*/
export default class FastDatabase {

    private initialized = false;
    public connection!: mysql.Pool;
    public tables: TDatabasesList = {};

    public config = app.config.database;

    /*----------------------------------
    - HOOKS
    ----------------------------------*/
    public constructor() {

        app.on('cleanup', () => this.cleanup());

    }

    public loading: Promise<void> | undefined = undefined;
    public async load() {

        // Wait for database service to be ready
        //await seconds(5);

        this.initialized = false;

        this.connection = await this.connect();

        this.tables = await loadMetadata( app.config.database.list, this.connection);

        this.initialized = true;

    }

    public async cleanup() {
        return this.connection.end();
    }

    /*----------------------------------
    - INIT
    ----------------------------------*/
    public async connect() {

        console.info(`Connecting to databases ...`);

        const creds = this.config[ app.env.profile ];

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
                //console.info('queryFormat', query);
                return query;
            }
        });
    }

    private typeCast(field, next) {

        // Metadata must be loaded
        if (!this.initialized)
            return next();

        let type = field.type;
        if (field.db) {

            // TODO: A revoir, car les infos passées peuvent être des alias

            const db = this.tables[ field.db ];
            if (db === undefined) {
                return next();
                console.error("Field infos:", field);
                throw new Error(`Database metadatas for ${field.db} were not loaded.`);
            }

            const table = db[field.table];
            if (table === undefined) {
                return next();
                console.error("Field infos:", field);
                throw new Error(`Table metadatas for ${field.db}.${field.table} were not loaded.`);
            }

            const column = table.colonnes[field.name];
            if (column === undefined) {
                return next();
                console.error("Field infos:", field);
                throw new Error(`Column metadatas for ${field.db}.${field.table}.${field.name} were not loaded.`);
            }

            type = column.type;

        } 

        const val = field.string();
        if (val === null)   
            return undefined;

        // https://www.w3schools.com/sql/sql_datatypes.asp  
        switch (type) {

            case 'SET':
                return val.split(',');

            case 'DECIMAL':
            case 'FLOAT':
            case 'NEWDECIMAL':
            case 'DOUBLE':
                return parseFloat(val);
                
            case 'INT':
            case 'LONG':
            case 'LONGLONG':
            case 'TINYINT':
            case 'SMALLINT':
            case 'MEDIUMINT':
                return parseInt(val);

            case 'DATE':
            case 'DATETIME':
                return new Date(val);

            case 'VARCHAR':
            case 'CHAR':
            case 'VAR_STRING':
            case 'LONGTEXT':
            case 'TEXT':
            case 'ENUM':
                return val;

            case 'JSON':
                return JSON.parse(val);
            
        }

        console.warn("/!\\ UNHANDLED TYPE " + type + " for field " + field.name);
        return val;
    }
}

/*----------------------------------
- REGISTER SERVICE
----------------------------------*/
app.register('database', FastDatabase);
declare global {
    namespace Core {
        interface Services {
            database: FastDatabase;
        }
    }
}