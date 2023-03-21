/*----------------------------------
-  DEPS
----------------------------------*/

// Nodejs
import crypto, { Encoding } from 'crypto';

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
    // Initialisation vector
    // Generate one here: https://www.allkeysgenerator.com/Random/Security-Encryption-Key-Generator.aspx
    iv: string,
    // Define usage-specific keys
    // You can also generate one via the link upper
    keys: {[keyName: string]: string}
}

export type Hooks = {

}

type TEncryptOptions = {
    encoding: Encoding
}

type TDecryptOptions = {
    encoding: Encoding
}

/*----------------------------------
- SERVICE
----------------------------------*/
export default class AES<TConfig extends Config = Config> extends Service<TConfig, Hooks, Application> {

    public async register() {
        
    }

    public async start() {

    }

    public encrypt( keyName: keyof TConfig["keys"], data: any, options: TEncryptOptions = {
        encoding: 'base64url'
    }) {

        const encKey = this.config.keys[ keyName as keyof typeof this.config.keys ];

        data = JSON.stringify(data);

        let cipher = crypto.createCipheriv('aes-256-cbc', encKey, this.config.iv);
        let encrypted = cipher.update(data, 'utf8', options.encoding);
        encrypted += cipher.final(options.encoding);
        return encrypted;
        
    }

    public decrypt( keyName: keyof TConfig["keys"], data: string, options: TDecryptOptions = {
        encoding: 'base64url'
    }) {

        const encKey = this.config.keys[ keyName as keyof typeof this.config.keys ];

        try {

            let decipher = crypto.createDecipheriv('aes-256-cbc', encKey, this.config.iv);
            let decrypted = decipher.update(data, options.encoding, 'utf8');
            return JSON.parse(decrypted + decipher.final('utf8'));

        } catch (error) {

            throw new Forbidden("Invalid token.");
            
        }
    }
}