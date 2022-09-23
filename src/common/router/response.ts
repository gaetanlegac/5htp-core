/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import { FunctionalComponent } from "preact";

// Core
import { TRoute } from ".";
import BaseRequest from './request';
import { TClientRoute, TFrontRenderer } from '@client/router';
import PageResponse from './response/page';
import { ClientContext } from '@client/context';

/*----------------------------------
- TYPES
----------------------------------*/

export { default as PageResponse } from './response/page';

export type TResponseData = PageResponse | unknown

/*----------------------------------
- CONTEXT
----------------------------------*/
export default abstract class BaseResponse<
    TData extends TResponseData = TResponseData,
    TRequest extends BaseRequest = BaseRequest
> {

    public data?: any;
    public request: With<TRequest, 'response'>;
    public route?: TRoute;

    public constructor(
        request: TRequest,
    ) {
        // ServerResponse et ClientResponse assignent request.response
        request.response = this;
        this.request = request as With<TRequest, 'response'>;
    }

    public setRoute(route: TRoute) {
        this.route = route;
        return this;
    }

    public abstract redirect(url: string, code: number);
}