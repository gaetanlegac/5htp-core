/*----------------------------------
- DEPENDANCES
----------------------------------*/

import type { TValidatorDefinition } from './validator';
import type { SchemaValidators } from './validators';

/*----------------------------------
- EXPORT
----------------------------------*/

export { default as Schema } from './schema';
export type { TSchemaFields, TValidatedData } from './schema';

export const field = new Proxy<SchemaValidators>({} as SchemaValidators, {
    get: (target, propKey) => {
        return (...args: any[]) => ([ propKey, args ]);
    }
}) as unknown as {
    [K in keyof SchemaValidators]: SchemaValidators[K] extends (...args: any[]) => any
    ? (...args: Parameters<SchemaValidators[K]>) => TValidatorDefinition<K>
    : SchemaValidators[K];
};