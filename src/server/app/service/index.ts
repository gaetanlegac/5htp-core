/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Specific
import type { Application } from "..";
import type { Command } from "../commands"; 
import type { TServiceMetas, TRegisteredServicesIndex, TRegisteredService } from './container';
import ServicesContainer from './container';

/*----------------------------------
- TYPES: OPTIONS
----------------------------------*/

export type AnyService<TSubServices extends StartedServicesIndex = StartedServicesIndex> = 
    Service<{}, {}, Application, TSubServices>

type TServiceConfig = {
    debug?: boolean
}

export type { TRegisteredServicesIndex, TRegisteredService } from './container';

/*----------------------------------
- TYPES: HOOKS
----------------------------------*/

export type THookCallback<THookArgs extends THookOptions> = (...args: THookArgs["args"]) => Promise<void>;

type THooksList = {
    [hookName: string]: THookOptions
}

type THookOptions = {
    args: any[]
}

export type THooksIndex<THooks extends THooksList> = {[name in keyof THooks]?: THookCallback< THooks[name] >[]}

export type StartedServicesIndex = {
    [serviceId: string]: AnyService
}

type TServiceUseOptions = {
    optional?: boolean
}

/*----------------------------------
- CONFIG
----------------------------------*/

const LogPrefix = '[service]';

/*----------------------------------
- CLASS
----------------------------------*/
export default abstract class Service<
    TConfig extends TServiceConfig, 
    THooks extends THooksList,
    TApplication extends Application,
    TServicesIndex extends StartedServicesIndex
> {

    public started?: Promise<void>;
    public status: 'stopped' | 'starting' | 'running' | 'paused' = 'stopped';

    public commands?: Command[];
    public metas!: TServiceMetas;
    public bindings: string[] = []

    public app: TApplication;

    public constructor( 
        public parent: AnyService | 'self', 
        public config: TConfig,
        // Make this argument appear as instanciated sercices index
        // But actually, Setup.use returns a registered service, not yet launched
        services: TServicesIndex,
        app: TApplication | 'self'
    ) {

        if (this.parent === 'self') 
            this.parent = this;

        this.app = app === 'self'
            ? this as unknown as TApplication
            : app

        // Instanciate subservices
        this.bindServices( services );
        
    }

    public getServiceInstance() {
        return this;
    }

    /*----------------------------------
    - LIFECYCLE
    ----------------------------------*/

    public async launch() {

        // Instanciate subservices
        for (const localName in this.services)
            await this.startService( localName, this.services[localName] );

        // Start service
        if (this.start)
            await this.start();

        // Bind app events
        this.app.on('ready', this.ready.bind(this))
        this.app.on('shutdown', this.shutdown.bind(this))

    }

    protected abstract start(): Promise<void>;

    protected abstract ready(): Promise<void>;

    protected abstract shutdown(): Promise<void>;

    /*----------------------------------
    - SUBSERVICES
    ----------------------------------*/

    public registered: TRegisteredServicesIndex = {} as TRegisteredServicesIndex;

    public services: TServicesIndex = {} as TServicesIndex;
    
    /*new Proxy({}, {
        get: (target, prop, recever) => {
            if (!( prop in target )) {
                
                throw new Error(`You made reference to the "${prop}" service, but this one hasn't been loaded or started yet. 
                    Registered services: ${Object.keys(this.services).join(', ')} ; 
                    Loaded services: ${Object.keys(this.services).join(', ')}
                `);
            }
        }
    }) as TRegisteredServicesIndex*/

    // this.use immediatly instanciate the subservice for few reasons:
    // - The subservice instance can be accesses from another service in the constructor, no matter the order of loading of the services
    // - Consistency: the subserviuce proprties shouldn't be assogned to two different values according depending on the app lifecycle
    // Don't throw errors here since process.on('unhandledRejection') has not been configurated at this step (constructor ran after properties initialization)
    public use<
        TInstalledServices extends this["app"]["servicesContainer"]["allServices"],
        TServiceId extends keyof TInstalledServices,
        TServiceClass extends TInstalledServices[TServiceId],
        TSubServices extends TServiceClass["services"],
    >( 
        serviceId: TServiceId, 
        subServices?: TSubServices,
        serviceUseOptions: TServiceUseOptions = {}
    ): (
        // We can't pass the services types as a generic to TServiceClass
        // So we overwrite the services property
        ReturnType< TServiceClass["getServiceInstance"] >
        &
        {
            new (...args: any[]): TServiceClass["getServiceInstance"] & { services: TSubServices },
            services: TSubServices
        }
        /*Omit<TServiceClass, 'services'> & {
            services: TSubServices
        }*/
    ) {

        // Check of the service has been configurated
        const registered = ServicesContainer.registered[ serviceId ];
        if (registered === undefined) { 
            if (serviceUseOptions.optional)
                return undefined;
            else {
                console.error(`Unable to use service "${serviceId}": This one hasn't been setup.`);
                process.exit(1);
            }
        }

        // Bind subservices
        if (subServices !== undefined)
            registered.subServices = {
                ...registered.subServices,
                ...subServices
            };

        // Check if not already instanciated
        const existing = ServicesContainer.allServices[ serviceId ];
        if (existing !== undefined) {
            console.info("Service", serviceId, "already instanciated through another service.");
            existing.bindServices( registered.subServices );
            return existing;
        }

        // Instanciate
        console.log(`[app] Load service`, registered.metas.id);
        let ServiceClass;
        try {
            ServiceClass = registered.metas.class().default;
        } catch (error) {
            console.error("Failed to get the class of the", registered.metas.id, "service:", error);
            process.exit(1);
        }

        // Create class instance
        this.config.debug && console.log(`[app] Instanciate service`, registered.metas.id);
        let service;
        try {
            service = new ServiceClass(
                this, 
                registered.config, 
                registered.subServices, 
                this.app || this
            )
        } catch (error) {
            console.error("Failed to instanciate class of the", registered.metas.id, "service:", error);
            process.exit(1);
        }

        // Hande custom instance getter (ex: SQL callable class)
        this.config.debug && console.log(`[app] Get service instance for`, registered.metas.id);
        let serviceInstance;
        try {
            serviceInstance = service.getServiceInstance();
        } catch (error) {
            console.error("Failed to get service instance for the ", registered.metas.id, "service:", error);
            process.exit(1);
        }

        // Bind his own metas
        service.metas = registered.metas;
        ServicesContainer.allServices[ registered.metas.id ] = serviceInstance;
        this.config.debug && console.log(`[app] Service`, registered.metas.id, 'Loaded');

        return serviceInstance;
    }

    public bindServices( services: TServicesIndex ) {

        for (const localName in services)
            this.bindService( localName, services[localName] as unknown as TRegisteredService );
    }

    public bindService( localName: string, service: AnyService ) {

        const serviceScope = this.constructor.name + '.' + localName;

        // Fix the parent service (the app could be provided as parent because the dev called this.use() in the app class definition)
        service.parent = this;

        // Bind subservice to service
        //console.log(`Binding service ${serviceScope}`);
        service.bindings.push(serviceScope);

        // Since now we have the localname, we can bind the service in this.service too
        this.services[localName] = service;

        // For serices that have been passed through this.use
        if ((localName in this) && this[localName] === undefined)
            this[ localName ] = service;
        
    }

    public async startService( localName: string, service: AnyService ) {
        // Service already started
        if (!service.started) {

            const serviceScope = this.constructor.name + '.' + localName;

            // Start servuce & eventually his subservices
            console.log(`[app] Start service`, serviceScope);
            service.status = 'starting';
            service.started = service.launch();
            await service.started.catch(e => {
                console.error("Catched error while starting service " + serviceScope, e);
                if (this.app.env.profile === 'prod')
                    process.exit(1);
                else
                    throw e;
            })

            // Bind to app
            console.log(`[app] Service`, serviceScope, 'started (bound to:', service.bindings.join(', '),')');
            service.status = 'running';
        }
    }

    /*----------------------------------
    - HOOKS
    ----------------------------------*/
    public hooks: THooksIndex<THooks> = {}

    public on<THookName extends keyof THooksList>( 
        name: THookName, 
        callback: THookCallback<THooksList[THookName]> 
    ) {

        const callbacks = this.hooks[ name ];
        if (callbacks)
            callbacks.push( callback );
        else
            this.hooks[ name ] = [callback]

        return this;
    }

    public runHook<THookName extends keyof THooksList>( 
        name: THookName, 
        ...args: THooksList[THookName]["args"]
    ) {

        const callbacks = this.hooks[name];
        if (!callbacks)
            return;// console.info(LogPrefix, `No ${name} hook defined in the current service instance.`);

        this.config.debug && console.info(`[hook] Run all ${name} hook (${callbacks.length}).`);
        return Promise.all( 
            callbacks.map(
                cb => cb(...args).catch(e => {
                    console.error(`[hook] Error while executing hook ${name}:`, e);
                    if (name !== 'error')
                        this.runHook('error', e);
                })
            ) 
        ).then(() => {
            this.config.debug && console.info(`[hook] Hooks ${name} executed with success.`);
        })
    }

}