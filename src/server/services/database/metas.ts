/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import fs from 'fs-extra';
import type mysql from 'mysql2/promise';

// Core
import { mysqlToJs } from './datatypes';
import app from '@server/app';

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

    nom: string,
    loaded: true,

    database: string,
    chemin: string, // database + nom

    alias: string,

    pk: { 0: string } & string[], // Au moins une pk doit être renseignée
    colonnes: TListeMetasColonnesTable,
}

export type TListeMetasColonnesTable = { [nom: string]: TMetasColonne }

export type TMetasColonne = {
    attached: boolean, // Si les métadonnées ont bien été enrichies avec celles provenant de MySQL

    table: TMetasTable,
    nom: string,
    type: TTypeColonne,
    typeParams: string[],
    primary: boolean,
    api?: TMetasApi,
    nullable: boolean,
    defaut?: any, // ATTENTION: Valeur déjà sérialisée
    autoIncrement: boolean,
}

/*----------------------------------
- LIB
----------------------------------*/

const regParamsTypeSql = /\'([^\']+)\'\,?/gi;

export default async function loadMetadata( toLoad: string[], connection: mysql.Pool ) {
    
    console.info(`${toLoad.length} databases to load`);
    if (toLoad.length === 0)
        return {};

    const dbNames = Array.from(toLoad);
    const dbColumns = await queryMetadatas(dbNames, connection);

    const metas = importTables(dbColumns);

    // Update the models typings
    if (app.env.profile === 'dev')
        genTypes(metas);

    console.log(`Databases are loaded.`);
    return metas;
}

async function queryMetadatas( databases: string[], connection: mysql.Pool ) {
    console.log(`Loading tables metadatas for the following databases: ${databases.join(', ')} ...`);
    return (await connection.query(`
        SELECT

            /* Provenance */
            col.TABLE_SCHEMA as 'database',
            col.TABLE_NAME as 'table',
            col.COLUMN_NAME as 'colonne',

            /* Options */
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

function importTables(dbColumns: TDatabaseColumn[]): TDatabasesList {

    console.log(`Processing ${dbColumns.length} rows of metadatas`);

    const metas: TDatabasesList = {};

    for (const {
        database, table: nomTable, colonne: nomColonne,
        defaut, nullable, type, cle, extra
    } of dbColumns) {

        if (metas[database] === undefined)
            metas[database] = {}

        // Indexage de la table si pas déjà fait
        if (metas[database][nomTable] === undefined)
            metas[database][nomTable] = {
                loaded: true,
                database: database,
                alias: nomTable.toLowerCase(),
                nom: nomTable,
                chemin: '`' + database + '`.`' + nomTable + '`',
                colonnes: {},
                pk: [],
                default: false,
                modele: undefined
            }

        // Extraction des informations
        const table = metas[database][nomTable];
        const { nomType, paramsType } = parseColType(type);

        // Indexage clés primaires
        const primaire = cle === 'PRI';
        if (primaire && !table.pk.includes(nomColonne))
            table.pk.push(nomColonne);

        // Indexage de la colonne
        table.colonnes[nomColonne] = {
            attached: true,
            table: metas[database][nomTable],
            nom: nomColonne,
            primary: primaire,
            autoIncrement: extra.includes('auto_increment'),
            nullable: nullable === 'YES',
            defaut: defaut === null ? undefined : defaut,

            type: nomType,
            typeParams: paramsType
        }

    }

    return metas;
    
}

function parseColType(brut: string) {

    let nomType: TMetasColonne["type"];
    let paramsType: TMetasColonne["typeParams"] = [];

    const posParenthese = brut.indexOf('(');
    if (posParenthese === -1)
        nomType = brut.toUpperCase() as TMetasColonne["type"];
    else {
        nomType = brut.substring(0, posParenthese).toUpperCase() as TMetasColonne["type"];

        // Extraction paramètres du type entre les parentheses
        const paramsStr = brut.substring(posParenthese + 1, brut.length - 1)
        let m;
        do {
            m = regParamsTypeSql.exec(paramsStr);
            if (m)
                paramsType.push(m[1]);
        } while (m);
    }

    return { nomType, paramsType }

}

function genTypes( databases: TDatabasesList ) {

    const types: string[] = [];

    for (const db in databases) {
        for (const tableName in databases[db]) {

            const table = databases[db][tableName];

            const colsDecl: string[] = [];
            for (const colName in table.colonnes) {

                const col = table.colonnes[colName];
                let jsType = mysqlToJs[col.type];
                if (jsType === undefined) {
                    console.warn(`The mySQL data type « ${col.type} » has not been associated with a JS equivalent in mysqlToJs. Using any instead.`);
                    jsType = mysqlToJs['UNKNOWN'];
                }

                colsDecl.push('\t' + col.nom + (col.nullable ? '?' : '') + ': ' + jsType.typescript);

            }
            
            types.push('export type ' + table.nom + ' = {\n' + colsDecl.join(',\n') + '\n}');

        }
    }

    const modelsTypesPath = process.cwd() + '/src/server/models.ts';
    fs.outputFileSync( modelsTypesPath, types.join('\n') );
    console.log(`Wrote database types to ${modelsTypesPath}`);
    
}