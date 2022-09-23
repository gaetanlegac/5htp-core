/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Libs 
import { TClientRoute } from '..';
import { history } from '@client/router/request/history';
import BaseResponse, { TResponseData } from '@common/router/response';
import ClientRequest from '@client/router/request'

/*----------------------------------
- TYPES
----------------------------------*/

import type ServerResponse from '@server/services/router/response';
import type { PageResponse } from '@common/router/response';
export type TPageResponse = With<ClientResponse<PageResponse> | ServerResponse<PageResponse>, 'data'>;

/*----------------------------------
- ROUTER
----------------------------------*/
export default class ClientResponse<TData extends TResponseData = TResponseData> extends BaseResponse<TData> {

    public constructor( 
        request: ClientRequest, 
        route: TClientRoute
    ) {

        super(request);

        this.route = route;
        
    }
    
    public redirect(url: string) {
        history?.replace(url);
    }
}