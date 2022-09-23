/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import hInterval from 'human-interval';

// Libs
import redis from '@server/services/redis';
import { ErreurCritique } from '@common/errors';

/*----------------------------------
- SERVICE
----------------------------------*/
const Cache = {

    // Expiration = Durée de vie en secondes ou date max
    // Retourne null quand pas de valeur
    async get<TValeur>(
        cle: string, 
        func: Function | null = null,
        expiration: number | Date | null = null,
        avecDetails?: boolean
    ): Promise<null | TValeur> {

        let retour: any = await this.getVal(cle);

        // Donnée inexistante
        if (retour === null && func !== null) {

            // Rechargement
            retour = await func();

            // undefined retourné = pas d'enregistrement
            if (retour !== undefined)
                await this.set(cle, retour, expiration);
        }

        return avecDetails 
            ? {
                donnees: retour
            } 
            : retour;
    },

    getVal<TValeur>(cle: string): Promise<TValeur | null> {
        return new Promise((resolve) => {

           redis.instance.get(cle, (err, val) => {

                if (val === null) {
                    resolve( null );
                } else {
                    try {
                        resolve( JSON.parse(val) )
                    } catch (error) {

                        console.warn(`Error while parsing JSON value from cache (id: ${cle})`, error, 'Raw value:', val);
                        resolve(null);

                    }
                }

            });
        });
    },

    /**
     * Put in cache a JSON value, associated with an unique ID.
     * @param cle Unique identifier for the cache entry. Used to retrieve the value via Cache.set()
     * @param val The value to put in cache
     * @param expiration The interval in which the data is valid.
     *  - string: the humain-readable expression. Exemple: 10 minutes
     *  - number: time in seconds
     *  - Date: the date at which the data expires
     *  - null: no expiration (default)
     * @returns A void promise
     */
    set( cle: string, val: any, expiration: string | number | Date | null = null ): Promise<void> {
        console.log("Updating cache " + cle);
        return new Promise((resolve) => {

            //console.info('Enregistrement de ' + cle + ' avec la valeur ', val, 'expiration', expiration);

            val = JSON.stringify(val);

            // Conversion de l'expiration en nombre de secondes (ttl, time to live)
            if (expiration === null)
               redis.instance.set(cle, val, () => {
                    resolve()
                });
            else {

                let secondes: number;

                // H expression
                if (typeof expiration === 'string') {

                    const ms = hInterval(expiration); 
                    if (ms === undefined) throw new Error(`Invalid period string: ` + expiration);
                    secondes = ms / 1000;

                // Via durée de vie en secondes
                } else if (typeof expiration === 'number')
                    secondes = expiration;
                // Date limite
                else
                    secondes = (expiration.getTime() - (new Date).getTime()) / 1000;

                redis.instance.set(cle, val, 'EX', secondes, () => {
                    resolve()
                });
            }
        });
    },

    del( cle: string ): Promise<void> {
        return new Promise((resolve) => {
           redis.instance.del(cle, () => resolve());
        });
    }
}

export default Cache;
