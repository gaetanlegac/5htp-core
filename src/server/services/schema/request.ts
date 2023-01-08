/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Core
import { 
    default as Router, RequestService, Request as ServerRequest
} from '@server/services/router';

import ServerSchemaValidator from '.';

import Schema, { TSchemaFields, TValidatedData } from '@common/validation/schema';

/*----------------------------------
- TYPES
----------------------------------*/

/*----------------------------------
- SERVICE
----------------------------------*/
export default class RequestValidator extends ServerSchemaValidator implements RequestService {

    public constructor(
        public request: ServerRequest<Router>,
        public router = request.router,
        public app = router.app
    ) {

        super();

    }

    public validate<TSchemaFieldsA extends TSchemaFields>( fields: TSchemaFieldsA ): TValidatedData<TSchemaFieldsA> {

        console.log("Validate request data:", this.request.data);

        const schema = new Schema(fields);

        // Les InputError seront propagées vers le middleware dédié à la gestion des erreurs
        const { values } = schema.validate(
            this.request.data, 
            this.request.data, 
            {}, 
            {
                critique: true,
                validationComplete: true,
                avecDependances: false
            },
            []
        );

        return values;
    }

}