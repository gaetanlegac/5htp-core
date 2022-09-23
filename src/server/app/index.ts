/*----------------------------------
- DEPENDANCES
----------------------------------*/

import '../patch';

// Npm
import fs from 'fs-extra';

// Core
import loadConfig, { TEnvConfig } from './config';

/*----------------------------------
- TYPES
----------------------------------*/

type THookName = 'ready' | 'cleanup' | 'error'
type THook = () => void;

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
    
    // Configs
    public config!: Core.Config.Services;
    public identity: Core.Config.Identity;
    public env: TEnvConfig;

    public launched: boolean = false;

    public services: Core.Services = new Proxy( servicesObj, {
        get: (container, serviceId, receiver) => {

            if (!( serviceId in container ) && typeof serviceId === 'string')
                throw new Error(`Service not loaded: ${serviceId}`);

            return container[serviceId];
        }
    }) as Core.Services;

    public loading: Promise<void>[] = [];

    public status = {
        services: false
    }

    public hmr: __WebpackModuleApi.Hot | undefined = module.hot;

    public hooks: {[name in THookName]: THook[]} = {
        ready: [],
        cleanup: [],
        error: []
    }

    public path = {
        root: process.cwd(),
        data: process.cwd() + '/var/data',
        log: process.cwd() + '/var/log',
        public: process.cwd() + '/public',
    }

    public pkg = fs.readJSONSync(this.path.root + '/package.json');

    /*----------------------------------
    - INIT
    ----------------------------------*/

    public constructor() {
        // Load config files
        ({
            env: this.env,
            identity: this.identity
        } = loadConfig(this.path.root));
    }

    /*----------------------------------
    - HOOKS
    ----------------------------------*/

    public configure( configModule: (envName: Core.Config.EnvName) => Core.Config.Services) {
        this.config = configModule( this.env.name );
        console.log("Configure services with", this.config);
    }

    public register( id: string, Service: TServiceClass, options: Partial<TServiceOptions> = {}) {

        // Pas d'export default new Service pour chaque fichier de service,
        //  dissuaded'importer ms service sn'importe où, ce qui créé des références circulaires
        console.log(`Launching service ${id} ...`, Service);
        const service = options.instanciate !== false ? new Service() : Service;
        this.services[id] = service;

        // Lorsque service.load est async, une propriété loading doit etre présente 
        //     De façon à ce que les autres services puissent savoir quand ce service est prêt
        if ('loading' in service) {
            service.loading = service.load();
            this.loading.push(service.loading);
        } else if ('load' in service)
            service.load();
    }

    public on( name: THookName, callback: THook ) {
        this.hooks[ name ].push( callback );
        return this;
    }

    /*----------------------------------
    - LAUNCH
    ----------------------------------*/
    public async launch() {

        console.info(`Waiting for services to be ready ...`);
        await Promise.all( this.loading );

        console.info(`Launching application ...`);
        await Promise.all( this.hooks.ready.map(cb => cb()) );

        if (this.hmr)
            this.activateHMR();

        console.info(`Application is ready.`);

        this.launched = true;

    }

    private activateHMR() {

        return;
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