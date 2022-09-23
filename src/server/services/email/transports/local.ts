/*----------------------------------
- DEPENDANCES
----------------------------------*/

/* NOTE: On évite d'utiliser les alias ici,
        Afin que l'envoi des rapports de bug fonctionne même en cas d'erreur avec les alias
*/

// Core
import app from '../../../app';
const config = app.config.email.transporters.local;
import { Transporter, TCompleteEmail } from '..';

// Npm
import nodemailer from 'nodemailer';

/*----------------------------------
- CONFIG
----------------------------------*/
const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.tls, // TLS
    auth: {
        user: config.login,
        pass: config.password
    },
    tls: {
        // Evite erreur: Hostname/IP does not match certificate's altnames: Host: localhost. is not in the cert's altnames: DNS:gaetan-legac.fr, DNS:www.gaetan-legac.fr
        rejectUnauthorized: false
    }
});

console.log("Vérification de la connexion SMTP ...");
transporter.verify(function (error, success) {
    if (error) {
        console.error("Erreur avec le serveur mail: ", error);
    } else {
        console.log("Connexion SMTP OK.");
    }
});

/*----------------------------------
- TYPES
----------------------------------*/

declare global {
    namespace Core {
        namespace Config {
            interface EmailTransporters {
                local: {
                    // Réseau
                    host: string,
                    port: number,
                    tls: boolean,
                    // Auth
                    login: string,
                    password: string,
                }
            }
        }
    }
}

/*----------------------------------
- TRANSPORTER
----------------------------------*/

export class LocalMailTransporter extends Transporter {
    public async send( emails: TCompleteEmail[] ) {
        await Promise.all( emails.map( email => new Promise(( resolve, reject ) => {

            transporter.sendMail({
    
                from: email.from,
                to: email.to,
                subject: email.subject,
                html: email.html
    
            }, (error, info): void => {
    
                if (error) {
                    reject(error);
                } else
                    resolve(info);
    
    
            });
    
        })));
    }
}

app.services.email.register( 'local', LocalMailTransporter );