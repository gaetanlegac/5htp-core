/*----------------------------------
- DEPENDANCES
----------------------------------*/

/* NOTE: On évite d'utiliser les alias ici,
        Afin que l'envoi des rapports de bug fonctionne même en cas d'erreur avec les alias
*/

// npm
import got from 'got';

// Core
import app from '../../../app';
import { Transporter, TCompleteEmail } from '..';
const config = app.config.email.transporters.mailjet;

/*----------------------------------
- TYPES
----------------------------------*/
declare global {
    namespace Core {
        namespace Config {
            interface EmailTransporters {
                mailjet: {
                    api: string,
                }
            }
        }
    }
}

/*----------------------------------
- TRABSPORTER
----------------------------------*/

export class MailjetMailTransporter extends Transporter {
    public async send( emails: TCompleteEmail[] ) {

        const body = {
            Messages: emails.map( email => ({
                From: {
                    Email: email.from,
                    Name: app.identity.name
                },
                To: email.to.map(to => ({
                    Email: to
                })),
                Subject: email.subject,
                HTMLPart: email.html
            })),
        }
        
        await got.post('https://api.mailjet.com/v3.1/send', {
            headers: {
                Authorization: 'Bearer ' + config.api,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        }).then((res) => {

            console.log("[email][mailjet]", body, res.statusCode, res.body);

            return true;

        }).catch( e => {

            console.log("[email][mailjet] failed", body, e.response?.statusCode, e, e.response?.body);
            throw new Error(e.response?.body || e.message || "Send sms failed with mailjet")

        });

    }
}

app.services.email.register( 'mailjet', MailjetMailTransporter );