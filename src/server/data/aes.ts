/*----------------------------------
-  DEPS
----------------------------------*/

// Nodejs
import crypto from 'crypto';

// Core
import { AccesRefuse } from '@common/errors';

const debug = true;

/*----------------------------------
- CONFIG
----------------------------------*/

const ENC_KEY = "bf3c199c2470cb477d907b1e0917c17b"; // set random encryption key
const IV = "5183666c72eec9e4"; // set random initialisation vector

/*----------------------------------
- SERVICE
----------------------------------*/
class AES {

    public encrypt( data: any ) {

        data = JSON.stringify(data);

        let cipher = crypto.createCipheriv('aes-256-cbc', ENC_KEY, IV);
        let encrypted = cipher.update(data, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return encrypted;
        
    }

    public decrypt( data: string ) {

        try {

            let decipher = crypto.createDecipheriv('aes-256-cbc', ENC_KEY, IV);
            let decrypted = decipher.update(data, 'base64', 'utf8');
            return JSON.parse(decrypted + decipher.final('utf8'));

        } catch (error) {

            throw new AccesRefuse("Invalid token.");
            
        }
        
    }

}

export default new AES;