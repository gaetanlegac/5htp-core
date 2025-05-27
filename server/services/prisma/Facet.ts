
import type { Prisma } from '@models/types';
import * as runtime from '@/var/prisma/runtime/library.js';

export default class Facet<
    D extends {
        findMany(args?: any): Promise<any>
        findFirst(args?: any): Promise<any>
    },
    S extends (...a: any[]) => Prisma.ProspectContactLeadFindFirstArgs,
    R
> {
    constructor(
        private readonly delegate: D,
        private readonly subset: S,

        /* the **ONLY** line that changed ↓↓↓ */
        private readonly transform: (
            row: runtime.Types.Result.GetResult<
                Prisma.$ProspectContactLeadPayload,
                ReturnType<S>,
                'findMany'
            >[number]
        ) => R,
    ) { }

    public findMany(
        ...args: Parameters<S>
    ): Promise<R[]> {
        return this.delegate
            .findMany(this.subset(...args))
            .then(rows => rows.map(this.transform))
    }

    public findFirst(
        ...args: Parameters<S>
    ): Promise<R> {
        return this.delegate
            .findFirst(this.subset(...args))
            .then(this.transform)
    }
}