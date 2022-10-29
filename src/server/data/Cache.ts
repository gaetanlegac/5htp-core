/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Node
import path from 'path';

// Npm
import hInterval from 'human-interval';
import fs from 'fs-extra';

// Core
import app from '@server/app';

// Libs

/*----------------------------------
- TYPES
----------------------------------*/

type TPrimitiveValue = string | boolean | number | undefined | {[key: string]: TPrimitiveValue} | TPrimitiveValue[];

type TExpirationDelay = string | number | Date | null;

type CacheEntry = { 
    // Value
    value: TPrimitiveValue, 
    // Expiration Timestamp
    expiration?: number 
};

/*----------------------------------
- SERVICE
----------------------------------*/
class Cache {
    
    private cacheFile = path.join(app.path.data, 'cache/mem.json');

    private data: {[key: string]: CacheEntry | undefined} = {};

    private changes: number = 0;
    
    public constructor() {

        setInterval(() => this.cleanMem(), 10000);

        if (fs.existsSync(this.cacheFile))
            this.data = fs.readJSONSync(this.cacheFile)
    }

    private cleanMem() {

        console.log("[cache] Clean memory");

        const now = Date.now();
        for (const key in this.data) {
            const entry = this.data[ key ];
            if (entry?.expiration && entry.expiration < now)
                this.del(key);
        }
        
        if (this.changes > 0)
            fs.outputJSONSync(this.cacheFile, this.data);
    }

    // Expiration = Durée de vie en secondes ou date max
    // Retourne null quand pas de valeur
    public get<TValeur extends TPrimitiveValue>(
        cle: string, 
        func?: (() => Promise<TValeur>),
        expiration?: TExpirationDelay,
        avecDetails?: true
    ): Promise<CacheEntry>;

    public get<TValeur extends TPrimitiveValue>(
        cle: string, 
        func: (() => Promise<TValeur>),
        expiration?: TExpirationDelay,
        avecDetails?: false
    ): Promise<null | TValeur>;

    public async get<TValeur extends TPrimitiveValue>(
        cle: string, 
        func?: (() => Promise<TValeur>),
        expiration?: TExpirationDelay,
        avecDetails?: boolean
    ): Promise<null | TValeur | CacheEntry> {

        let retour: CacheEntry | undefined = this.data[cle];

        console.log(`[cache] Get "${cle}".`);

        // Expired
        if (retour?.expiration && retour.expiration < Date.now()){
            console.log(`[cache] Key ${cle} expired.`);
            retour = undefined;
        }

        // Donnée inexistante
        if (retour === undefined && func !== undefined) {

            // Rechargement
            retour = {
                value: await func(),
                expiration: expiration 
                    ? this.delayToTimestamp(expiration) 
                    : undefined
            }

            // undefined retourné = pas d'enregistrement
            if (retour.value !== undefined)
                await this.set(cle, retour, expiration);
        }

        if (retour === undefined)
            return null;

        return avecDetails 
            ? retour
            : retour.value as TValeur;
    };

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
    public set( cle: string, val: TPrimitiveValue, expiration: TExpirationDelay = null ): void {
        
        console.log("[cache] Updating cache " + cle);
        this.data[ cle ] = {
            value: val,
            expiration: this.delayToTimestamp(expiration)
        }

        this.changes++;
    };

    public del( cle: string ): void {
        this.data[ cle ] = undefined;
        this.changes++;
    }


    /*----------------------------------
    - UTILS
    ----------------------------------*/
    private delayToTimestamp( delay: TExpirationDelay ): number {

        // H expression
        if (typeof delay === 'string') {

            const ms = hInterval(delay); 
            if (ms === undefined) throw new Error(`Invalid period string: ` + delay);
            return Date.now() + ms;

        // Via durée de vie en secondes
        } else if (typeof delay === 'number')
            return Date.now() + delay;
        // Date limite
        else if (delay !== null)
            return delay.getTime();
        else
            return Date.now();
    }
}

export default new Cache;
