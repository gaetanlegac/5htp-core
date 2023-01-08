/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Core
import { 
    default as Router, Request as ServerRequest, Config as RouterConfig,
    RouterService
} from '@server/services/router';

import RequestValidator from './request';

/*----------------------------------
- TYPES
----------------------------------*/

type TRouterWithSchema<TAuthService extends AuthenticationRouterService> = Router<RouterConfig<{ auth: TAuthService }>>

/*----------------------------------
- SERVICE
----------------------------------*/
export default class AuthenticationRouterService<
    TUser extends {} = {}
> extends RouterService {

    public async register() {
        
    }

    public requestService( request: ServerRequest< TRouterWithSchema<this>> ): RequestValidator {
        return new RequestValidator( request );
    }
}