/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import express from 'express';

// Core
import { AccesRefuse } from '@common/errors';
import request from '@server/data/ApiClient';
import ServerRequest from '..';
import TrackerService from './tracking';

// App
import app from '@server/app';
import { IP } from '@models';

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
            throw new AccesRefuse(`
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

    }

    public async captcha(token?: string) {

        console.info(`Validation du captcha`, {
            secret: app.config.http.security.recaptcha.prv,
            response: token
        });

        if (!token)
            throw new AccesRefuse("Le captcha n'a pas été complété.");

        const res = await request.post('https://www.google.com/recaptcha/api/siteverify', {}, {
            params: {
                secret: app.config.http.security.recaptcha.prv,
                response: token, 
                remoteip: null
            },
            debug: false
        }).then(res => res.data)

        console.info(`Réponse captcha`, res);

        const ok = res.success || false;

        if (!ok) throw new AccesRefuse("Le captcha est incorrect");
    }

}