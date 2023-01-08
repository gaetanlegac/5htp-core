/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import got from 'got';

// Core
import { Forbidden } from '@common/errors';
import ServerRequest from '../router/request';

// App
import app from '@server/app';

/*----------------------------------
- TYPES
----------------------------------*/

/*----------------------------------
- MODULE
----------------------------------*/
export default class ProtectService {

    private tracking: TrackerService;

    public constructor( private request: ServerRequest ) {

        this.tracking = request.tracking;
        
    }

    public async bots(): Promise<IP> {

        // Récupération et varifications informations ip
        const ip = await this.tracking.checkIP();

        // Captcha
        /*if (this.request.method === 'POST')
            await this.captcha(this.request.data.captcha);*/

        return ip;
    }

    public async multiaccount(ip: IP, whitelist?: string) {

        // DON'T USE IT
        // People can't try the app when another user recommands it IRL
        // TODO: find another way to detect / avoid multi account
        //  Ex: Force login with Google only
        
        // If IP Address already used by another account
        /*const username = whitelist || this.request.user?.name;
        if (ip.user_name !== undefined && ip.user_name !== null && (username === undefined || username !== ip.user_name))
            throw new Forbidden(`
                I noticed you're trying to use multiple accounts.
                Only one account is allowed per IP address.
                If you think I'm wrong, please contact me at contact@gaetan-legac.fr and I will solve the problem.
            `);*/
    }

    public async botsAndMultiaccount( usernameWhitelist?: string ) {
        const ip = await this.bots();
        await this.multiaccount(ip, usernameWhitelist);
        return ip;
    }

    public async conflictOfInterest( username: string, request: ServerRequest ) {

        // NOTE: Don't base conflict of interest detection on IP

        // If the current ip have never been used by username

        /*const conflict = await sql`
            FROM UserLogin
            WHERE ip = ${request.ip} AND user = ${username}
        `.exists();

        return conflict;*/

        return false;

    }

    public async captcha(token?: string) {

        console.info(`Validation du captcha`, {
            secret: app.config.http.security.recaptcha.prv,
            response: token
        });

        if (!token)
            throw new Forbidden("Le captcha n'a pas été complété.");

        const res = await got.post('https://www.google.com/recaptcha/api/siteverify', {
            body: JSON.stringify({
                secret: app.config.http.security.recaptcha.prv,
                response: token, 
                remoteip: null
            })
        }).json()

        console.info(`Réponse captcha`, res);

        const ok = res.success || false;

        if (!ok) throw new Forbidden("Le captcha est incorrect");
    }

}