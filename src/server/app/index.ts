/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Core
import AppContainer from './container';
import ApplicationService, { AnyService } from './service';
import CommandsManager from './commands';
import ServicesContainer, { TRegisteredService, TServiceMetas } from './service/container';

// Built-in
import type { default as Router, Request as ServerRequest } from '@server/services/router';
export { default as Services } from './service/container';

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

export const Service = ServicesContainer;

/*----------------------------------
- FUNCTIONS
----------------------------------*/
export class Application extends ApplicationService<Config, Hooks, /* TODO: this ? */Application> {

    /*----------------------------------
    - PROPERTIES
    ----------------------------------*/

    public side = 'server' as 'server';
    public metas: TServiceMetas = {
        id: 'application',
        name: 'Application',
        parent: 'root',
        dependences: [],
        class: () => ({ 'default': Application })
    }

    // Shortcuts to ApplicationContainer
    public container = AppContainer;
    public env = AppContainer.Environment;
    public identity = AppContainer.Identity;

    // Status
    public debug: boolean = false;
    public launched: boolean = false;

    // All service instances by service id
    public allServices: {[serviceId: string]: AnyService} = {}

    /*----------------------------------
    - INIT
    ----------------------------------*/

    public constructor() {

        // Application itself doesnt have configuration
        // Configuration must be handled by application services
        super({}, {}, {}, {});

        this.app = this;

        // Gestion crash
        process.on('unhandledRejection', (error: any, promise: any) => {
            // We don't log the error here because it's the role of the app to decidehiw to log errors
            this.runHook('error', error);
        });
    }

    /*----------------------------------
    - COMMANDS
    ----------------------------------*/

    private commandsManager = new CommandsManager(this, { debug: true }, {}, this);

    public command( ...args: Parameters<CommandsManager["command"]> ) {
        return this.commandsManager.command(...args);
    }

    /*----------------------------------
    - LAUNCH
    ----------------------------------*/
    
    protected async start() {

        console.log(`5HTP Core`, process.env.npm_package_version);

        // Handle errors & crashs
        this.on('error', this.error.bind(this))

        this.debug && console.info(`[boot] Start services`);
        await this.startServices();

        this.debug && console.info(`[boot] App ready`);
        await this.ready();
        await this.runHook('ready');

        this.debug && console.info(`[boot] Application is ready.`);
        this.launched = true;
    }

    public async ready() {


    }

    // Default error handler
    public async error( e: Error ) {
        console.error( e );
    }

    public async shutdown() {

    }

    // TODO: move to servie class
    // So we can do public myService = Services.use() inside service class ded
    public async startServices() {

        const propsNames = Object.getOwnPropertyNames(this);
        
        for (const propName of propsNames) {

            // Don't check services prop as it will trigger an error (it's a proxy)
            // TODO: exclude all properties coming from the Service class itself
            if (propName === 'services' || typeof this[ propName ] !== 'object')
                continue;

            // Check if this property is a service registration
            const registered = this[ propName ] as TRegisteredService;
            if (registered?.type !== 'service')
                continue;

            // Instanciate the service
            const service = this.registerService( propName, registered );
            this[ propName ] = service;

            // Register commands
            if (service.commands)
                this.commandsManager.fromList( service.commands );

            // Start service
            await this.startService( propName, service );
        }

        // Check if any setup service has not been used
        const unused: string[] = []
        for (const serviceNS in ServicesContainer.registered)
            if (this.allServices[ serviceNS ] === undefined)
                unused.push(serviceNS);
        
        if (unused.length !== 0)
            console.warn(`${unused.length} services were setup, but are not used anywhere:`, 
                unused.join(', '));
    }

}

export default Application