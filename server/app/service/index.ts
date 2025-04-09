/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Specific
import type { Application } from "..";
import type { Command } from "../commands"; 
import type { TServiceMetas } from './container';
import type { TControllerDefinition, TRoute } from '../../services/router';

/*----------------------------------
- TYPES: OPTIONS
----------------------------------*/

export type AnyService<TSubServices extends StartedServicesIndex = StartedServicesIndex> = 
    Service<{}, {}, Application>

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

export type TServiceArgs<TService extends AnyService> = [
    parent: AnyService | 'self',
    getConfig: (instance: TService) => {},
    app: TService['app'] | 'self'
]

/*----------------------------------
- CONFIG
----------------------------------*/

const LogPrefix = '[service]';

export function Route(options: Omit<TControllerDefinition, 'controller'> = {}) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        // Store the original method
        const originalMethod = descriptor.value;

        if (options.path === undefined)
            options.path = target.constructor.name + '/' + propertyKey;

        // Ensure the class has a static property to collect routes
        if (!target.__routes) {
            target.__routes = [];
        }

        // Create route object
        const route: TRoute = {
            method: 'POST',
            path: '/api/' + options.path,
            controller: originalMethod,
            options: {
                priority: options.priority || 0
            }
        };
        
        // Add this route to the class's routes collection
        target.__routes.push(route);

        // Original method is unchanged, just registered with router
        return descriptor;
    };
}

/*----------------------------------
- CLASS
----------------------------------*/
export default abstract class Service<
    TConfig extends {}, 
    THooks extends THooksList,
    TApplication extends Application
> {

    public started?: Promise<void>;
    public status: 'stopped' | 'starting' | 'running' | 'paused' = 'starting';

    public commands?: Command[];
    public metas!: TServiceMetas;
    public bindings: string[] = []

    public app: TApplication;
    public config: TConfig = {} as TConfig;

    public constructor(...[parent, getConfig, app]: TServiceArgs<AnyService>) {

        this.parent = parent;
        if (this.parent === 'self') 
            this.parent = this;

        this.app = app === 'self'
            ? this as unknown as TApplication
            : app

        if (typeof getConfig === 'function')
            this.config = getConfig(this);
        
    }

    public getServiceInstance() {
        return this;
    }

    /*----------------------------------
    - LIFECYCLE
    ----------------------------------*/

    protected async ready(): Promise<void> {}

    protected async shutdown(): Promise<void> {}

    /*----------------------------------
    - SUBSERVICES
    ----------------------------------*/

    // TODO:; babel plugin: transform Service references to app.use('Service')
    public use<TService extends AnyService = AnyService>( 
        serviceId: string,
        useOptions: { optional?: boolean } = {}
    ): TService {

        const registeredService = this.app.registered[serviceId];
        if (registeredService === undefined && useOptions.optional === false)
            throw new Error(`Service ${registeredService} not registered.`);

        return this.app[ registeredService.name ];
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

        //this.config.debug && console.info(`[hook] Run all ${name} hook (${callbacks.length}).`);
        return Promise.all( 
            callbacks.map(
                cb => cb(...args).catch(e => {

                    if (name !== 'error')
                        this.runHook('error', e);
                    else 
                        console.error(`[hook] Error while executing hook ${name}:`, e);
                })
            ) 
        ).then(() => {
            //this.config.debug && console.info(`[hook] Hooks ${name} executed with success.`);
        })
    }

}