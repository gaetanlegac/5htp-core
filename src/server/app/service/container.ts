/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Specific
import type { 
    AnyService, StartedServicesIndex,
    // Hooks
    THookCallback, THooksIndex 
} from ".";

import ServicesIndex from '@/server/.generated/services';

/*----------------------------------
- TYPES: REGISTRATION
----------------------------------*/

// From service/service.json
export type TServiceMetas<TServiceClass extends AnyService = AnyService>  = {
    id: string,
    name: string,
    parent: string,
    dependences: string[],
    class: () => { default: ClassType<TServiceClass> }
}

export type TRegisteredService<TServiceClass extends AnyService = AnyService>  = {
    type: 'service', // Used to recognize if an object is a registered service
    config?: {},
    metas: TServiceMetas<TServiceClass>,
    hooks: THooksIndex<{}>,
    on: (hookName: string, hookFunc: THookCallback<any>) => void,
    subServices: TRegisteredServicesIndex
}

export type TRegisteredServicesIndex<TServiceClass extends AnyService = AnyService> = {
    [serviceId: string]: TRegisteredService<TServiceClass>
}

/*----------------------------------
- CONFIG
----------------------------------*/

const LogPrefix = '[service]';

/*----------------------------------
- CLASS
----------------------------------*/
export class ServicesContainer<
    TServicesIndex extends StartedServicesIndex = StartedServicesIndex
> {

    public registered: TRegisteredServicesIndex = {}

    // All service instances by service id
    public allServices: {[serviceId: string]: AnyService} = {}

    public setup<TServiceId extends keyof TServicesIndex>( 
        serviceId: keyof TServicesIndex, 
        serviceConfig: TServicesIndex[TServiceId]["config"]
    ): TRegisteredService {

        // Check if the service is installed & has been indexed
        const installedService = ServicesIndex[ serviceId ];
        if (installedService === undefined)
            throw new Error(`Unable to setup service "${serviceId}": This one doesn't seems to be installed.`);

        // Service already registered & setup
        const registered = this.registered[ serviceId ];
        if (registered !== undefined)
            throw new Error(`Service ${serviceId} has been setup multiple times. One service can only be setup one time.`);

        // Create & register metas
        const service: TRegisteredService = {
            type: 'service',
            config: serviceConfig,
            metas: installedService,
            hooks: {},
            on: (hookName: string, hookFunc: THookCallback<any>) => {
                const callbacks = service.hooks[ hookName ];
                if (callbacks)
                    callbacks.push( hookFunc );
                else
                    service.hooks[ hookName ] = [hookFunc]
            },
            subServices: {}
        };

        this.registered[ serviceId ] = service;

        return service;
    }

    public callableInstance = <TInstance extends object, TCallableName extends keyof TInstance>(
        instance: TInstance, 
        funcName: TCallableName
    ): TInstance[TCallableName] & TInstance => {

        const callableFunc = instance[funcName];
        if (typeof callableFunc !== 'function')
            throw new Error(`instance[funcName] isn't callable.`);

        const callable = callableFunc.bind(instance);

        const methods = [
            ...Object.getOwnPropertyNames( Object.getPrototypeOf( instance )),
            ...Object.getOwnPropertyNames( instance ),
            // service.launch() isn't included, maybe because parent abstract class
            'launch'
        ];

        for (const method of methods)
            if (method !== 'constructor')
                callable[ method ] = typeof instance[ method ] === 'function'
                    ? instance[ method ].bind( instance )
                    : instance[ method ];

        // Allow us to recognize a callable as a service 
        callable.serviceInstance = instance;

        return callable as TInstance[TCallableName] & TInstance;
    }
}

export default new ServicesContainer