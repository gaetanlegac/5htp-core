/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import { PrismaClient } from '@/var/prisma';

// Core
import type { Application } from '@server/app';
import Service from '@server/app/service';

// Specific
import Facet, { TDelegate, TSubset, Transform } from './Facet';

/*----------------------------------
- TYPES
----------------------------------*/


/*----------------------------------
- SERVICE CONFIG
----------------------------------*/

export type Config = {
   debug?: boolean
}

export type Hooks = {

}

export type Services = {

}

/*----------------------------------
- CLASSE
----------------------------------*/

export default class ModelsManager extends Service<Config, Hooks, Application> {

    public client = new PrismaClient();

    public async ready() {

        await this.client.$executeRaw`SET time_zone = '+00:00'`;

    }
  
    public async shutdown() {
        await this.client.$disconnect()
    }

    public Facet<
        D extends TDelegate<R>,
        S extends TSubset,
        R,
        RT
    >(...args: [D, S, Transform<S, R, RT>]) {

        return new Facet(
            this.client,
            ...args
        );
    }

   
}