/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm

// Core
import type Application from '@server/app';

import { 
    default as Router, Request as ServerRequest, TRoute,
    RouterService
} from '@server/services/router';

// Specific
import type { default as UsersService, TUserRole } from '..';
import UsersRequestService from './request';

/*----------------------------------
- TYPES
----------------------------------*/


/*----------------------------------
- CONFIG
----------------------------------*/

const LogPrefix = '[router][auth]';

/*----------------------------------
- SERVICE
----------------------------------*/
export default class AuthenticationRouterService<
    TUser extends {} = {},
    TRequest extends ServerRequest<Router> = ServerRequest<Router>,
> extends RouterService {

    public constructor( 
        public users: UsersService<TUser, Application>,
        public config = users.config
    ) {

        super();

    }

    public async register() {

        // Decode current user
        this.router.on('request', async (request: TRequest) => {

            // TODO: Typings. (context.user ?)
            const decoded = await this.users.decode( request.req, true);

            request.user = decoded || null;
        })

        // Check route permissions
        this.router.on('resolved', async (route: TRoute, request: TRequest) => {

            if (route.options.auth !== undefined)
                // TODO: How to pas the router type to router config ? Circular rfeerence ?
                this.users.check(request, route.options.auth);
        })
    }

    public requestService( request: TRequest ): UsersRequestService<TUser> {
        return new UsersRequestService( request, this );
    }   
}