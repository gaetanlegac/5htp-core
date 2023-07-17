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

/*----------------------------------
- SERVICE
----------------------------------*/
export default abstract class RouterService<
    TConfig extends {} = {}
> extends Service<TConfig, {}, Application> {

    public constructor( 
        // Parent is always a router in RouterService
        public router: Router, 
        config: TConfig,
        services: TRegisteredServicesIndex,
        app: Application
    ) {

        super(router, config, services, app);
        
    }

    public abstract requestService( request: ServerRequest<TRouter> ): RequestService | null;

}