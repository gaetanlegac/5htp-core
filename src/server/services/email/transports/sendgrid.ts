/*----------------------------------
- DEPENDANCES
----------------------------------*/

/* NOTE: On évite d'utiliser les alias ici,
        Afin que l'envoi des rapports de bug fonctionne même en cas d'erreur avec les alias
*/

// Core
import app from '../../../app';
import { Transporter, TCompleteEmail } from '..';
const config = app.config.email.transporters.sendgrid;

// Envoi externe
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(config.api);

/*----------------------------------
- TYPES
----------------------------------*/
declare global {
    namespace Core {
        namespace Config {
            interface EmailTransporters {
                sendgrid: {
                    api: string,
                }
            }
        }
    }
}

/*----------------------------------
- TRABSPORTER
----------------------------------*/

export class SendGridMailTransporter extends Transporter {
    public async send( emails: TCompleteEmail[] ) {
        const retourSg = await sgMail.send(emails);
        console.log('Sendgrid response', retourSg);
    }
}

app.services.email.register( 'sendgrid', SendGridMailTransporter );