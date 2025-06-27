/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import { PrismaClient } from '@/var/prisma';

// Core
import type { Application } from '@server/app';
import Service from '@server/app/service';

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

   
}