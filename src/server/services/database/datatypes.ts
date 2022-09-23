type JsType = {
    parse: (value: string) => any,
    typescript: string
}

const js: {
    [type: string]: JsType
} = {
    array: {
        parse: (val: string) => val.split(','),
        typescript: 'string[]'
    },
    float: {
        parse: (val: string) => parseFloat(val),
        typescript: 'number'
    },
    int: {
        parse: (val: string) => parseFloat(val),
        typescript: 'number'
    },
    date: {
        parse: (val: string) => new Date(val),
        typescript: 'Date'
    },
    string: {
        parse: (val: string) => val,
        typescript: 'string'
    },
    object: {
        parse: (val: string) => JSON.parse(val),
        typescript: 'object'
    },
    
    // When we were not able to find an equivalent
    unknown: {
        parse: (val: any) => val,
        typescript: 'any'
    },
}

export const mysqlToJs: {
    [type: string]: JsType
} = {

    'SET': js.array,

    'DECIMAL': js.float,
    'FLOAT': js.float,
    'NEWDECIMAL': js.float,
    'DOUBLE': js.float,
        
    'INT': js.int,
    'BIGINT': js.int,
    'LONG': js.int,
    'LONGLONG': js.int,
    'TINYINT': js.int,
    'SMALLINT': js.int,
    'MEDIUMINT': js.int,

    'DATE': js.date,
    'DATETIME': js.date,

    'VARCHAR': js.string,
    'CHAR': js.string,
    'VAR_STRING': js.string,
    'LONGTEXT': js.string,
    'TEXT': js.string,
    'ENUM': js.string,

    'JSON': js.object,

    // When we were not able to find an equivalent
    'UNKNOWN': js.unknown,
}