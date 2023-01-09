/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import jwt from 'jsonwebtoken';
import type express from 'express';
import type http from 'http';

// Core
import Application from '@server/app';
import Service from '@server/app/service';
import { 
    default as Router, Request as ServerRequest,
} from '@server/services/router';
import { InputError, AuthRequired, Forbidden } from '@common/errors';

/*----------------------------------
- TYPES
----------------------------------*/

export type TUserRole = typeof UserRoles[number]

export type THttpRequest = express.Request | http.IncomingMessage;

/*----------------------------------
- CONFIG
----------------------------------*/

const LogPrefix = '[auth]'

export const UserRoles = ['USER', 'ADMIN', 'TEST', 'DEV'] as const

/*----------------------------------
- SERVICE CONVIG
----------------------------------*/

export type TConfig = {
    debug: boolean,
    logoutUrl: string,
    jwt: {
        // 2048 bits
        key: string,
        expiration: string,
    },
    google?: {
        web: {
            clientId: string,
            secret: string,
        },
        android: {
            clientId: string
        }
    }
}

export type THooks = {
    
}

/*----------------------------------
- SERVICE
----------------------------------*/
export default abstract class UsersManagementService<
    TUser extends {},
    TApplication extends Application,
    TJwtSession extends {} = {},
    TRequest extends ServerRequest<Router> = ServerRequest<Router>,
> extends Service<TConfig, THooks, TApplication> {

    public async register() {
       
    }

    public async start() {

    }

    public abstract login( ...args: any[] ): Promise<{ user: TUser, token: string }>;
    public abstract decodeSession( jwt: TJwtSession, req: THttpRequest ): Promise<TUser>;

    protected abstract displayName(user: TUser): string;
    protected abstract displaySessionName(session: TJwtSession): string;

    public async decode( req: THttpRequest, withData: true ): Promise<TUser | null>;
    public async decode( req: THttpRequest, withData?: false ): Promise<TJwtSession | null>;
    public async decode( req: THttpRequest, withData: boolean = false ): Promise<TJwtSession | TUser | null> {

        this.config.debug && console.log(LogPrefix, 'Decode:', { cookie: req.cookies['authorization'] });
        
        let token: string | undefined;
        if (('cookies' in req) && typeof req.cookies['authorization'] === 'string')
            token = req.cookies['authorization'];
        // Desktop app webview do not support cookie config, so wwe retrieve it from headers
        else if (typeof req.headers['authorization'] === 'string')
            token = req.headers['authorization'];

        if (token === undefined)
            return this.unauthorized(req);

        let session: TJwtSession;
        try {
            session = jwt.verify(token, this.config.jwt.key, { 
                maxAge: this.config.jwt.expiration 
            });
        } catch (error) {
            console.warn(LogPrefix, "Failed to decode jwt token:", token);
            return this.unauthorized(req);
        }

        // Return email only
        const sessionName = this.displaySessionName(session);
        if (!withData) {
            this.config.debug && console.log(LogPrefix, `Auth user ${sessionName} successfull. Return email only`);
            return session;
        }

        // Deserialize full user data
        this.config.debug && console.log(LogPrefix, `Deserialize user ${sessionName}`);
        const user = await this.decodeSession(session, req);
        this.config.debug && console.log(LogPrefix, `Deserialized user ${sessionName}:`, user);

        return user;    
    }

    public unauthorized( req: THttpRequest ) {

        if ('res' in req) {
            // If use auth failed, we remove the jwt token so we avoid to trigger the same auth error in the next request
            console.warn(LogPrefix, "Auth failed: remove authorization cookie");
            req.res?.clearCookie('authorization');
        }

        return null;
    }

    protected createSession( session: TJwtSession, request: TRequest ): string {

        this.config.debug && console.info(LogPrefix, `Creating new session:`, session);

        const token = jwt.sign(session, this.config.jwt.key);

        this.config.debug && console.info(LogPrefix, `Generated JWT token for session:` + token);

        request.res.cookie('authorization', token);

        return token;
    }

    public logout( request: TRequest ) {

        const user = request.user;
        if (!user) return;

        this.config.debug && console.info(LogPrefix, `Logout ${this.displayName(user)}`);
        request.res.clearCookie('authorization');
    }

    public check( request: TRequest, role: TUserRole, motivation?: string): TUser;
    public check( request: TRequest, role: false, motivation?: string): null;
    public check( request: TRequest, role: TUserRole | boolean = 'USER', motivation?: string): TUser | null {

        const user = request.user;

        this.config.debug && console.warn(LogPrefix, `Check auth, role = ${role}. Current user =`, user);

        if (user === undefined) {

            throw new Error(`request.user has not been decoded.`);

        // Shortcut: { auth: true } <=> { auth: 'USER' }
        } else if (role === true) {

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

            console.warn(LogPrefix, "Refusé: " + role + " pour " + this.displayName(user) + " (" + (user.roles ? user.roles.join(', ') : 'role inconnu') + ")");

            throw new Forbidden("You do not have sufficient permissions to access this resource.");

        } else {

            console.warn(LogPrefix, "Autorisé " + role + " pour " + this.displayName(user) + " (" + user.roles.join(', ') + ")");

        }

        return user;
    }

}