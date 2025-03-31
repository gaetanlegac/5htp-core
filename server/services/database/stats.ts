/*----------------------------------
- OUTILS DE TRAITEMENT
----------------------------------*/

// Npm
import hInterval from 'human-interval';

// Core
import type { Application } from '@server/app';
import Service from '@server/app/service';
import type CacheService from '../cache';
import type SQL from '.';

/*----------------------------------
- CONST
----------------------------------*/

export const StatsPeriods = {
    "12 hours": { period: '12 hours', interval: '1 hour' },
    "24 hours": { period: '24 hours', interval: '2 hour' },
    "7 days": { period: '7 days', interval: '12 hour' },
}
export const periods = Object.keys(StatsPeriods);

const scaleTime = (time: number, intervalTime: number) => 
    Math.floor(time / intervalTime) * intervalTime

const statsCols = (columns: (string | [string, string])[], op: string) => 
    columns.map(col => {

        let name: string, expr: string;
        if (typeof col === 'string')
            name = expr = col;
        else
            ([name, expr] = col);

        return 'COALESCE( ' + op + '(' + expr + '), 0) as ' + name;

    }).join(', ')

const debug = false;

/*----------------------------------
- TYPES
----------------------------------*/

type TStatsServiceConfig = {

}

type TObjDonneesStats = { [cheminStats: string]: number }
export type TStat<TDonnees extends TObjDonneesStats> = { date: string } & TDonnees
export type TTimeStat<TDonnees extends TObjDonneesStats> = { time: number } & TDonnees

type TRetourStats<TDonnees extends TObjDonneesStats> = {

    stats: TDonnees,
    graph: TTimeStat<TDonnees>[],

    start: Date,
    end: Date,
    interval: number,
}

/*----------------------------------
- SERVICE
----------------------------------*/
export default class StatsService extends Service<TStatsServiceConfig> {

    public constructor(
        config: TStatsServiceConfig,
        private cache: CacheService,
        private sql: SQL
    ) {

        super(config);

    }

    protected async start() {}

    public async fetchStats<TDonnees extends TObjDonneesStats>(
        
        table: string, columns: (string | [string, string])[], {

        // Query
        where,
        // time
        period, interval,
        // Options
        relative, cache
        
    }: {
        // Database
        where?: string,
        // Time
        period: string,
        interval: string,
        // Options
        relative?: boolean,
        cache?: { id: string, duration?: string },
    }): Promise< TRetourStats<TDonnees> > {

        if (!debug && cache !== undefined) {
            const fromCache = await this.cache.get<TRetourStats<TDonnees>>(cache.id);
            if (fromCache !== null) {
                console.log("Using value from cache " + cache.id);
                return fromCache.value;
            }
        }

        // NOTE: On ne génère pas le timestamp via la bdd pour éviter les incohérences de timezone
        const periodTime = hInterval(period);
        if (periodTime === undefined) throw new Error(`Invalid period string: ` + period);
        const intervalTime = hInterval(interval);
        if (intervalTime === undefined) throw new Error(`Invalid interval string: ` + interval);
        const periodSec = Math.floor(periodTime / 1000);

        const startTime = scaleTime(Date.now() - periodTime, intervalTime); // Round start date to the specified interval
        const endTime = scaleTime(Date.now(), intervalTime);
        const stats: TRetourStats<TDonnees> = {
            graph: [],
            stats: {} as TDonnees,
            start: new Date(startTime),
            end: new Date(endTime),
            interval: intervalTime
        }

        let rows: TDonnees[];
        let previousRow: TObjetDonnees = {};
        
        const selector = statsCols(columns, relative ? 'SUM' : '');

        // Fetch data (initial point + variations)
        // Since values are relative, we will use stats.total as initialValues, 
        //      and then increment it to get the latest tota value
        ([[previousRow], rows] = await this.sql.query(`

            # Latest values before start time
            SELECT ${selector}
            FROM ${table}
            WHERE date < (NOW() - INTERVAL ${periodSec} SECOND) ${where ? 'AND ' + where : ''}
            ORDER BY date DESC 
            LIMIT 1;

            # First value for each peiod of time
            SELECT ${selector},
                FLOOR( UNIX_TIMESTAMP(date) * 1000 / ${intervalTime}) * ${intervalTime} as periodTime
            FROM ${table}
            WHERE (date BETWEEN (NOW() - INTERVAL ${periodSec} SECOND) AND NOW())
                ${where ? 'AND ' + where : ''}

            # In addition of the variations between start and end date, we take the latest values
            GROUP BY (date = (SELECT MAX(date) FROM core.NetworkStats)), periodTime
            ORDER BY date DESC;

        `) as [[TDonnees | undefined], TDonnees[]]);

        // Process
        if (rows.length === 0)
            return stats;
        if (previousRow === undefined)
            previousRow = {};

        rows.reverse();

        // Index entries by time
        const periods: { [periodTime: number]: TTimeStat<TDonnees> } = {};
        for (const { periodTime, ...row } of rows)
            periods[periodTime] = row;

        // Completion
        for (let time = startTime; time <= endTime; time += intervalTime) {

            const row = relative ? { ...previousRow, time } : { time };
            stats.graph.push(row);

            // No data for this period
            if (periods[time] === undefined)
                continue;
            
            for (const nom in periods[time]) {

                const value = periods[time][nom];

                row[nom] = (relative && typeof row[nom] === 'number')
                    ? row[nom] + value
                    : value;

            }

            previousRow = { ...row };
        }

        // Total = latest known values
        stats.stats = previousRow;

        // Check if the times selected from the database matches with the times iéterated from the completion
        if (debug) {
            for (const period in periods)
                if (!stats.graph.find( g => g.time.toString() === period )) {
                    console.warn(
                        `The timetamps selected from the database do not match with the one generated by the completion function`,
                        '\nStart date:', startTime, stats.start.toISOString(), ' End date:', endTime, stats.end.toISOString(),
                        '\nFrom database', Object.keys(periods).map(time => time + ' (' + new Date( parseInt(time) ).toISOString() + ')'),
                        '\nFrom completion (now - period ; now):', stats.graph.map(g => g.time + ' (' + new Date(g.time).toISOString() + ')')
                    );
                    throw new Error("Integrity check failed.");
                    
                }
                
            console.log(cache?.id, "Cumulative stats: total =", stats.stats, "rows =", rows, "periods =", periods, "stats =", stats);
        }

        if (cache !== undefined)
            await this.cache.set( cache.id, stats, cache.duration || interval );
        
        return stats;
    }
}