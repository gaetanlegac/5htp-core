/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import jwt from 'jsonwebtoken';

// Core
import type Application from '@server/app';

import { 
    default as Router, Request as ServerRequest, TRoute,
    RouterService, Config as RouterConfig
} from '@server/services/router';
import { InputError, AuthRequired, Forbidden } from '@common/errors';

// Specific
import type { default as UsersService, TUserRole, TJwtSession } from '..';
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
    TRequest = ServerRequest<Router>
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
            request.user = await this.users.decode( request.req, true);
        })

        // Check route permissions
        this.router.on('resolved', async (route: TRoute, request: TRequest) => {

            if (route.options.auth !== undefined)
                // TODO: How to pas the router type to router config ? Circular rfeerence ?
                this.check(request, route.options.auth);
        })
    }

    public requestService( request: TRequest ): UsersRequestService<TUser> {
        return new UsersRequestService( request, this );
    }

    public login( request: TRequest, email: string ): string {

        this.config.debug && console.info(LogPrefix, `Authentification de ` + email);

        const session: TJwtSession = { email }

        const token = jwt.sign(session, this.config.jwt.key);

        this.config.debug && console.info(LogPrefix, `Generated JWT token: ` + token);

        request.res.cookie('authorization', token);

        return token;
    }

    public logout( request: TRequest ) {

        const user = request.user;
        if (!user) return;

        this.config.debug && console.info(LogPrefix, `Logout ${user.email}`);
        request.res.clearCookie('authorization');
    }

    public check( request: TRequest, role: TUserRole, motivation?: string): TUser;
    public check( request: TRequest, role: false, motivation?: string): null;
    public check( request: TRequest, role: TUserRole | boolean = 'USER', motivation?: string): TUser | null {

        const user = request.user;

        // Shortcut: { auth: true } <=> { auth: 'USER' }
        if (role === true) {

            role = 'USER';

        // No auth needed
        } else if (role === false) {

            return user;

        // Not connected
        } else if (user === null) {

            this.config.debug && console.warn(LogPrefix, "Refusé pour anonyme (" + request.ip + ")");
            throw new AuthRequired(motivation);
            
        // Insufficient permissions
        } else if (!user.roles.includes(role)) {

            console.warn(LogPrefix, "Refusé: " + role + " pour " + user.email + " (" + (user.roles ? user.roles.join(', ') : 'role inconnu') + ")");

            throw new Forbidden("You do not have sufficient permissions to access this resource.");

        } else {

            console.warn(LogPrefix, "Autorisé " + role + " pour " + user.email + " (" + user.roles.join(', ') + ")");

        }

        return user;
    }
}