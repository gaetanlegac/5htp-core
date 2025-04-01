/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import type express from 'express';

// Core
import AppContainer from './container';
import ApplicationService, { AnyService, StartedServicesIndex } from './service';
import CommandsManager from './commands';
import ServicesContainer, { 
    ServicesContainer as ServicesContainerClass, 
    TServiceMetas 
} from './service/container';
import type { ServerBug } from './container/console';

// Built-in
import type { default as Router, Request as ServerRequest } from '@server/services/router';

export { default as Services } from './service/container';
export type { TEnvConfig as Environment } from './container/config';

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

export const Service = ServicesContainer;

// Without prettify, we don't get a clear list of the class properties
type Prettify<T> = {
    [K in keyof T]: T[K];
  } & {};

export type ApplicationProperties = Prettify<keyof Application>;

/*----------------------------------
- FUNCTIONS
----------------------------------*/
export abstract class Application<
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

    protected abstract registered: { 
        [serviceId: string]: {
            name: string,
            start: () => AnyService
        }
    };

    /*----------------------------------
    - INIT
    ----------------------------------*/

    public constructor() {

        const self = 'self' as unknown as Application;

        // Application itself doesnt have configuration
        // Configuration must be handled by application services
        super(self, {}, () => ({}), self);
        
        // Handle unhandled crash
        this.on('error', (e, request) => this.container.handleBug(e, "An error occured in the application", request));
        
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

        this.startServices();

        await this.ready();
        await this.runHook('ready');

        const startedTime = (Date.now() - startTime) / 1000;
        console.info(`[boot] Application launched in ${startedTime}s`);
        this.launched = true;
    }

    /*----------------------------------
    - ERROR HANDLING
    ----------------------------------*/

    // Default error handler
    public async reportBug( bug: ServerBug ) {

        console.error( bug.error );

    }

    private startServices() {

        // Print services
        console.log('----------------------------------');
        console.log('- SERVICES');
        console.log('----------------------------------');
        const printService = (service, level: number = 0) => {

            console.log('-' + '-'.repeat(level * 4), service.name, '(' + service.priority + ')');

            if (service.subservices) for (const subservice of service.subservices)
                printService(subservice, level + 1);
        }
        
        // Satrt services
        for (const serviceId in this.registered) {

            const service = this.registered[serviceId];
            printService(service, 0);
            const instance = service.start();
            this[service.name] = instance.getServiceInstance();
        }
    }

    protected async ready() {

        const processService = (service: AnyService) => {

            service.ready();
            
            // Subservices
            for (const serviceId in service.services)
                processService(service.services[serviceId]);
        }

        for (const serviceId in this.registered) {

            const registeredService = this.registered[serviceId];
            const service = this[registeredService.name];

            // TODO: move to router
            //  Application.on('service.ready')
            const routes = service.__routes;
            if (routes) for (const route of routes) { 

                const origController = route.controller;
                route.controller = (context: RouterContext) => {

                    // Filter data
                    const data = route.options.validate 
                        ? route.options.validate( context.schema )
                        : context.request.data;

                    // Run controller
                    return origController.bind( service )(
                        data, 
                        context
                    );
                }

                this.Router.controllers[ route.path ] = route;
            }

            processService(service);
        }
    }

}

export default Application