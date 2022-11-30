/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm: Serveurs
import bytes from 'bytes';
import express from 'express';
import http from 'http';
import https from 'https';
import path from 'path';
import cors from 'cors';
//var serveStatic = require('serve-static')

// Middlewares (npm)
import morgan from 'morgan';
import hpp from 'hpp'; // Protection contre la pollution des reuqtees http
import helmet from 'helmet'; // Diverses protections
import compression from 'compression';
import fileUpload from 'express-fileupload';
import expressStaticGzip from 'express-static-gzip';
import cookieParser from 'cookie-parser';
import * as csp from 'express-csp-header';

// Core
import app from '@server/app';
// Services
import '../router';  // force loading the service
import { Router } from '../router';

// Middlewaees (core)
import { MiddlewareFormData } from './multipart';

/*----------------------------------
- CONFIG
----------------------------------*/

export type HttpServiceConfig = {

    // Access
    domain: string,
    port: number,
    ssl: number,

    // Limitations / Load restriction
    upload: {
        maxSize: string // Expression package bytes
    },

    // Protections against bots
    security: {
        recaptcha: {
            prv: string,
            pub: string
        },
        iphub: string
    }
}

declare global {
    namespace Core {
        namespace Config {
            interface Services {
                http: HttpServiceConfig
            }
        }
    }
}

/*----------------------------------
- FUNCTION
----------------------------------*/
export default class HttpServer {

    public http: http.Server | https.Server;
    public express: express.Express;

    public router: Router;

    public config: HttpServiceConfig;
    public publicUrl: string;

    public constructor() {

        // Init
        this.config = app.config.http;
        this.publicUrl = app.env.name === 'local'
            ? 'http://localhost:' + this.config.port
            : ((this.config.ssl ? 'https' : 'http') + '://' + this.config.domain);

        // Configure HTTP server
        this.express = express();
        this.http = http.createServer(this.express);

        // Start HTTP Server
        this.router = app.services.router;
        app.on('cleanup', () => this.cleanup());
    }

    /*----------------------------------
    - HOOKS
    ----------------------------------*/
    public async load() {

        const routes = this.express

        /*----------------------------------
        - SECURITÉ DE BASE
        ----------------------------------*/

        // Config
        routes.set('trust proxy', 1); // Indique qu'on est sous le proxy apache
        // Diverses protections (dont le disable x-powered-by)
        routes.use(helmet());

        /*----------------------------------
        - FICHIERS STATIQUES
        ----------------------------------*/

        // Fichiers statiques: Eviter un maximum de middlewares inutiles
        // Normalement, seulement utile pour le mode production, 
        // Quand mode debug, les ressources client semblent servies par le dev middlewae
        // Sauf que les ressources serveur ne semblent pas trouvées par le dev-middleware
        routes.use('/public', cors());
        routes.use(
            '/public',
            expressStaticGzip( app.path.root + '/bin/public', {
                enableBrotli: true,
                serveStatic: {
                    setHeaders: function setCustomCacheControl(res, path) {

                        // Set long term cache, except for non-hashed filenames
                        /*if (__DEV__ || path.includes('/icons.')) {
                            res.setHeader('Cache-Control', 'public, max-age=0');
                        } else {
                            res.setHeader('Cache-Control', 'public, max-age=604800000'); // 7 Days
                        }*/
                        
                    }
                }
            }),
            (req, res) => {
                res.status(404).send();
            }
        );

        // Activation Gzip
        routes.use(compression());
 
        routes.use('/robots.txt', express.static( path.resolve(__dirname, 'public/robots.txt')) );

        routes.get("/ping", (req, res) => res.send("pong"));

        routes.all('*', morgan('short'));

        /*----------------------------------
        - SESSION & SECURITE
        ----------------------------------*/
        // https://expressjs.com/fr/advanced/best-practice-security.html
        // Protection contre la pollution des reuqtees http
        routes.use(hpp());

        // Init de req.cookies
        routes.use(cookieParser())

        /*----------------------------------
        - DÉCODEURS
        ----------------------------------*/
        routes.use(

            // Décodage des données post
            express.json({

                // NOTE: Encore nécessaire ? Les webhooks stripe & bitgo n'étant plus utilisés
                // Because Stripe needs the raw body, we compute it but only when hitting the Stripe callback URL.
                /*verify: function (req: Request, res: Response, buf: Buffer) {
                    if (req.originalUrl.startsWith('/api/paiement/impact/stripe'))
                        //req.rawBody = buf.toString();
                },*/

                // TODO: prendre en considération les upload de fichiers
                limit: '2mb'
            }),

            // Permet de receptionner les données multipart (req.body + req.files)
            // A mettre avant les services, car l'assignement de req.socket fait planter les uploads
            fileUpload({
                debug: false,
                limits: {
                    fileSize: bytes(this.config.upload.maxSize),
                    abortOnLimit: true
                },
            }),

            // Décodage des requetes multipart
            // Peut-être requis par le résolver api
            MiddlewareFormData
        );

        /*----------------------------------
        - PAGES / API
        ----------------------------------*/

        // TODO: Migrer dans app
        routes.use('/chrome', cors());
        // TODO: Trouver une solution pour n'autoriser les requetes que depuis l'application & dopamyn.io
        //      https://www.google.com/search?q=http+cors+from+android%7Cwindows%7Cdesktop%7Cmodile+app
        //routes.use('/auth', cors());

        routes.use(csp.expressCspHeader({
            directives: {
                'script-src': [csp.INLINE, csp.SELF, 
                    // Whitelist external js scripts
                    "https://www.googletagmanager.com/gtag/js",
                    "https://cdn.jsdelivr.net"
                ]
            }
        }));
        
        routes.use( this.router.middleware.bind( this.router ) );

        /*----------------------------------
        - BOOT SERVICES
        ----------------------------------*/

        /*
        // Précompilation des templates email
        await compilerEmails();

        // Chargement de la liste des pays et langues
        await GeoTracking.ChargerCache();

        await QueryParser.prebuildCache();*/
        // Si le HMR est activé, app sera englobée dans une autre instance express
        // Impossible donc de créer un serveur http ici, on le fera dans start.js
        console.info("Lancement du serveur web");
        this.http.listen(this.config.port, () => {
            console.info(`Serveur web démarré sur ${this.publicUrl}`);
        });

    }

    public async cleanup() {
        this.http.close();
    }
}

/*----------------------------------
- REGISTER SERVICE
----------------------------------*/
app.register('http', HttpServer);
declare global {
    namespace Core {
        interface Services {
            http: HttpServer;
        }
    }
}