/*----------------------------------
- DEPENDANCES
----------------------------------*/
import type { TMetasColonne, TMySQLType } from './metas';

/*----------------------------------
- TYPES
----------------------------------*/

type JsType = {
    parse: (value: string) => any,
    check: (value: unknown, col: TMetasColonne) => boolean,
    print: (mysqlTypeParams: TMySQLType["params"]) => string,
}

export type TJsTypeName = keyof typeof js;
export type TMySQLTypeName = keyof typeof mysqlToJs;

/*----------------------------------
- LISTS
----------------------------------*/
/*
    TODO: to merge avec the schema library
*/
export const js = {
    array: {
        parse: (val: string) => val.split(','),
        print: (mysqlTypeParams: TMySQLType["params"]) => (mysqlTypeParams !== undefined 
            ? '(' + mysqlTypeParams.map( param => "'" + param + "'").join(' | ') + ')'
            : 'string'
        ) + '[]',
        // Check before using into a mysql query
        check: (val: unknown, col: TMetasColonne) => Array.isArray(val) && (
            col.type.sql.params === undefined
            ||
            val.every( item => col.type.sql.params?.includes( item ))
        )
    },
    enum: {
        parse: (val: string) => val,
        print: (mysqlTypeParams: TMySQLType["params"]) => mysqlTypeParams !== undefined
            ? mysqlTypeParams.map( param => "'" + param + "'").join(' | ')
            : 'string',
        // Check before using into a mysql query
        check: (val: unknown, col: TMetasColonne) => typeof val === 'string' && (
            col.type.sql.params === undefined
            ||
            col.type.sql.params.includes( val )
        )
    },
    float: {
        parse: (val: string) => parseFloat(val),
        print: () => 'number',
        // Check before using into a mysql query
        check: (val: unknown) => typeof val === 'number'
    },
    int: {
        parse: (val: string) => parseFloat(val),
        print: () => 'number',
        // Check before using into a mysql query
        check: (val: unknown, col: TMetasColonne) => (
            typeof val === 'number'
            ||
            // We assume that a int(1) is possibly a boolean
            (
                typeof val === 'boolean'
                /*&&
                col.type.sql.params[]*/
            )
        )
    },
    date: {
        parse: (val: string) => new Date(val),
        print: () => 'Date',
        // Check before using into a mysql query
        check: (val: unknown) => typeof val === 'number' || typeof val === 'string' || (typeof val === 'object' && val instanceof Date)
    },
    string: {
        parse: (val: string) => val,
        print: () => 'string',
        // Check before using into a mysql query
        check: (val: unknown) => typeof val === 'string'
    },
    object: {
        parse: (val: string) => JSON.parse(val),
        print: () => 'object',
        // Check before using into a mysql query
        check: (val: unknown) => typeof val === 'object'
    },
    
    // When we were not able to find an equivalent
    unknown: {
        parse: (val: any) => val,
        print: (mysqlTypeParams: TMySQLType["params"]) => 'any',
        // Check before using into a mysql query
        check: (val: unknown) => true
    },
} as const

// https://www.w3schools.com/sql/sql_datatypes.asp  
export const mysqlToJs = {
    // Float
    'DECIMAL': 'float',
    'FLOAT': 'float',
    'NEWDECIMAL': 'float',
    'DOUBLE': 'float',
    'POINT': 'float',
        
    // Integres
    'BIT': 'int',
    'LONG': 'int',
    'LONGLONG': 'int',

    'TINYINT': 'int',
    'SMALLINT': 'int',
    'MEDIUMINT': 'int',
    'INT': 'int',
    'INTEGER': 'int',
    'BIGINT': 'int',

    // Dates
    'DATE': 'date',
    'DATETIME': 'date',

    // Strings
    'VARCHAR': 'string',
    'BINARY': 'string',
    'VARBINARY': 'string',
    'TINYBLOB': 'string',
    'TINY_BLOB': 'string',
    'MEDIUM_BLOB': 'string',
    'BLOB': 'string',
    'LONG_BLOB': 'string',
    'CHAR': 'string',
    'VAR_STRING': 'string',
    'LONGTEXT': 'string',
    'TINYTEXT': 'string',
    'MEDIUMTEXT': 'string',
    'TEXT': 'string',
    'ENUM': 'enum',

    // Objects
    'SET': 'array',
    'JSON': 'object',

    // When we were not able to find an equivalent
    'UNKNOWN': 'unknown',
} as const