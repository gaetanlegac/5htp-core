/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import mysql from 'mysql2/promise';
import dottie from 'dottie';
const safeStringify = require('fast-safe-stringify'); // remplace les références circulairs par un [Circular]

// Core: general
import app, { $ } from '@server/app';
import { NotFound } from '@common/errors';

// Services
import './connection';

/*----------------------------------
- DEFINITIONS TYPES
----------------------------------*/

export type SqlQuery = ReturnType<typeof sql>;

export type TQueryOptions = {
    simulate?: boolean,
    log?: boolean,
    returnQuery?: boolean
}

export type TSelectQueryOptions = TQueryOptions & {

}

export type TInsertQueryOptions<TData extends TObjetDonnees = TObjetDonnees> = TQueryOptions & {
    upsert?: (keyof TData)[],
    upsertMode?: 'increment'
    try?: boolean
}

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

declare global {
    namespace Core {
        namespace Config {
            interface Services {
                database: DatabaseServiceConfig
            }
        }
    }
}

/*----------------------------------
- HELPERS
----------------------------------*/

const escape = (data: any) => {

    // JSON object
    if (typeof data === 'object' && data !== null) {

        if (data.constructor.name === "Object" || Array.isArray(data))
            data = safeStringify(data);


    }

    return mysql.escape(data);
}

const equalities = (data: TObjetDonnees, keys = Object.keys(data)) => 
    keys.map(k => '`' + k + '` = ' + escape( data[k] ))

/*----------------------------------
- CORE
----------------------------------*/

export type SQL = typeof sql;

export function sql<TRowData extends TObjetDonnees = {}>(strings: TemplateStringsArray, ...data: any[]) {

    const string = sql.string(strings, ...data);

    const query = (options: TSelectQueryOptions = {}) => sql.select<TRowData>(string, options);

    query.all = query;
    query.run = (opts: TQueryOptions = {}) => sql.query<TRowData[]>(string, opts);
    query.then = (cb: (data: any) => void) => query().then(cb);

    query.first = <TRowData extends TObjetDonnees = {}>() => sql.first<TRowData>(string);
    query.value = <TValue extends any = number>() => sql.selectVal<TValue>(string);
    query.count = () => sql.count(string);
    query.firstOrFail = (message?: string) => sql.firstOrFail<TRowData>(string, message);
    query.exists = () => sql.exists(string);

    /*query.stats = (periodStr: string, intervalStr: string, columns: string[]) =>
        fetchStats(columns, string, periodStr, intervalStr)*/

    query.mergeValues = (options: TQueryOptions = {}) => 
        sql.query(string, options).then( queriesResult => {

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

sql.esc = escape;

sql.string = (strings: TemplateStringsArray, ...data: any[]) => {
    const iMax = data.length - 1;
    return strings.map((s, i) => {

        if (i <= iMax) {

            let d = data[i];
            const prefix = s[s.length - 1];

            if (typeof data === 'function') 
                throw new Error(`A function has been passed into the sql string template: ` + data);

            if (prefix === ':' || prefix === '&') {

                s = s.substring(0, s.length - 1);

                // Object: `WHERE :${filters}` => `SET requestId = "" AND col = 3`
                if (typeof d === 'object') {

                    const keyword = prefix === '&' ? ' AND ' : ', '

                    d = Object.keys(d).length === 0 ? '1' : equalities(d).join( keyword );
                    
                // String: `SET :${column} = ${data}` => `SET balance = 10`
                } else {

                }

            } else if (typeof d === 'function' && d.string !== undefined)
                d = d.string;
            else
                d = escape(d);

            s += d;

        }

        return s;

    }).join(' ').trim();
}

/*----------------------------------
- OPERATIONS: LOW LEVELf
----------------------------------*/

sql.query = async <TRowData extends TObjetDonnees = {}>(
    query: string,
    opts: TQueryOptions = {}
): Promise<TRowData[] | string | void> => {

    if (opts.returnQuery === true)
        return query;

    await $.database.loading;

    if (opts.log === true)
        console.log(`[database][query]`, query);

    if (opts.simulate === true)
        return;

    try {

        const startTime = Date.now();

        // Lancement de la requête
        const [rows, fields] = await $.database.connection.query(query);

        if (opts.log !== false) {
            const { channelType, channelId } = $.console.getChannel();
            if (channelId !== 'admin')
                $.console.sqlQueries.push({
                    channelType,
                    channelId,
                    date: new Date(),
                    query: query.trim(),
                    time: Date.now() - startTime,
                });
        }

        return rows as unknown as TRowData[];
        
    } catch (error) {
        
        // NOTE: Le formatteur sql peut planter quand la requete est trop complexe (ex: json)
        try {
            console.error("Query that caused error:\n", $.console.printSql(query));
        } catch (error) {
            console.error("Query that caused error:\n", query);
        }
        
        throw error;
        
    }

}

sql.bulk = (queries: (SqlQuery | string)[]) => {
    const allqueries = queries.map(q => typeof q === "string" ? q : q.string).join(';\n');
    console.log("Bulk query", allqueries);
    return sql.query(allqueries);
}

/*----------------------------------
- OPERATIONS: READ
----------------------------------*/
sql.select = async <TRowData extends any>(query: string, opts: TSelectQueryOptions): Promise<TRowData[]> => {
    const rows = await sql.query(query, opts);
    return dottie.transform(rows);
}

sql.first = <TRowData extends TObjetDonnees = {}>(query: string, opts: TSelectQueryOptions = {}): Promise<TRowData> =>
    sql.query(query, opts).then((resultatRequetes: any) => {
        return resultatRequetes[0] || null;
    });

sql.firstOrFail = <TRowData extends TObjetDonnees = {}>(query: string, message?: string, opts: TSelectQueryOptions = {}): Promise<TRowData> =>
    sql.query(query, opts).then((resultatRequetes: any) => {

        if (resultatRequetes.length === 0)
            throw new NotFound(message);

        return resultatRequetes[0];

    });

sql.selectVal = <TVal extends any>(query: string, opts?: TQueryOptions): Promise<TVal | null> =>
    sql.query(query, opts).then((resultatRequetes: any) => {

        const resultat = resultatRequetes[0];

        if (!resultat)
            return null;

        return Object.values(resultat)[0] as TVal;

    });

sql.count = (query: string, opts?: TQueryOptions): Promise<number> =>
    sql.selectVal<number>('SELECT COUNT(*) ' + query).then(val => 
        val === null ? 0 : val
    );

sql.exists = async (query: string, opts?: TQueryOptions): Promise<boolean> => {
    const count = await sql.count(query);
    return count !== 0;
}

/*----------------------------------
- OPERATIONS: UPDATE
----------------------------------*/

sql.update = <TData extends TObjetDonnees>(
    table: string, 
    data: TData, 
    where: TObjetDonnees, 
    opts?: TInsertQueryOptions<TData>
) => {

    const egalitesData = equalities(data).join(', ')
    const egalitesWhere = equalities(where).join(' AND ')

    return sql.query(`
        UPDATE ${table} SET ${egalitesData} WHERE ${egalitesWhere};
    `, opts);

}

sql.upsert = <TData extends TObjetDonnees>(
    path: string, 
    data: TData | TData[], 
    colsToUpdate: (keyof TData)[], 
    opts: TInsertQueryOptions<TData> = {}
) =>
    sql.insert(path, data, {
        ...opts,
        upsert: colsToUpdate
    });

/*----------------------------------
- OPERATIONS: INSERT
----------------------------------*/

sql.tryInsert = (table: string, data: TObjetDonnees) =>
    sql.insert(table, data, { try: true });

sql.insert = async <TData extends TObjetDonnees>(
    path: string, 
    data: TData | TData[], 
    opts: TInsertQueryOptions<TData> = {}
) => {

    let db: string, table: string;
    if (path.includes('.'))
        ([db, table] = path.split('.'));
    else {
        // Only the table = use the main database (first of the list in the config)
        db = $.database.config.list[0];
        table = path;
    }
        
    if ($.database.tables[db] === undefined)
        throw new Error(`Database "${db}" not loaded. Did you add it in the database config ?`);
    if ($.database.tables[db][table] === undefined)
        throw new Error(`Table "${db}.${table}" not loaded.`);

    const columns = $.database.tables[db][table].colonnes;
    const colNames = Object.keys(columns);

    if (!Array.isArray(data))
        data = [data];

    let query = `INSERT ` + (opts.try ? 'IGNORE ' : '') + 
        `INTO ` + path + ` (` + colNames.map(col => '`' + col + '`').join(', ') + `) VALUES ` +
        data.map(entry => {

            const values: string[] = [];
            for (const col of colNames)
                if (col in entry)
                    values.push( escape(entry[col]) );
                else
                    values.push("DEFAULT");

            return '(' + values.join(', ') + ')';

        }).join(', ');

    if (opts.upsert !== undefined)
        query += ' ON DUPLICATE KEY UPDATE ' + opts.upsert.map( col => 
            '`' + col + '` = ' + (opts.upsertMode === 'increment' ? '`' + col + '` + ' : '') + 'VALUES(' + col + ')'
        )

    const queryResult = await sql.query(query + ';', opts);

    console.log("opts.returnQuery", opts.returnQuery, "queryResult", queryResult);
    
    return [data, queryResult.insertId, queryResult];
}

/*----------------------------------
- OTHER
----------------------------------*/
sql.delete = (table: string, where: TObjetDonnees = {}, opts?: TInsertQueryOptions) =>
    sql.query(`
        DELETE FROM ${table} WHERE ${equalities(where).join(' AND ')};
    `, opts);

/*----------------------------------
- REGISTER SERVICE
----------------------------------*/
app.register('sql', sql, { instanciate: false });
declare global {
    namespace Core {
        interface Services {
            sql: SQL;
        }
    }
}
