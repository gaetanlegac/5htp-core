/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Node
import path from 'path';

// Npm
import hInterval from 'human-interval';
import fs from 'fs-extra';

// Core
import Application, { Service } from '@server/app';

// Libs

/*----------------------------------
- CONFIG
----------------------------------*/

const LogPrefix = '[cache]';

/*----------------------------------
- TYPES
----------------------------------*/

type TPrimitiveValue = string | boolean | number | undefined | TPrimitiveValue[] | {
    [key: string]: TPrimitiveValue
}

type TExpirationDelay = 'never' | string | number | Date;

type CacheEntry = { 
    // Value
    value: TPrimitiveValue, 
    // Expiration Timestamp
    expiration?: number 
};

/*----------------------------------
- TYPES
----------------------------------*/

export type Config = {
    debug: boolean
}

export type Hooks = {

}

/*----------------------------------
- SERVICE
----------------------------------*/
export default class Cache extends Service<Config, Hooks, Application> {
    
    private cacheFile = path.join(this.app.path.data, 'cache/mem.json');

    private data: {[key: string]: CacheEntry | undefined} = {};

    private changes: number = 0;
    
    public async register() {


    }

    public async start() {

        setInterval(() => this.cleanMem(), 10000);

        // Restore persisted data
        if (fs.existsSync(this.cacheFile))
            this.data = fs.readJSONSync(this.cacheFile)
    }

    private cleanMem() {

        // Remove expired data
        const now = Date.now();
        for (const key in this.data) {
            const entry = this.data[ key ];
            if (entry?.expiration && entry.expiration < now) {
                this.config.debug && console.log(LogPrefix, `Delete expired data: ${key}`);
                this.del(key);
            }
        }
        
        // Write changes
        if (this.changes > 0) {
            fs.outputJSONSync(this.cacheFile, this.data);
            this.config.debug && console.log(LogPrefix, `Flush ${this.changes} changes`);
            this.changes = 0;
        }
    }

    // Expiration = Durée de vie en secondes ou date max
    // Retourne null quand pas de valeur
    public get<TValeur extends TPrimitiveValue>(
        cle: string, 
        func: (() => Promise<TValeur>),
        expiration: TExpirationDelay,
        avecDetails: true
    ): Promise<CacheEntry>;

    public get<TValeur extends TPrimitiveValue>(
        cle: string, 
        func: (() => Promise<TValeur>),
        expiration?: TExpirationDelay,
        avecDetails?: false
    ): Promise<TValeur>;

    public async get<TValeur extends TPrimitiveValue>(
        cle: string, 
        func: (() => Promise<TValeur>),
        expiration: TExpirationDelay = 'never',
        avecDetails?: boolean
    ): Promise<TValeur | CacheEntry> {

        let entry: CacheEntry | undefined = this.data[cle];

        // Expired
        if (entry?.expiration && entry.expiration < Date.now()){
            this.config.debug && console.log(LogPrefix, `Key ${cle} expired.`);
            entry = undefined;
        }

        // Donnée inexistante
        if (entry === undefined) {

            this.config.debug && console.log(LogPrefix, `Get "${cle}": refresh value`);

            // Rechargement
            entry = {
                value: await func(),
                expiration: this.delayToTimestamp(expiration)
            }

            // undefined retourné = pas d'enregistrement
            //if (entry.value !== undefined)
                await this.set(cle, entry.value, expiration);

        } else
            this.config.debug && console.log(LogPrefix, `Get "${cle}": restored via cache`);

        return avecDetails 
            ? entry
            : entry.value as TValeur;
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
    public set( cle: string, val: TPrimitiveValue, expiration: TExpirationDelay = 'never' ): void {
        
        this.config.debug && console.log(LogPrefix, "Updating cache " + cle);
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
    /**
     * 
     * @param delay 
     * @returns number (timestamp when the data expired) or undefined (never expires)
     */
    private delayToTimestamp( delay: TExpirationDelay ): number | undefined {

        if (delay === 'now') {

            return Date.now();

        } else if (delay === 'never') {

            return undefined;

        // H expression
        } else if (typeof delay === 'string') {

            const ms = hInterval(delay); 
            if (ms === undefined) throw new Error(`Invalid period string: ` + delay);
            return Date.now() + ms;

        // Lifetime in seconds
        } else if (typeof delay === 'number')
            return Date.now() + delay;

        // Date limit
        else
            return delay.getTime();
    }
}
