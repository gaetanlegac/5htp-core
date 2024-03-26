/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Core
import AppContainer from './container';
import ApplicationService, { StartedServicesIndex } from './service';
import CommandsManager from './commands';
import ServicesContainer, { 
    ServicesContainer as ServicesContainerClass, 
    TRegisteredService, 
    TServiceMetas 
} from './service/container';
import type { ServerBug } from './container/console';

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
export class Application<
    TServicesContainer extends ServicesContainerClass = ServicesContainerClass
> extends ApplicationService<Config, Hooks, /* TODO: this ? */Application, {}> {

    public app!: this;
    public servicesContainer!: TServicesContainer;

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

    /*----------------------------------
    - INIT
    ----------------------------------*/

    public constructor() {

        const self = 'self' as unknown as Application;

        // Application itself doesnt have configuration
        // Configuration must be handled by application services
        super(self, {}, {}, self);
        
        // Handle unhandled crash
        this.on('error', e => this.container.handleBug(e, "An error occured in the application"));
        
        process.on('unhandledRejection', (error: any, promise: any) => {
            console.log("unhandledRejection");
            // We don't log the error here because it's the role of the app to decidehiw to log errors
            this.runHook('error', error);
        });

        // We can't pass this in super so we assign here
        this.parent = this;
        this.app = this;
        
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
    
    public async start() {

        console.log("Build date", BUILD_DATE);
        console.log("Core version", CORE_VERSION);
        const startTime = Date.now();

        console.info(`[boot] Start services`);
        await this.startServices();
        this.debug && console.info(`[boot] Services are ready`);

        await this.ready();
        await this.runHook('ready');

        const startedTime = (Date.now() - startTime) / 1000;
        console.info(`[boot] Application launched in ${startedTime}s`);
        this.launched = true;
    }

    public async ready() {


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
            if (propName === 'services' || this[ propName ] === undefined)
                continue;

            // Check if this property is a service registration
            const service = this[ propName ] as TRegisteredService;
            const isService = (
                service instanceof ApplicationService
                ||
                (
                    typeof service === 'function'
                    &&
                    service.serviceInstance instanceof ApplicationService
                )
            )
            if (!isService)
                continue;

            // Instanciate the service
            this.bindService( propName, service );

            // Register commands
            if (service.commands)
                this.commandsManager.fromList( service.commands );

            // Start service
            await this.startService( propName, service );
        }

        // Check if any setup service has not been used
        const unused: string[] = []
        for (const serviceNS in ServicesContainer.registered)
            if (ServicesContainer.allServices[ serviceNS ] === undefined)
                unused.push(serviceNS);
        
        if (unused.length !== 0)
            console.warn(`${unused.length} services were setup, but are not used anywhere:`, 
                unused.join(', '));
    }

    /*----------------------------------
    - ERROR HANDLING
    ----------------------------------*/
    // Default error handler
    public async reportBug( bug: ServerBug ) {

        console.error( bug.error );

    }

}

export default Application