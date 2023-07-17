/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Specific
import type { Application } from "..";
import type { Command } from "../commands"; 
import type { TServiceMetas, TRegisteredServicesIndex, TRegisteredService } from './container';

/*----------------------------------
- TYPES: OPTIONS
----------------------------------*/

export type AnyService = Service<{}, {}, Application, TStartedServicesIndex>

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
    TServicesIndex extends StartedServicesIndex = StartedServicesIndex
> {

    public started?: Promise<void>;
    public status: 'stopped' | 'starting' | 'running' | 'paused' = 'stopped';

    public commands?: Command[];
    public metas!: TServiceMetas;
    public bindings: string[] = []

    public static createInstance?: (
        parent: AnyService, 
        config: TServiceConfig,
        services: TRegisteredServicesIndex,
        app: Application
    ) => Service<TServiceConfig, THooksList, Application, StartedServicesIndex>;

    public constructor( 
        public parent: AnyService, 
        public config: TConfig,
        services: TRegisteredServicesIndex,
        public app: TApplication
    ) {

        // Instanciate subservices
        for (const localName in services)
            this.registerService( localName, services[localName] );
        
    }

    /*----------------------------------
    - LIFECYCLE
    ----------------------------------*/

    public async launch() {

        // Instanciate subservices
        for (const localName in this.services)
            await this.startService( this.services[localName] );

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

    public services: TRegisteredServicesIndex = {} as TRegisteredServicesIndex/*new Proxy({}, {
        get: (target, prop, recever) => {
            if (!( prop in target )) {
                
                throw new Error(`You made reference to the "${prop}" service, but this one hasn't been loaded yet. Loaded services: ` + Object.keys(this.services).join(', '));
            }
        }
    }) as TRegisteredServicesIndex*/

    protected registerService( localName: string, registered: TRegisteredService ): AnyService {

        // Service already instabciates on the app scope
        let service = this.app.allServices[ registered.metas.id ];

        // Service not yet instanciated
        if (service === undefined) {

            // Instanciate
            console.log(`[app] Load service`, registered.metas.id);
            const ServiceClass = registered.metas.class().default;
            // Create class instance
            service = ServiceClass.createInstance !== undefined
                ? ServiceClass.createInstance(this, registered.config, registered.subServices, this.app)
                : new ServiceClass(this, registered.config, registered.subServices, this.app);

            service.metas = registered.metas;

        } else {
            console.warn(`[app] Service`, registered.metas.id, 'already instanciated in this app.');
        }

        // Bind to app
        this.services[ localName ] = service;
        service.bindings.push(this.constructor.name + '.' + localName);
        this.app.allServices[ registered.metas.id ] = service;

        return service;
        
    }

    protected async startService( service: AnyService ) {

        // Service already started
        if (service.started)
            return;

        // Start servuce & eventually his subservices
        console.log(`[app] Start service`, service.metas.id);
        service.status = 'starting';
        service.started = service.launch();
        await service.started.catch(e => {
            console.error("Catched error while starting service " + service.metas.id, e);
            if (this.app.env.profile === 'prod')
                process.exit();
            else
                throw e;
        })

        console.log(`[app] Service`, service.metas.id, 'started (bound to:', service.bindings.join(', '),')');
        service.status = 'running';
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