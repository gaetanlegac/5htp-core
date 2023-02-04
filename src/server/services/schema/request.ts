/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Core
import { 
    default as Router, RequestService, Request as ServerRequest
} from '@server/services/router';

import Schema, { TSchemaFields, TValidatedData } from '@common/validation/schema';

// Specific
import ServerSchemaValidator from '.';

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
export default class RequestValidator extends ServerSchemaValidator implements RequestService {

    public constructor(
        public request: ServerRequest<Router>,
        public config: TConfig,
        public router = request.router,
        public app = router.app
    ) {

        super();

    }

    public validate<TSchemaFieldsA extends TSchemaFields>( fields: TSchemaFieldsA ): TValidatedData<TSchemaFieldsA> {

        this.config.debug && console.log(LogPrefix, "Validate request data:", this.request.data);

        const schema = new Schema(fields);

        // Les InputError seront propagées vers le middleware dédié à la gestion des erreurs
        const { values } = schema.validate(
            this.request.data, 
            this.request.data, 
            {}, 
            {
                debug: this.config.debug,
                throwError: true,
                validateAll: true,
                validateDeps: false
            },
            []
        );

        return values;
    }

}