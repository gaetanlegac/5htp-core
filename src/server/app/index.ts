/*----------------------------------
- DEPENDANCES
----------------------------------*/

import '../patch';

// Npm
import fs from 'fs-extra';

// Core
import ConfigParser, { TEnvConfig } from './config';

/*----------------------------------
- TYPES
----------------------------------*/

type THookName = 'ready' | 'cleanup' | 'error'
type THook = () => Promise<void>;

type TServiceOptions = {
    instanciate: boolean
}

abstract class AsyncService {
    public abstract loading: Promise<void> | undefined;
    public abstract load: () => Promise<void>;
}
abstract class Service {
    public abstract load: () => void;
}

interface TServiceClass {
    new(): AsyncService | Service;
}

declare global {
    namespace Core {
        interface Services { }
    }
    interface User { }
}

const servicesObj = {}

/*----------------------------------
- FUNCTIONS
----------------------------------*/
export class App {

    /*----------------------------------
    - PROPERTIES
    ----------------------------------*/

    // Context
    public hmr: __WebpackModuleApi.Hot | undefined = module.hot;

    public path = {
        root: process.cwd(),
        data: process.cwd() + '/var/data',
        log: process.cwd() + '/var/log',
        public: process.cwd() + '/public',
    }

    public pkg = fs.readJSONSync(this.path.root + '/package.json');

    // Status
    public launched: boolean = false;
    public loading: Promise<void>[] = [];
    public status = {
        services: false
    }

    public services: Core.Services = new Proxy( servicesObj, {
        get: (container, serviceId, receiver) => {

            if (!( serviceId in container ) && typeof serviceId === 'string')
                throw new Error(`Service not loaded: ${serviceId}`);

            return container[serviceId];
        }
    }) as Core.Services;

    public hooks: {[name in THookName]: THook[]} = {
        ready: [],
        cleanup: [],
        error: []
    }

    /*----------------------------------
    - INIT
    ----------------------------------*/

    public constructor() {

        // Gestion crash
        process.on('unhandledRejection', (error: any, promise: any) => {

            console.error("Unhandled promise rejection:", error);

            // Send email report
            if (this.isLoaded('console'))
                $.console.bugReport.server(error);
            else
                console.error(`Unable to send bug report: console service not loaded.`);

        });

        // Load config files
        const configParser = new ConfigParser( this.path.root );
        this.env = configParser.env();
        this.identity = configParser.identity();
    }

    // Configs
    public config!: Core.Config.Services;
    public identity: Core.Config.Identity;
    public env: TEnvConfig;
    public configure( config: Core.Config.Services) {
        this.config = config;
        console.log("Configure services with", this.config);
    }

    // Register a service
    public register<TServiceName extends keyof Core.Services>( 
        id: TServiceName, 
        Service: TServiceClass, 
        options: Partial<TServiceOptions> = {}
    ) {

        // Pas d'export default new Service pour chaque fichier de service,
        //  dissuaded'importer ms service sn'importe où, ce qui créé des références circulaires
        console.log(`[services] Registering service ${id} ...`);
        const service = options.instanciate !== false ? new Service() : Service;
        this.services[id as string] = service;

        if ('load' in service) {

            console.log(`[services] Starting service ${id} ...`);
            const loading = service.load()

            // Lorsque service.load est async, une propriété loading doit etre présente 
            //     De façon à ce que les autres services puissent savoir quand ce service est prêt
            if (('loading' in service) && (loading instanceof Promise)) {
                
                console.log(`[services] Waiting service ${id} to be fully loaded ...`);
                service.loading = loading.then(() => {
                    console.info(`[service] Service ${id} successfully started.`);
                }).catch(e => {
                    // Bug report via email
                    console.error(`[service] Error while starting the ${id} service:`, e);
                    e.message = `Start ${id} service: ` + e.message;
                    $.console.bugReport.server(e);
                });;

                this.loading.push(service.loading);
            }
        }
    }

    // Test if a service was registered
    public isLoaded( id: keyof Core.Services ) {
        return id in this.services;
    }

    public on( name: THookName, callback: THook ) {
        this.hooks[ name ].push( callback );
        return this;
    }

    public runHook( hookName: THookName ) {
        console.info(`[hook] Run all ${hookName} hook (${this.hooks.ready.length}).`);
        return Promise.all( 
            this.hooks.ready.map(
                cb => cb().catch(e => {
                    console.error(`[hook] Error while executing hook ${hookName}:`, e);
                })
            ) 
        ).then(() => {
            console.info(`[hook] Hooks ${hookName} executed with success.`);
        })
    }

    /*----------------------------------
    - LAUNCH
    ----------------------------------*/
    public async launch() {

        console.info(`[boot] Waiting for all services to be ready ...`);
        await Promise.all( this.loading );

        console.info(`[boot] Launching application ...`);
        await this.runHook('ready');

        // NOTE: Useless ?
        /*if (this.hmr)
            this.activateHMR();*/

        console.info(`[boot] Application is ready.`);
        
        this.launched = true;

    }

    private activateHMR() {

        if (!module.hot) return;

        console.info(`Activating HMR ...`);

        module.hot.accept();
        module.hot.accept( this.path.root + '/.cache/commun/routes.ts' );

        module.hot.addDisposeHandler((data) => {

            console.info(`Cleaning application ...`);

            // Services hooks
            for (const id in this.services) {
                const service = this.services[id]
                if (service.cleanup) {
                    console.info(`Cleaning ${id} service ...`);
                    service.cleanup();
                }
            }

            // Application specific hooks
            for (const callback of this.hooks.cleanup)
                callback();

            /*
            console.log("[nettoyage] Arrêt serveur socket ...");
            if (socket !== undefined)
                socket.serveur.close()

            console.log("[nettoyage] Reset du cache requêtes JSQL ...");
            QueryParser.clearCache();*/

        });
    }

}

const app = new App;
export const services = app.services;
export const $ = app.services;
export default app;