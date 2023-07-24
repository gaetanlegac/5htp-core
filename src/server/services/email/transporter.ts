/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm

// Core
import type Application from "@server/app";
import Service from '@server/app/service';
import type EmailService from '@server/services/email';

// Specific
import type { TCompleteEmail } from ".";

/*----------------------------------
- TYPES
----------------------------------*/

export type TBasicConfig = {
    api: string,
    debug: boolean
}

/*----------------------------------
- CLASS 
----------------------------------*/
export abstract class Transporter<TConfig extends TBasicConfig = TBasicConfig>
    extends Service<TConfig, {}, Application, {}> {

    /*----------------------------------
    - LIFECYCLE
    ----------------------------------*/

    protected async start() {
        
    }

    protected async ready() {

    }

    protected async shutdown() {

    }

    /*----------------------------------
    - ACTIONS
    ----------------------------------*/

    public abstract send( emails: TCompleteEmail[] ): Promise<void>;
}
