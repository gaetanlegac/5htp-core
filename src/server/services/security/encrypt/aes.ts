/*----------------------------------
-  DEPS
----------------------------------*/

// Nodejs
import crypto from 'crypto';

// Core
import Application, { Service } from '@server/app';
import { Forbidden } from '@common/errors';

/*----------------------------------
- CONFIG
----------------------------------*/


/*----------------------------------
- SERVICE CONFIG
----------------------------------*/

export type Config = {
    debug?: boolean,
    iv: string,
    keys: {[keyName: string]: string}
}

export type Hooks = {

}

/*----------------------------------
- SERVICE
----------------------------------*/
export default class AES<TConfig extends Config = Config> extends Service<TConfig, Hooks, Application> {

    public async register() {
        
    }

    public async start() {

    }

    public encrypt( keyName: keyof TConfig["keys"], data: any ) {

        const encKey = this.config.keys[ keyName as keyof typeof this.config.keys ];

        data = JSON.stringify(data);

        let cipher = crypto.createCipheriv('aes-256-cbc', encKey, this.config.iv);
        let encrypted = cipher.update(data, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return encrypted;
        
    }

    public decrypt( keyName: keyof TConfig["keys"], data: string ) {

        const encKey = this.config.keys[ keyName as keyof typeof this.config.keys ];

        try {

            let decipher = crypto.createDecipheriv('aes-256-cbc', encKey, this.config.iv);
            let decrypted = decipher.update(data, 'base64', 'utf8');
            return JSON.parse(decrypted + decipher.final('utf8'));

        } catch (error) {

            throw new Forbidden("Invalid token.");
            
        }
    }
}