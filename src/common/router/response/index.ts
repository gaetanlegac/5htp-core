/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import { FunctionalComponent } from "preact";

// Core
import { TRoute } from "..";
import type ClientRequest from '@client/services/router';
import Page from '@client/services/router/response/page'

/*----------------------------------
- TYPES
----------------------------------*/

type TResponseData = Page

/*----------------------------------
- CONTEXT
----------------------------------*/
export default abstract class BaseResponse<
    TData extends TResponseData = Page,
    TRequest extends ClientRequest = ClientRequest
> {

    public data?: TData;
    public request: TRequest;
    public route?: TRoute;

    public constructor(
        request: TRequest,
    ) {
        // ServerResponse et ClientResponse assignent request.response
        request.response = this;
        this.request = request as TRequest;
    }

    public setRoute(route: TRoute) {
        this.route = route;
        return this;
    }

    public abstract redirect(url: string, code: number);
}