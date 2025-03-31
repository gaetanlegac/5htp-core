/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import fs from 'fs-extra';
import path from 'path';
import type mysql from 'mysql2/promise';

// Core
import Container from '@server/app/container';
import { ucfirst } from '@common/data/chaines';

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
    pathname: string,
    attached: boolean, // Si les métadonnées ont bien été enrichies avec celles provenant de MySQL
    primary: boolean,

    // Type
    type: TColumnTypes,
    nullable: boolean,
    optional: boolean,

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
    params?: string[],
    raw: string
}

export type TJsType = {
    name: TJsTypeName,
    params?: string[],
    raw: string
}

/*----------------------------------
- CONFIG
----------------------------------*/

const LogPrefix = '[database][meta]';

const sqlTypeParamsReg = /\'([^\']+)\'\,?/gi;
const typeViaCommentReg = /\[type=([a-z]+)\]/g;

/*----------------------------------
- FUNCTIONS
----------------------------------*/
export default class MySQLMetasParser {

    public constructor( 
        private database: DatabaseConnection,
        public app = database.app,
        public debug = database.config.debug
    ) {

    }

    public async load( toLoad: string[] ) {
        
        this.debug && console.info(`${toLoad.length} databases to load`);
        if (toLoad.length === 0)
            return {};

        const dbNames = Array.from(toLoad);
        const dbColumns = await this.query(dbNames);

        const metas = this.importTables(dbColumns);

        this.debug && console.log(`Databases are loaded.`);
        return metas;
    }

    private async query( databases: string[] ) {
        this.debug && console.log(`Loading tables metadatas for the following databases: ${databases.join(', ')} ...`);
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

        this.debug && console.log(`Processing ${dbColumns.length} rows of metadatas`);

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
            const isNullable = nullable === 'YES';
            const defaultValue = defaut === null ? undefined : defaut;
            const isOptional = isNullable || defaultValue !== undefined;
            const parsedTypes = this.parseColType(nomColonne, type, comment, isOptional);

            // Reference primary keys
            const isPrimary = cle === 'PRI';
            if (isPrimary && !table.pk.includes(nomColonne))
                table.pk.push(nomColonne);

            // Index column
            table.colonnes[nomColonne] = {

                // Column
                table: tablesIndex[database][nomTable],
                nom: nomColonne,
                pathname: database + '.' + nomTable + '.' + nomColonne,
                attached: true,
                primary: isPrimary,

                // Type
                type: parsedTypes,
                nullable: isNullable,
                optional: isOptional,

                // Value
                defaut: defaultValue,
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

    private parseColType( name: string, rawType: string, comment: string | null, isOptional?: boolean ): TColumnTypes {

        const mysqlType = this.parseMySQLType(rawType);

        const jsType = this.parseJsType(name, mysqlType, comment, isOptional);

        return {
            sql: mysqlType,
            js: jsType
        }
    }

    private parseMySQLType( rawType: string ): TMySQLType {

        let name: TMySQLType["name"];
        let params: TMySQLType["params"];

        // Via native MySQL type: parse type expression + params
        const posParenthese = rawType.indexOf('(');
        if (posParenthese === -1) {

            name = rawType.toUpperCase() as TMySQLType["name"];

        } else {

            name = rawType.substring(0, posParenthese).toUpperCase() as TMySQLType["name"];
            params = []

            // Extraction paramètres du type entre les parentheses
            const paramsStr = rawType.substring(posParenthese + 1, rawType.length - 1)
            let m;
            do {

                m = sqlTypeParamsReg.exec(paramsStr);
                if (m)
                    params.push(m[1]);

            } while (m);

            if (params.length === 0)
                params = undefined;
        }

        return { name, params, raw: rawType }

    }

    private parseJsType( colName: string, mysqlType: TMySQLType, comment: string | null, isOptional?: boolean ): TJsType {

        let typeName: TJsType["name"] | undefined;
        let params: TJsType["params"];

        // Find type info via comment
        if (comment) {
            // Exract via comments: [type=array]
            const foundTypeExpression = [...comment.matchAll( typeViaCommentReg )][0];
            if (foundTypeExpression !== undefined) {

                const typeNameViaComment = foundTypeExpression[1];
                if (!(typeNameViaComment in jsTypes))
                    console.warn(`Invalid type "${typeNameViaComment}" found in column comments.`);
                else
                    typeName = typeNameViaComment as TJsTypeName;
            }
        }

        // Find type info via mysql Type
        if (typeName === undefined) {

            typeName = mysqlToJs[ mysqlType.name ];

            // Equivalent not found
            if (typeName === undefined) {
                this.database.config.debug && console.warn(`Column "${colName}": The mySQL data type « ${mysqlType.name} » has not been associated with a JS equivalent in mysqlToJs. Using any instead.`);
                typeName = mysqlToJs['UNKNOWN'];
            }
        }

        // Get utils from name
        const jsTypeUtils = jsTypes[ typeName ];
        if (!jsTypeUtils)
            throw new Error(`Unable to find the typescript print funvction for js type "${typeName}"`);

        const raw = colName + (isOptional ? '?' : '') + ': ' + jsTypeUtils.print( mysqlType.params );

        return { name: typeName, params, raw }
    }
}