/*----------------------------------
- DEPENDANCES
----------------------------------*/

import type { TValidatorDefinition } from './validator';
import type Validators from './validators';

/*----------------------------------
- EXPORT
----------------------------------*/

export { default as Schema } from './schema';
export type { TSchemaFields, TValidatedData } from './schema';

export const field = new Proxy<Validators>({} as Validators, {
    get: (target, propKey) => {
        return (...args: any[]) => ([ propKey, args ]);
    }
}) as unknown as {
    [K in keyof Validators]: Validators[K] extends (...args: any[]) => any
    ? (...args: Parameters<Validators[K]>) => TValidatorDefinition<K>
    : Validators[K];
};