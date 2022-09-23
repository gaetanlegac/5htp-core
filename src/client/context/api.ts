/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import axios, { AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';

// Core
import type { HttpMethod, TApiResponseData } from '@server/services/router';
import type { ClientContext } from '@client/context';
import { TFetcherArgs } from '@common/router/request';
import { instancierViaCode, NetworkError } from '@common/errors';

/*----------------------------------
- TYPES
----------------------------------*/

const debug = true;

/*----------------------------------
- FUNCTION
----------------------------------*/
const configure = (...[method, path, data, options]: TFetcherArgs): AxiosRequestConfig => {

    const { onProgress, captcha } = options || {};

    debug && console.log(`[api] Sending request`, method, path, data);

    const config: AxiosRequestConfig = {

        url: path,
        method: method,
        headers: {
            'Content-Type': "application/json",
            'Accept': "application/json",
        },

        validateStatus: function (status: number) {
            return status === 200;
        },

        onUploadProgress: onProgress === undefined ? undefined : (e) => {
            const percentCompleted = Math.round((e.loaded * 100) / e.total);
            onProgress(percentCompleted);
        }

    };

    if (data) {
        if (method === "GET")
            config.params = data;
        else {
            config.data = data;
            if (data instanceof FormData)
                config.headers["Content-Type"] = 'multipart/form-data';
        }
    }

    return config;
}

export default (context: ClientContext, ...args: TFetcherArgs) => {

    const config = configure(...args);
    
    return axios.request(config)
        .then((res: AxiosResponse<TApiResponseData>) => {

            debug && console.log(`[api] Success:`, res);
            return res.data;

        })
        .catch((e: AxiosError) => {

            if (e.response !== undefined) {

                console.warn(`[api] Failure:`, e);
                throw instancierViaCode(
                    e.response.status || 500,
                    e.response.data
                );

            // Erreur réseau: l'utilisateur n'ets probablement plus connecté à internet
            } else {

                console.error(`[api] Network error:`, e, context);
                context.toast.error("Please check your internet connection and try again.", undefined, null, { autohide: false });
                throw new NetworkError(e.message);

            }
        });
}