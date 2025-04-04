/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm

// Core
import { 
    default as Router, Request as ServerRequest, TAnyRoute,
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

    /*----------------------------------
    - LIFECYCLE
    ----------------------------------*/

    public users: UsersService;

    public constructor(...args) {
        super(...args);

        this.users = this.config.users;
    }

    protected async ready() {

        // Decode current user
        this.parent.on('request', async (request: TRequest) => {

            // TODO: Typings. (context.user ?)
            const decoded = await this.users.decode( request.req, true);

            request.user = decoded || null;
        })

        // Check route permissions
        this.parent.on('resolved', async (route: TAnyRoute, request: TRequest) => {

            if (route.options.auth !== undefined)
                // TODO: How to pas the router type to router config ? Circular rfeerence ?
                this.users.check(request, route.options.auth);
        })
    }

    protected async shutdown() {

    }

    /*----------------------------------
    - ROUTER SERVICE LIFECYCLE
    ----------------------------------*/

    public requestService( request: TRequest ): UsersRequestService<TUser> {
        return new UsersRequestService( request, this );
    }   
}