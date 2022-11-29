/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import type express from 'express';
import type http from 'http';
import jwt from 'jsonwebtoken';

// Cre
import app, { $ } from '@server/app';
import { InputError, AuthRequired, Forbidden } from '@common/errors';
import type { TUserRole } from '@server/services/auth/base';

/*----------------------------------
- TYPES
----------------------------------*/

import type ServerRequest from '@server/services/router/request'

type TJwtSession = { email: string }

type TRequest = express.Request | http.IncomingMessage;

/*----------------------------------
- CONFIG
----------------------------------*/

const config = app.config.auth;

const LogPrefix = '[router][auth]';

/*----------------------------------
- MODULE
----------------------------------*/
export default class AuthService {

    protected request: ServerRequest;

    public constructor( request: ServerRequest ) {
        this.request = request;
    }
    
    public static async decode( req: TRequest, withData: true ): Promise<User | null>;
    public static async decode( req: TRequest, withData?: false ): Promise<string | null>;
    public static async decode( req: TRequest, withData: boolean = false ): Promise<string | User | null> {

        config.debug && console.log(LogPrefix, 'Decode:', { cookie: req.cookies['authorization'] });
        
        let token: string | undefined;
        if (('cookies' in req) && typeof req.cookies['authorization'] === 'string')
            token = req.cookies['authorization'];
        // Desktop app webview do not support cookie config, so wwe retrieve it from headers
        else if (typeof req.headers['authorization'] === 'string')
            token = req.headers['authorization'];

        if (token === undefined)
            return this.authFailed(req);

        let session: TJwtSession;
        try {
            session = jwt.verify(token, config.jwt.key, { maxAge: config.jwt.expiration });
        } catch (error) {
            console.warn(LogPrefix, "Failed to decode jwt token:", token);
            return this.authFailed(req);
        }

        // Not normal (could assume the JWT session is incompatible ??)
        if (!session.email) {
            console.warn(LogPrefix, "No email provided in JWT decrypted session:", session);
            return this.authFailed(req);
        }

        // Return email only
        if (!withData) {
            config.debug && console.log(LogPrefix, `Auth user ${session.email} successfull. Return email only`);
            return session.email;
        }

        // Deserialize full user data
        config.debug && console.log(LogPrefix, `Deserialize user ${session.email}`);
        const user = await $.auth.getData('email = ' + $.sql.esc(session.email));
        if (user) {

            config.debug && console.log(LogPrefix, `Deserialized user ${session.email}:`, user);

             // Banni = déconnexion
            // Une erreur s'affichera à chaque tentatove de login
            if (user.banned) {

                this.authFailed(req);
                throw new Forbidden("Your account has been suspended. If you think it's a mistake, please contact me: contact@gaetan-legac.fr.");
            }

        }

        return user;    
    }

    private static authFailed( req: TRequest ) {

        if ('res' in req) {
            // If use auth failed, we remove the jwt token so we avoid to trigger the same auth error in the next request
            console.warn(LogPrefix, "Auth failed: remove authorization cookie");
            req.res?.clearCookie('authorization');
        }

        return null;
    }

    public login( email: string ): string {

        config.debug && console.info(LogPrefix, `Authentification de ` + email);

        const token = jwt.sign({ email }, config.jwt.key);

        config.debug && console.info(LogPrefix, `Generated JWT token: ` + token);

        this.request.res.cookie('authorization', token);

        return token;
    }

    public logout() {

        const user = this.request.user;
        if (!user) return;

        config.debug && console.info(LogPrefix, `Logout ${user.email}`);
        this.request.res.clearCookie('authorization');
        $.socket.disconnect(user.email, 'Logout');
    }

    public check(role: TUserRole, motivation?: string): User;
    public check(role: false, motivation?: string): null;
    public check(role: TUserRole | boolean = 'USER', motivation?: string): User | null {

        const user = this.request.user;

        if (role === true)  
            role = 'USER';

        // First layer control
        if (role === false) {

            if (user !== null)
                throw new InputError("You're already logged in.");

        } else if (role === 'DEV' && (process.env.environnement === 'local' || (user && user.roles.includes('ADMIN')))) {

            // It's a bypass
            return user;

        } else if (user === null) {

            config.debug && console.warn(LogPrefix, "Refusé pour anonyme (" + this.request.ip + ")");
            throw new AuthRequired(motivation);

        } else {
            
            // Second layer control
            if (!user.roles.includes(role)) {

                console.warn(LogPrefix, "Refusé: " + role + " pour " + user.email + " (" + (user.roles ? user.roles.join(', ') : 'role inconnu') + ")");

                throw new Forbidden("You do not have sufficient permissions to access this resource.");

            } else {

                console.warn(LogPrefix, "Autorisé " + role + " pour " + user.email + " (" + user.roles.join(', ') + ")");

            }

            return user;
        }
    }
}