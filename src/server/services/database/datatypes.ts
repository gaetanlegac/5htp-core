/*----------------------------------
- DEPENDANCES
----------------------------------*/
import type { TMetasColonne } from './metas';

/*----------------------------------
- TYPES
----------------------------------*/

type JsType = {
    parse: (value: string) => any,
    print: (col: TMetasColonne) => string
}

export type TJsTypeName = keyof typeof js;
export type TMySQLTypeName = keyof typeof mysqlToJs;

/*----------------------------------
- LISTS
----------------------------------*/
export const js = {
    array: {
        parse: (val: string) => val.split(','),
        print: (col) => (col.type.sql.params.length 
            ? '(' + col.type.sql.params.map( param => "'" + param + "'").join(' | ') + ')'
            : 'string'
        ) + '[]'
    },
    enum: {
        parse: (val: string) => val,
        print: (col) => col.type.sql.params.map( param => "'" + param + "'").join(' | ')
    },
    float: {
        parse: (val: string) => parseFloat(val),
        print: (col) => 'number'
    },
    int: {
        parse: (val: string) => parseFloat(val),
        print: (col) => 'number'
    },
    date: {
        parse: (val: string) => new Date(val),
        print: (col) => 'Date'
    },
    string: {
        parse: (val: string) => val,
        print: (col) => 'string'
    },
    object: {
        parse: (val: string) => JSON.parse(val),
        print: (col) => 'object'
    },
    
    // When we were not able to find an equivalent
    unknown: {
        parse: (val: any) => val,
        print: (col) => 'any'
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
    'INT': 'int',
    'BIGINT': 'int',
    'LONG': 'int',
    'LONGLONG': 'int',
    'TINYINT': 'int',
    'SMALLINT': 'int',
    'MEDIUMINT': 'int',

    // Dates
    'DATE': 'date',
    'DATETIME': 'date',

    // Strings
    'VARCHAR': 'string',
    'CHAR': 'string',
    'VAR_STRING': 'string',
    'LONGTEXT': 'string',
    'TEXT': 'string',
    'ENUM': 'enum',

    // Objects
    'SET': 'array',
    'JSON': 'object',

    // When we were not able to find an equivalent
    'UNKNOWN': 'unknown',
} as const