import type { Prisma, PrismaClient } from '@models/types';
import * as runtime from '@/var/prisma/runtime/library.js';

export type TWithStats = {
    $table: string,
    $key: string
} & {
    [key: string]: string // key => SQL
}

export type TSubset = (...a: any[]) => Prisma.ProspectContactLeadFindFirstArgs & {
    withStats?: TWithStats
}

export default class Facet<
    D extends {
        findMany(args?: any): Promise<any>
        findFirst(args?: any): Promise<any>
    },
    S extends TSubset,
    R
> {
    constructor(

        private readonly prisma: PrismaClient,

        private readonly delegate: D,
        private readonly subset: S,

        /* the **ONLY** line that changed ↓↓↓ */
        private readonly transform?: (
            row: runtime.Types.Result.GetResult<
                Prisma.$ProspectContactLeadPayload,
                ReturnType<S>,
                'findMany'
            >[number]
        ) => R,
    ) { }

    public async findMany(
        ...args: Parameters<S>
    ): Promise<R[]> {

        const { withStats, ...subset } = this.subset(...args);

        const results = await this.delegate.findMany(subset);

        // Load stats
        const stats = withStats 
            ? await this.fetchStats( withStats, results )
            : [];

        return results.map(row => this.transformResult(row, stats, withStats));
    }

    public async findFirst(
        ...args: Parameters<S>
    ): Promise<R | null> {

        const { withStats, ...subset } = this.subset(...args);

        const result = await this.delegate.findFirst(subset);

        const stats = withStats 
            ? await this.fetchStats( withStats, [result] )
            : [];

        return result ? this.transformResult(result, stats, withStats) : null;
    }

    private async fetchStats(
        { $table, $key, ...withStats }: TWithStats,
        results: any[]
    ): Promise<any[]> {

        const select = Object.entries(withStats).map(([key, sql]) =>    
            `(COALESCE((
                ${sql}
            ), 0)) as ${key}`
        );

        const stats = await this.prisma.$queryRawUnsafe(`
            SELECT ${$key}, ${select.join(', ')} 
            FROM ${$table} 
            WHERE ${$key} IN (
                ${results.map(r => "'" + r[ $key ] + "'").join(',')}
            )
        `);

        for (const stat of stats) {
            for (const key in stat) {
    
                if (key === $key)
                    continue;
    
                stat[key] = stat[key] ? parseInt(stat[key]) : 0;
            }
        }

        return stats;
    }

    private transformResult( result: any, stats: any[], withStats?: TWithStats ) {

        // Transform stats
        const resultStats = withStats
            ? stats.find(stat => stat[withStats.$key] === result[withStats.$key]) || {}
            : {};

        if (this.transform)
            result = this.transform(result);

        return {
            ...result,
            ...resultStats
        }
    }
}