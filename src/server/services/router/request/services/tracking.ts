/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import locale from 'locale'
import dayjs from 'dayjs';
import got from 'got';

// Core
import { arrayToObj } from '@common/data/tableaux';
import { Forbidden } from '@common/errors';
import requete from '@server/data/ApiClient';
import app, { $ } from '@server/app';

// Models
import { IP, User } from '@models';

/*----------------------------------
- TYPES
----------------------------------*/

import type Request from '@server/services/router/request'

export type TrackingInfos = {
    user: User | null,
    ip: IP,
    country: string,
    langue: string
}

type TAssoChaines = { [id: string]: string }

/*----------------------------------
- TYPES
----------------------------------*/

export type TrackingServiceConfig = {
    ga: {
        pub: string,
        prv: string,
        secret: string,
    }
}

declare global {
    namespace Core {
        namespace Config {
            interface Services {
                tracking: TrackingServiceConfig
            }
        }
    }
}

/*----------------------------------
- SERVICES
----------------------------------*/
export default class TrackerService {

    /*----------------------------------
    - GLOBAL
    ----------------------------------*/
    public static countries: TAssoChaines;
    public static langues: TAssoChaines;
    public static locales: locale.Locales;

    public static async LoadCache() {

        // On n'oublie pas le tri alphabétique pour les listings
        const [countries, langues] = await $.sql`
            SELECT id, name FROM Countries ORDER BY name ASC;
            SELECT id, name FROM Locales ORDER BY name ASC;
        `().then(([listePays, listeLangues]) => [
            arrayToObj(listePays, { index: 'id', val: 'name' }),
            arrayToObj(listeLangues, { index: 'id', val: 'name' }),
        ]);

        TrackerService.countries = countries as TAssoChaines;
        TrackerService.langues = langues as TAssoChaines;
        TrackerService.locales = new locale.Locales(Object.keys(this.langues));

    }

    /*----------------------------------
    - INSTANCE
    ----------------------------------*/

    // Caches
    private langue?: string;
    private ip?: IP;

    public constructor( private request: Request ) {
      
    }

    public event( event: 'pageview' ) {

        // Ne compte pas les events lorsque mode dev ou admin
        if (app.env.profile == 'dev' ||
            (this.request.user && this.request.user.roles.includes('ADMIN'))
        ) 
            return;

        console.log(`[router][request] Send GA event ${event}`);
        /*got.post(`https://www.google-analytics.com/mp/collect`
            + `?measurement_id=${app.config.tracking.ga.pub}`
            + `&api_secret=${app.config.tracking.ga.secret}`, {

            body: JSON.stringify({
                client_id: app.config.tracking.ga.prv,
                events: [{
                    name: 'pageview',
                    params: {},
                }]
            })
        })*/
            
    }

    public async infos(): Promise<TrackingInfos> {

        if (this.langue === undefined)
            this.langue = this.getLangue();

        if (this.ip === undefined)
            this.ip = await this.checkIP();

        return {
            user: this.request.user || null,
            langue: this.langue,
            country: this.ip.country,
            ip: this.ip
        }
    }

    public static values({ user, ip, langue, country }: TrackingInfos) {
        return {
            user: user ? user.name : null,
            ip: ip.address,
            country,
            langue
        }
    }

    private getLangue() {

        const locales = new locale.Locales( this.request.headers["accept-language"] )
        const langue = locales.best( TrackerService.locales ).language.toUpperCase();

        return (langue in TrackerService.langues) ? langue : 'EN';

    }

    public async checkIP(): Promise<IP> {

        let address: string = this.request.ip;

        // Détection multicompte: 1 Compte max / IP
        console.log('Checking IP ...', address);
        const now: Date = new Date;
        
        let ip = await $.sql`SELECT * FROM logs.IP WHERE address = ${address}`.first();
        if (!ip) {

            console.log(`New IP`);

            ip = {
                address,
                meet: now,
                activity: now,
                user_name: this.request.user?.name,
            }

            await this.retrieveScore(ip);

            $.sql.insert("logs.IP", ip);

        // Nouvelle IP
        } else {

            console.log(`Existing IP`, address, ip.banned);

            // Déjà banni
            if (ip.banned)
                throw new Forbidden(`Banned for the following reason: ` + ip.banReason);

            // Données expirées
            const tempsDepuisDerniereMaj = dayjs().diff(ip.dateMaj, 'day');
            if (tempsDepuisDerniereMaj >= 7) {
                console.log(`Dernière màj il y a ` + tempsDepuisDerniereMaj + ' jours');
                await this.retrieveScore(ip);
            }

            ip.activity = now;

            $.sql.update("logs.IP", ip, { address });

        }

        return ip;
    }

    private async retrieveScore(ip: IP) {

        console.log(ip.address, `Computing score ...`);

        // Retourner true pour autoriser
        const [iphubOk] = await Promise.all([

            // IPhub = le plus fiable en premier
            requete.get('http://v2.api.iphub.info/ip/' + ip.address, {
                headers: {
                    'X-Key': app.config.http.security.iphub
                }
            }).then((res) => res.data).then((iphub: any) => {

                ip.iphub = iphub.block;
                ip.country = iphub.countryCode;
                ip.isp = iphub.isp;

                console.log(ip.address, "IpHub:", iphub);

                /*
                    block: 0 - Residential or business IP (i.e. safe IP)
                    block: 1 - Non-residential IP (hosting provider, proxy, etc.)
                    block: 2 - Non-residential & residential IP (warning, may flag innocent people)
                */
                return ip.iphub !== 1;

            })

        ]);

        // Impossible d'avoir le country = douteux
        // NOTE: Pour Iphub, ZZ = inconnu
        if (!(ip.country in TrackerService.countries)) {
            ip.banned = new Date;
            ip.banReason = "Invalid location: " + ip.country;
        // Considéré comme suspect par iphub etou getipintel
        } else if (!(iphubOk)) {
            ip.banned = new Date;
            ip.banReason = "Suspicious activity on your network";
        }

        ip.updated = new Date;
    }

}