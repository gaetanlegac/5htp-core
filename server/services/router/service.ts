/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Core
import type { Application } from '@server/app';
import Service, { TRegisteredServicesIndex, TServiceArgs } from '@server/app/service';

// Specific
import type { default as Router } from '.';
import type ServerRequest from './request';
import type RequestService from './request/service';

export type TRouterServiceArgs = TServiceArgs<RouterService>;

/*----------------------------------
- SERVICE
----------------------------------*/
export default abstract class RouterService<
    TConfig extends {} = {}
> extends Service<TConfig, {}, Application> {

    public constructor( ...args: TRouterServiceArgs) {
        super(...args);
    }

    public abstract requestService( request: ServerRequest<Router> ): RequestService | null;

}