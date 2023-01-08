/*----------------------------------
- DEPENDANCES
----------------------------------*/

import '../patch';

// Npm
import fs from 'fs-extra';

// Core
import ConfigParser, { TEnvConfig } from './config';
import { default as Service, AnyService } from './service';
export { default as Service } from './service';
import type { default as Router, Request as ServerRequest } from '@server/services/router';

/*----------------------------------
- TYPES
----------------------------------*/

type Config = {

}

type Hooks = {
    ready: {
        args: [],
    },
    cleanup: {
        args: [],
    },
    error: {
        args: [error: Error, request?: ServerRequest<Router>],
    }
}

declare global {

    //interface Services { }    

    interface AppHooks {
       
    }

    interface User { }
}

/*----------------------------------
- FUNCTIONS
----------------------------------*/
export default abstract class Application extends Service<Config, Hooks, /* TODO: this ? */Application> {

    /*----------------------------------
    - PROPERTIES
    ----------------------------------*/

    public side = 'server' as 'server';

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
    public status = {
        services: false
    }

    private servicesList: AnyService[] = []

    /*----------------------------------
    - INIT
    ----------------------------------*/

    public env: TEnvConfig;
    public abstract identity: Config.Identity;

    public constructor() {

        // @ts-ignore: can't pass this to super
        super();

        // Gestion crash
        process.on('unhandledRejection', (error: any, promise: any) => {

            console.error("Unhandled promise rejection:", error);
            this.runHook('error', error);

        });

        // Load config files
        const configParser = new ConfigParser( this.path.root );
        this.env = configParser.env();
    }

    /*----------------------------------
    - REGISTER
    ----------------------------------*/

    // Require a service at file scope
    //  Only use in files where a service is strictly required 
    public use<ServiceType extends Service<{}, {}, this>>( serviceName: string ): ServiceType | undefined {
        return this[ serviceName ];
    }

    /*----------------------------------
    - LAUNCH
    ----------------------------------*/

    public async register() {

    }
    
    public async start() {

        console.info(`[boot] Waiting for all services to be ready ...`);
        await this.startServices()

        console.info(`[boot] Launching application ...`);
        await this.runHook('ready');

        console.info(`[boot] Run application-specific boot instructions ...`);
        await this.boot();

        console.info(`[boot] Application is ready.`);
        this.launched = true;

    }

    public registerService( service: AnyService ) {
        console.log(`[app] Register service`, service.constructor?.name);
        this.servicesList.push(service);
    }

    public async startServices() {

        console.log(`[app] Sorting ${this.servicesList.length} services by priority`);
        this.servicesList.sort((s1, s2) => s2.priority - s1.priority);

        console.log(`[app] Starting ${this.servicesList.length} services.`);
        for (const service of this.servicesList) {
            const serviceClassName = service.constructor?.name;
            console.log(`[app] Start service`, serviceClassName);

            if (service.register)
                service.register();

            if (service.start) {
                service.started = service.start();
                await service.started;
            }
        }

        console.log(`[app] All ${this.servicesList.length} services were started.`);
    }

    public abstract boot(): Promise<void>;

    // TODO: make it work
    private activateHMR() {

        if (!module.hot) return;

        console.info(`Activating HMR ...`);

        module.hot.accept();
        module.hot.accept( this.path.root + '/.cache/commun/routes.ts' );

        module.hot.addDisposeHandler((data) => {

            console.info(`Cleaning application ...`);

            // Services hooks
            /*for (const id in this.services) {
                const service = this.services[id]
                if (service.cleanup) {
                    console.info(`Cleaning ${id} service ...`);
                    service.cleanup();
                }
            }*/

            // Application specific hooks
            this.runHook('cleanup');

            /*
            console.log("[nettoyage] Arrêt serveur socket ...");
            if (socket !== undefined)
                socket.serveur.close()

            console.log("[nettoyage] Reset du cache requêtes JSQL ...");
            QueryParser.clearCache();*/

        });
    }

}