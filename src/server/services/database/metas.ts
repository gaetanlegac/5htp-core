/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import fs from 'fs-extra';
import type mysql from 'mysql2/promise';

// Core
import Application from '@server/app';

// Database
import type DatabaseConnection from './connection';
import { mysqlToJs, TMySQLTypeName, TJsTypeName, js as jsTypes } from './datatypes';

/*----------------------------------
- TYPES: DATABASE
----------------------------------*/

type TDatabaseColumn = {

    database: string,
    table: string,
    colonne: string,

    defaut: string,
    nullable: string,
    type: string,
    cle: string,
    extra: string,
    comment: string | null,

    assoTable: string,
    assoCol: string,

    onUpdate: string | null,
    onDelete: string | null,

}

export type TDatabasesList = {
    [database: string]: {
        [table: string]: TMetasTable
    }
}

export type TMetasTable = {

    // Table
    database: string,
    chemin: string, // database + name
    nom: string,
    alias: string,
    loaded: true,

    // Columns
    colonnes: TListeMetasColonnesTable,
    pk: string[], // Au moins une pk doit être renseignée
    columnNamesButPk: string[]
}

export type TListeMetasColonnesTable = { [nom: string]: TMetasColonne }

export type TMetasColonne = {

    // Column
    table: TMetasTable,
    nom: string,
    attached: boolean, // Si les métadonnées ont bien été enrichies avec celles provenant de MySQL
    primary: boolean,

    // Type
    type: TColumnTypes,
    nullable: boolean,

    // Value
    defaut?: any, // ATTENTION: Valeur déjà sérialisée
    autoIncrement: boolean,

    // Extra
    comment?: string
}

export type TColumnTypes = {
    sql: TMySQLType,
    js: TJsType
}

export type TMySQLType = {
    name: TMySQLTypeName,
    params: string[] 
}

export type TJsType = {
    name: TJsTypeName,
    params: string[],
}

/*----------------------------------
- CONFIG
----------------------------------*/

const LogPrefix = '[database][meta]';

const sqlTypeParamsReg = /\'([^\']+)\'\,?/gi;
const typeViaCommentReg = /^\[type=([a-z]+)\]/g;

const modelsTypesPath = process.cwd() + '/src/server/models.ts';

/*----------------------------------
- FUNCTIONS
----------------------------------*/
export default class MySQLMetasParser {

    public constructor( 
        private database: DatabaseConnection,
        public app = database.app,
    ) {

    }

    public async load( toLoad: string[] ) {
        
        console.info(`${toLoad.length} databases to load`);
        if (toLoad.length === 0)
            return {};

        const dbNames = Array.from(toLoad);
        const dbColumns = await this.query(dbNames);

        const metas = this.importTables(dbColumns);

        // Update the models typings
        if (this.app.env.profile === 'dev')
            this.genTypesDef(metas);

        console.log(`Databases are loaded.`);
        return metas;
    }

    private async query( databases: string[] ) {
        console.log(`Loading tables metadatas for the following databases: ${databases.join(', ')} ...`);
        return (await this.database.connection.query(`
            SELECT

                /* Provenance */
                col.TABLE_SCHEMA as 'database',
                col.TABLE_NAME as 'table',
                col.COLUMN_NAME as 'colonne',

                /* Options */
                col.COLUMN_COMMENT as 'comment',
                col.COLUMN_DEFAULT as 'defaut',
                col.IS_NULLABLE as 'nullable',
                col.COLUMN_TYPE as 'type',
                col.COLUMN_KEY as 'cle',
                col.EXTRA as 'extra'

            /* Colonnes */
            FROM information_schema.COLUMNS col

            WHERE col.TABLE_SCHEMA IN(${databases.map(d => '"' + d + '"').join(', ')})
        `))[0] as TDatabaseColumn[];
    }

    private importTables( dbColumns: TDatabaseColumn[] ): TDatabasesList {

        console.log(`Processing ${dbColumns.length} rows of metadatas`);

        const tablesIndex: TDatabasesList = {};

        for (const {
            database, table: nomTable, colonne: nomColonne,
            defaut, nullable, type, cle, extra, comment
        } of dbColumns) {

            if (tablesIndex[database] === undefined)
                tablesIndex[database] = {}

            // Indexage de la table si pas déjà fait
            if (tablesIndex[database][nomTable] === undefined)
                tablesIndex[database][nomTable] = {

                    // Table
                    chemin: '`' + database + '`.`' + nomTable + '`',
                    database: database,
                    nom: nomTable,
                    alias: nomTable.toLowerCase(),
                    loaded: true,

                    // Columns
                    colonnes: {},
                    pk: [],
                    columnNamesButPk: []
                }

            // Extrct tablesIndex
            const table = tablesIndex[database][nomTable];
            const parsedTypes = this.parseColType(type, comment);

            // Reference primary keys
            const isPrimary = cle === 'PRI';
            if (isPrimary && !table.pk.includes(nomColonne))
                table.pk.push(nomColonne);

            // Index column
            table.colonnes[nomColonne] = {

                // Column
                table: tablesIndex[database][nomTable],
                nom: nomColonne,
                attached: true,
                primary: isPrimary,

                // Type
                type: parsedTypes,
                nullable: nullable === 'YES',

                // Value
                defaut: defaut === null ? undefined : defaut,
                autoIncrement: extra.includes('auto_increment'),

                // Extra
                comment: comment || undefined
            }
        }

        // Re-process every table
        for (const databaseName in tablesIndex) {
            for (const tableName in tablesIndex[ databaseName ]) {

                const table = tablesIndex[ databaseName ][ tableName ];

                table.columnNamesButPk = Object.keys(table.colonnes).filter( 
                    colName => !table.pk.includes( colName )
                )
            }
        }

        return tablesIndex;
        
    }

    private parseColType( rawType: string, comment: string | null ): TColumnTypes {

        const mysqlType = this.parseMySQLType(rawType);

        const jsType = this.parseJsType(mysqlType, comment);

        return {
            sql: mysqlType,
            js: jsType
        }

    }

    private parseMySQLType( rawType: string ): TMySQLType {

        let name: TMySQLType["name"];
        let params: TMySQLType["params"] = [];

        // Via native MySQL type: parse type expression + params
        const posParenthese = rawType.indexOf('(');
        if (posParenthese === -1)
            name = rawType.toUpperCase() as TMySQLType["name"];
        else {
            name = rawType.substring(0, posParenthese).toUpperCase() as TMySQLType["name"];

            // Extraction paramètres du type entre les parentheses
            const paramsStr = rawType.substring(posParenthese + 1, rawType.length - 1)
            let m;
            do {
                m = sqlTypeParamsReg.exec(paramsStr);
                if (m)
                    params.push(m[1]);
            } while (m);
        }

        return { name, params }

    }

    private parseJsType( mysqlType: TMySQLType, comment: string | null ): TJsType {

        // Via comment
        if (comment) {
            // Exract via comments: [type=array]
            const foundTypeExpression = typeViaCommentReg.exec( comment );
            if (foundTypeExpression !== null) {

                const typeNameViaComment = foundTypeExpression[1];
                if (!(typeNameViaComment in jsTypes))
                    console.warn(`Invalid type "${typeNameViaComment}" found in column comments.`);
                else
                    return { 
                        name: typeNameViaComment as TJsTypeName, 
                        params: []
                    }
            }
        }

        // Via mysql Type
        let jsTypeName = mysqlToJs[ mysqlType.name ];
        if (jsTypeName === undefined) {
            console.warn(`The mySQL data type « ${mysqlType.name} » has not been associated with a JS equivalent in mysqlToJs. Using any instead.`);
            jsTypeName = mysqlToJs['UNKNOWN'];
        }

        return { 
            name: jsTypeName,  
            params: [],
        }

    }

    private genTypesDef( databases: TDatabasesList ) {

        const types: string[] = [];

        for (const db in databases) {
            for (const tableName in databases[db]) {

                const table = databases[db][tableName];

                const colsDecl: string[] = [];
                for (const colName in table.colonnes) {

                    const col = table.colonnes[colName];
                    const jsTypeUtils = jsTypes[ col.type.js.name ];
                    if (!jsTypeUtils) {
                        console.warn(`Unable to find the typescript print funvction for js type "${col.type.js.name}"`);
                        continue;
                    }

                    colsDecl.push('\t' + col.nom + (col.nullable ? '?' : '') + ': ' + jsTypeUtils.print( col ));
                }
                
                types.push('export type ' + table.nom + ' = {\n' + colsDecl.join(',\n') + '\n}');

            }
        }

        fs.outputFileSync( modelsTypesPath, types.join('\n') );
        console.log(LogPrefix, `Wrote database types to ${modelsTypesPath}`);
        
    }
}