/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import jwt from 'jsonwebtoken';

// Core
import type { default as Router, Request as ServerRequest } from '@server/services/router';
import RequestService from '@server/services/router/request/service';
import { InputError, AuthRequired, Forbidden } from '@common/errors';

// Specific
import type AuthenticationRouterService from '.';
import type { default as UsersManagementService, TUserRole } from '..';

// Types
import type { TBasicUser } from '@server/services/auth';

/*----------------------------------
- TYPES
----------------------------------*/

/*----------------------------------
- MODULE
----------------------------------*/
export default class UsersRequestService<
    TUser extends TBasicUser
> extends RequestService {

    public constructor( 
        request: ServerRequest<Router>,
        public auth: AuthenticationRouterService,
        public users = auth.users,
    ) {
        super(request);
    }

    public login( email: string ) {
        return this.users.login( this.request, email );
    }

    public logout() {
        return this.users.logout( this.request );
    }

    // TODO: return user type according to entity
    public check( entity: string, role: TUserRole, motivation?: string): TUser;
    public check( entity: string, role: false, motivation?: string): null;
    public check( entity: string, role: TUserRole | boolean = 'USER', motivation?: string): TUser | null {
        return this.users.check( this.request, entity, role, motivation );
    }
}