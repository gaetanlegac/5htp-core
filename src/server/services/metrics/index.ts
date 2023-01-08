/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import locale from 'locale'
import dayjs from 'dayjs';
import got from 'got';

// Core
import Application, { Service } from '@server/app';
import type Router from '@server/services/router'
import type ServerRequest from '@server/services/router/request'
import type SQL from '@server/services/database';
import { arrayToObj } from '@common/data/tableaux';
import { Forbidden } from '@common/errors';

/*----------------------------------
- TYPES
----------------------------------*/

type IP = {
    // Identity
    ip: string,
    address: string,
    isp: string,
    country: string,
    iphub: number,
    // Status
    banned: Date,
    banReason?: string,
    updated?: Date
}

export type TrackingInfos = {
    user: User | null,
    ip: IP,
    country: string,
    langue: string
}

type TAssoChaines = { [id: string]: string }

/*----------------------------------
- SERVICE
----------------------------------*/

export type Config = {
    ga: {
        pub: string,
        prv: string,
        secret: string,
    }
}

export type Hooks = {

}

export default class TrackerService extends Service<Config, Hooks, Application> {

    public countries!: TAssoChaines;
    public langues!: TAssoChaines;
    public locales!: locale.Locales;

    public async register() {

    }

    public async start() {

        await this.indexData();



    }

    private async indexData() {

        // On n'oublie pas le tri alphabétique pour les listings
        /*const [countries, langues] = await this.app.sql`
            SELECT id, name FROM Countries ORDER BY name ASC;
            SELECT id, name FROM Locales ORDER BY name ASC;
        `().then(([listePays, listeLangues]) => [
            arrayToObj(listePays, { index: 'id', val: 'name' }),
            arrayToObj(listeLangues, { index: 'id', val: 'name' }),
        ]);

        this.countries = countries as TAssoChaines;
        this.langues = langues as TAssoChaines;
        this.locales = new locale.Locales(Object.keys(this.langues));*/
    }

    public async request( request: ServerRequest ) {
        return new TrackingRequestService(request, this);
    }
}

/*----------------------------------
- REQUEST SERVICE
----------------------------------*/
export class TrackingRequestService {

    // Services
    protected sql: SQL;

    // Caches
    private langue?: string;
    private ip?: IP;

    public constructor( 
        private request: ServerRequest,
        private tracker: TrackerService,
    ) {

        this.sql = tracker.sql;
      
    }

    public event( event: 'pageview' ) {

        // Ne compte pas les events lorsque mode dev ou admin
        if (this.app.env.profile == 'dev' ||
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
            user: user ? user.email : null,
            ip: ip.address,
            country,
            langue
        }
    }

    private getLangue() {

        const locales = new locale.Locales( this.request.headers["accept-language"] )
        const langue = locales.best( this.tracker.locales ).language.toUpperCase();

        return (langue in this.tracker.langues) ? langue : 'EN';

    }

    public async checkIP(): Promise<IP> {

        let address: string = this.request.ip;

        // Détection multicompte: 1 Compte max / IP
        console.log('Checking IP ...', address);
        const now: Date = new Date;
        
        let ip = await this.sql`SELECT * FROM logs.IP WHERE address = ${address}`.first();
        if (!ip) {

            console.log(`New IP`);

            ip = {
                address,
                meet: now,
                activity: now,  
                user_name: this.request.user?.name,
            }

            await this.retrieveScore(ip);

            this.sql.insert("logs.IP", ip);

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

            this.sql.update("logs.IP", ip, { address });

        }

        return ip;
    }

    private async retrieveScore(ip: IP) {

        console.log(ip.address, `Computing score ...`);

        // Retourner true pour autoriser
        const [iphubOk] = await Promise.all([

            // IPhub = le plus fiable en premier
            got.get('http://v2.api.iphub.info/ip/' + ip.address, {
                headers: {
                    'X-Key': app.config.http.security.iphub
                }
            }).json().then((iphub: any) => {

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
        if (!(ip.country in this.tracker.countries)) {
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