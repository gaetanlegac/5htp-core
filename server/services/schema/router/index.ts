/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Core
import { 
    default as Router, Request as ServerRequest, Config as RouterConfig,
    RouterService
} from '@server/services/router';

import RequestValidator, { TConfig } from '../request';

/*----------------------------------
- TYPES
----------------------------------*/


/*----------------------------------
- SERVICE
----------------------------------*/
export default class SchemaRouterService<
    TUser extends {} = {}
> extends RouterService {

    public requestService( request: ServerRequest ): RequestValidator {
        return new RequestValidator( request, this.config );
    }
}