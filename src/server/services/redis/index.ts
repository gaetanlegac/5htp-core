/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import redis, { RedisClient } from 'redis';

// Core
import app from '@server/app';

/*----------------------------------
- TYPES
----------------------------------*/

/*----------------------------------
- SERVICE CONFIG
----------------------------------*/

export type RedisServiceConfig = {
   
}

declare global {
    namespace Core {
        namespace Config {
            interface Services {
                redis: RedisServiceConfig
            }
        }
    }
}

/*----------------------------------
- SERVICE
----------------------------------*/
export class RedisService {

    public instance!: RedisClient;

    /*----------------------------------
    - HOOKS
    ----------------------------------*/
    public constructor() {
        this.instance = redis.createClient()
            .on('connect', () => {
                console.log('Connecté au serveur Redis');
            })
            .on('error', (e) => {
                //Probleme.Signaler(`Serveur Redis`, e, undefined);
            })
    }

    public load() {
        
    }

}

/*----------------------------------
- REGISTER SERVICE
----------------------------------*/
app.register('redis', RedisService);
declare global {
    namespace Core {
        interface Services {
            redis: RedisService;
        }
    }
}

export default new RedisService