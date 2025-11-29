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

export type TRouterServiceArgs = [
    getConfig: TServiceArgs<RouterService>[1],
    app: Application,
];

/*----------------------------------
- SERVICE
----------------------------------*/
export default abstract class RouterService<
    TConfig extends {} = {}
> extends Service<TConfig, {}, Application> {

    public constructor( ...[config, app]: TRouterServiceArgs) {
        super(app, config, app);
    }

    public abstract requestService( request: ServerRequest<RouterService> ): RequestService | {} | null;

}