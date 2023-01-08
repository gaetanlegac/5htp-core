/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Specific
import type Application from '@server/app';
import type { default as Router } from '.';
import type ServerRequest from './request';
import type RequestService from './request/service';

/*----------------------------------
- SERVICE
----------------------------------*/
export default abstract class RouterService<TRouter extends Router = Router> {

    protected router!: TRouter;
    protected app!: Application;

    public constructor(
        
    ) {

    }

    /*
        We can't pass the router instance in the routerservice constructor
        Because we instanciate the routerservice in the router instanciation itself
        So if we do:
        public router = new Router(this, {
            ...,
            services: () => ({

                auth: new AuthService(this.router, this.users),

            }),
        )
        We would have a cicular reference in typings, which will make router typed as any
    */
    public attach( router: TRouter ) {
        this.router = router;
        this.app = router.app;
    }
    
    public abstract register(): Promise<void>;

    public abstract requestService( request: ServerRequest<TRouter> ): RequestService;

}