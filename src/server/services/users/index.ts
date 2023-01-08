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

/*----------------------------------
- TYPES
----------------------------------*/

export type TUserRole = typeof UserRoles[number]

export type TJwtSession = { email: string }

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
    TApplication extends Application
> extends Service<TConfig, THooks, TApplication> {

    public async register() {
       
    }

    public async start() {

    }

    public abstract session( jwt: TJwtSession, req: THttpRequest ): Promise<TUser> ;

    public async decode( req: THttpRequest, withData: true ): Promise<TUser | null>;
    public async decode( req: THttpRequest, withData?: false ): Promise<string | null>;
    public async decode( req: THttpRequest, withData: boolean = false ): Promise<string | TUser | null> {

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

        // Not normal (could assume the JWT session is incompatible ??)
        if (!session.email) {
            console.warn(LogPrefix, "No email provided in JWT decrypted session:", session);
            return this.unauthorized(req);
        }

        // Return email only
        if (!withData) {
            this.config.debug && console.log(LogPrefix, `Auth user ${session.email} successfull. Return email only`);
            return session.email;
        }

        // Deserialize full user data
        this.config.debug && console.log(LogPrefix, `Deserialize user ${session.email}`);
        const user = await this.session(session, req);
        this.config.debug && console.log(LogPrefix, `Deserialized user ${session.email}:`, user);

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

}