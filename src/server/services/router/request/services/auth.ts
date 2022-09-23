/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import type express from 'express';
import type http from 'http';
import jwt from 'jsonwebtoken';

// Cre
import app, { $ } from '@server/app';
import { ErreurSaisie, AuthRequise, AccesRefuse } from '@common/errors';
import { TUserRole } from '@common/models';

/*----------------------------------
- TYPES
----------------------------------*/

import { User } from '@models';

import type ServerRequest from '@server/services/router/request'

type TJwtSession = { username: string }

const jwtConfig = app.config.auth.jwt;

/*----------------------------------
- MODULE
----------------------------------*/
export default class AuthService {

    protected request: ServerRequest;

    public constructor( request: ServerRequest ) {
        this.request = request;
    }
    
    public static async decode( req: express.Request | http.IncomingMessage, withData: true ): Promise<User | null>;
    public static async decode( req: express.Request | http.IncomingMessage, withData?: false ): Promise<string | null>;
    public static async decode( req: express.Request | http.IncomingMessage, withData: boolean = false ): Promise<string | User | null> {
        
        let token: string | undefined;
        if (('cookies' in req) && typeof req.cookies['authorization'] === 'string')
            token = req.cookies['authorization'];
        // Desktop app webview do not support cookie config, so wwe retrieve it from headers
        else if (typeof req.headers['authorization'] === 'string')
            token = req.headers['authorization'];

        if (token === undefined)
            return null;

        let session: TJwtSession;
        try {
            session = jwt.verify(token, jwtConfig.key, { maxAge: jwtConfig.expiration });
        } catch (error) {
            console.warn("Failed to decode jwt token:", token);
            return null;
        }

        if (!session.username)
            return null;

        if (!withData)
            return session.username;

        console.log(`[securite][auth] Déserialisation de l'utilisateur ${session.username}`);
        const user = await $.auth.getData('name = ' + $.sql.esc(session.username));
        if (user) {
             // Banni = déconnexion
            // Une erreur s'affichera à chaque tentatove de login
            if (user.banned) {
                req.res.clearCookie('authorization');
                throw new AccesRefuse("Your account has been suspended. If you think it's a mistake, please contact me: contact@gaetan-legac.fr.");
            }

        }

        return user;
    }

    public login(username: string): string {

        console.info(`Authentification de ` + username);

        const token = jwt.sign({ username: username }, jwtConfig.key);

        this.request.res.cookie('authorization', token);

        return token;
    }

    public logout() {

        const user = this.request.user;
        if (!user) return;

        console.info(`Logout ${user.name}`);
        this.request.res.clearCookie('authorization',);
        $.socket.disconnect(user.name, 'Logout');
    }

    public check(role: TUserRole, motivation?: string): User;
    public check(role: false, motivation?: string): null;
    public check(role: TUserRole | boolean = 'USER', motivation?: string): User | null {

        const user = this.request.user;

        if (role === true)  
            role = 'USER';

        if (role === false) {

            if (user !== null)
                throw new ErreurSaisie("You're already logged in.");

        } else if (role === 'DEV' && (process.env.environnement === 'local' || (user && user.roles.includes('ADMIN')))) {

            

        } else if (user === null) {

            console.warn("Refusé pour anonyme (" + this.request.ip + ")");

            throw new AuthRequise(motivation);

        } else if (!user.roles.includes(role)) {

            console.warn("Refusé: " + role + " pour " + user.name + " (" + (user.roles ? user.roles.join(', ') : 'role inconnu') + ")");

            throw new AccesRefuse("You do not have sufficient permissions to access this resource.");

        } else {

            console.warn("Autorisé " + role + " pour " + user.name + " (" + user.roles.join(', ') + ")");

        }

        return user;

    }
}