/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm

// Core
import type Application from "@server/app";
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
export abstract class Transporter<TConfig extends {} = {}> {

    public constructor( 
        protected app: Application & { email: EmailService },
        protected config: TBasicConfig & TConfig,

        protected email = app.email
    ) {

    }

    public abstract send( emails: TCompleteEmail[] ): Promise<void>;
}
