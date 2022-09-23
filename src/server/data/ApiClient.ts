/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import { Logger } from "tslog";
import axios, { AxiosResponse, AxiosRequestConfig, AxiosError } from 'axios';
import httpAdapter from 'axios/lib/adapters/http';

// Libs
import Cache from '@server/data/Cache';

/*----------------------------------
- TYPES
----------------------------------*/
declare module 'axios' {
    export interface AxiosRequestConfig {
        fallback?: string; // ID donnée cache
        cache?: string; // ID donnée cache
        cacheExpiration?: number | Date | null,
        retry?: number;
        debug?: boolean
    }
}

const debug = false;

/*----------------------------------
- MODULE
----------------------------------*/
// FIX: On créé une nouvelle instance d'axios ici, car si on utilise l'instance globale,
//  Les intercepteurs seront empilés à la suite à chaque reload HMR 
export default axios.create({
    timeout: process.env.environnement === 'local' 
        ? 10000 // Connexion pourrie à la maison
        : 5000,
    validateStatus: function (status: number) {
        return status >= 200 && status < 300;
    },
    adapter: async (config: AxiosRequestConfig) => {

        //const logger = new Logger({ prefix: [config.url] });

        console.log(`Création de la requête`, { params: config.params, data: config.data });

        const envoyer = (tentative: number = 1) => httpAdapter(config).then(async (res: AxiosResponse) => {

            console.log(`Status:`, res.status ,`Reponse:`, typeof res.data);

            // Mise en cache
            const cacheId: string | undefined = config.fallback || config.cache;
            if (cacheId !== undefined) {
                console.log(`Enregistrement de la réponse dans le cache (ID: ${cacheId})`);
                await Cache.set(cacheId, res.data, config.cacheExpiration);
            }

            return res;

        }).catch(async (err: AxiosError) => {

            // err peut être une simple instance d'Error

            console.error("Error during API request:", {
                method: config.method,
                url: config.url,
                body: config.data,
                headers: config.headers,
            });

            if (err.isAxiosError && err.response) {
                console.error("Response:", {
                    status: err.response.status + ' ' + err.response.statusText,
                    headers: err.response.headers,
                    body: err.response.data
                });
            }

            throw err;

            // Nouvelle tentative 
            if (
                config.retry !== undefined && tentative < config.retry 
                && 
                err.response !== undefined && err.response.status >= 400
            ) {
                console.log(`Tentative n°` + (tentative + 1));
                return await envoyer(tentative + 1);
            }

            // Fallback via cache
            const fallback = config.fallback === undefined
                ? undefined
                : await Cache.get(config.fallback)

            // Aucun fallback = impossible de continuer
            if (!err) {
                console.log(`Aucun fallback disponible, on fait remonter l'erreur.`);
                throw err;
            } else
                console.log(`Utilisation des données en fallback via le cache (ID: ${config.fallback})`/*, fallback*/);
            
            return {
                data: fallback,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: config,
                request: err.request
            }


        })

        return config.cache === undefined
            ? await envoyer()
            : await Cache.get(config.cache, () => envoyer(), config.cacheExpiration);

    }
})