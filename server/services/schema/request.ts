/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import zod from 'zod';
import { SomeType } from 'zod/v4/core';
 
// Core
import { 
    default as Router, RequestService, Request as ServerRequest
} from '@server/services/router';

// Ap
import { schema } from '@server/services/router/request/validation/zod';

/*----------------------------------
- SERVICE CONFIG
----------------------------------*/

const LogPrefix = `[router][validation]`;

export type TConfig = {
    debug?: boolean
}

/*----------------------------------
- SERVICE
----------------------------------*/
export default(
    request: ServerRequest<Router>,
    config: TConfig,
    router = request.router,
    app = router.app
) => ({

    ...schema,

    validate( fields: zod.ZodSchema | { [key: string]: zod.ZodSchema } ) {

        this.config.debug && console.log(LogPrefix, "Validate request data:", this.request.data);

        const schema = typeof fields === 'object' ? zod.object(fields) : fields;

        return schema.parse(this.request.data);
    },
})