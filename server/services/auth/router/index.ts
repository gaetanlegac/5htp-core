/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm

// Core
import { 
    default as Router, Request as ServerRequest, Response as ServerResponse, TAnyRoute,
    RouterService, TRouterServiceArgs
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

    public constructor(...args: TRouterServiceArgs) {
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
        this.parent.on('resolved', async (
            route: TAnyRoute, 
            request: TRequest, 
            response: ServerResponse<Router>
        ) => {

            if (route.options.auth !== undefined) {

                // Basic auth check
                this.users.check(request, route.options.auth);

                // Redirect to logged page
                if (route.options.auth === false && request.user && route.options.redirectLogged)
                    response.redirect(route.options.redirectLogged);
            }
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