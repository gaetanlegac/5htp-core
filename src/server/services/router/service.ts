/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Core
import type { Application } from '@server/app';
import Service, { TRegisteredServicesIndex } from '@server/app/service';

// Specific
import type { default as Router } from '.';
import type ServerRequest from './request';
import type RequestService from './request/service';

export type Services = {
    
}

/*----------------------------------
- SERVICE
----------------------------------*/
export default abstract class RouterService<
    TConfig extends {} = {}
> extends Service<TConfig, {}, Application, Services> {

    public constructor( 
        // Parent is always a router in RouterService
        // Warning: for now, it's possible that router is actually the app
        //      It's fixed with a not very clean way in Service.bindService
        router: Router, 
        config: TConfig,
        services: TRegisteredServicesIndex,
        app: Application
    ) {

        super(router, config, services, app);
        
    }

    public abstract requestService( request: ServerRequest<Router> ): RequestService | null;

}