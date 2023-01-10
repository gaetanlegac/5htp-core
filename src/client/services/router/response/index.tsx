/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Libs 
import type ServerRouter from '@server/services/router';
import type ServerResponse from '@server/services/router/response';

import type { TRoute, TErrorRoute } from '@common/router';
import BaseResponse from '@common/router/response';

import type ClientApplication from '@client/app';
import type { default as ClientRouter } from '@client/services/router'
import type ClientResponse from '@client/services/router/response'
import ClientRequest from '@client/services/router/request'
import ClientPage from '@client/services/router/response/page'
import { history } from '@client/services/router/request/history';
import CommonPage from '@common/router/response/page';

/*----------------------------------
- TYPES
----------------------------------*/

export type TPageResponse<TRouter extends ClientRouter> = (
    ClientResponse<TRouter, ClientPage>
    |
    ServerResponse<ServerRouter, ClientPage>
);

export type TRouterContext<TRouter extends ClientRouter = ClientRouter, TApplication extends ClientApplication = ClientApplication> = (
    // ClientPage context
    {
        app: TApplication,
        context: TRouterContext<TRouter, TApplication>,
        request: ClientRequest<TRouter>,
        route: TRoute<TRouter>,
        api: ClientRequest<TRouter>["api"],
        page: ClientPage<TRouter>,
        user: User
    }
    &
    // Expose client application services (api, socket, ...)
    //TRouter["app"] 
    TApplication
)

/*----------------------------------
- ROUTER
----------------------------------*/
export default class ClientPageResponse<
    TRouter extends ClientRouter,
    TData extends TResponseData = TResponseData
> extends BaseResponse<TData> {

    public context: TRouterContext<TRouter, TRouter["app"]>;

    public constructor(
        public request: ClientRequest<TRouter>,
        public route: TRoute | TErrorRoute,

        public app = request.app,
    ) {

        super(request);

        request.response = this;

        // Create response context for controllers
        this.context = this.createContext();
    }

    private createContext(): TRouterContext<TRouter, TRouter["app"]> {

        const context: TRouterContext<TRouter, TRouter["app"]> = {
            // App services (TODO: expose only services)
            ...this.request.app,
            // Router context
            app: this.app,
            context: undefined as unknown as TRouterContext<TRouter, TRouter["app"]>,
            request: this.request,
            route: this.route,
            api: this.request.api,
        }

        context.context = context;

        return context;
    }

    public async runController( additionnalData: {} = {} ): Promise<ClientPage> {

        // Run contoller
        const result = this.route.controller(this.context);

        // Default data type for `return <raw data>`
        if (result instanceof ClientPage)
            await result.preRender(additionnalData);
        else
            throw new Error(`Unsupported response format: ${result.constructor?.name}`);

        return result;
    }

    public redirect(url: string) {
        history?.replace(url);
    }
}