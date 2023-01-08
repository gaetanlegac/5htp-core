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
import type { default as UsersManagementService, TUserRole, TJwtSession } from '..';

/*----------------------------------
- TYPES
----------------------------------*/

/*----------------------------------
- MODULE
----------------------------------*/
export default class UsersRequestService<
    TUser extends {}
> extends RequestService {

    public constructor( 
        request: ServerRequest<Router>,
        public auth: AuthenticationRouterService,
        public users = auth.users,
    ) {
        super(request);
    }

    public login( email: string ): string {
        return this.auth.login( this.request, email );
    }

    public logout() {
        return this.auth.logout( this.request );
    }

    public check( role: TUserRole, motivation?: string): TUser;
    public check( role: false, motivation?: string): null;
    public check( role: TUserRole | boolean = 'USER', motivation?: string): TUser | null {
        return this.auth.check( this.request, role, motivation );
    }
}