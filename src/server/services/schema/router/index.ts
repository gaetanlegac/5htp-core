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

type TRouterWithSchema<TAuthService extends SchemaRouterService> = Router<RouterConfig<{ auth: TAuthService }>>

/*----------------------------------
- SERVICE
----------------------------------*/
export default class SchemaRouterService<
    TUser extends {} = {}
> extends RouterService {

    /*----------------------------------
    - LIFECYCLE
    ----------------------------------*/

    public async start() {
        
    }

    public async ready() {

    }

    public async shutdown() {

    }

    /*----------------------------------
    - ROUTER SERVICE LIFECYCLE
    ----------------------------------*/

    public requestService( request: ServerRequest< TRouterWithSchema<this>> ): RequestValidator {
        return new RequestValidator( request, this.config );
    }
}