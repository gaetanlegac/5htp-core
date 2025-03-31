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

export default class ModelsManager extends Service<Config, Hooks, Application, Services> {

    public client = new PrismaClient();

    /*----------------------------------
    - LIFECICLE
    ----------------------------------*/

    protected async start() {

        
    }
  
    public async ready() {
  
    }
  
    public async shutdown() {
        await this.client.$disconnect()
    }

   
}