/*----------------------------------
- DEPENDANCES
----------------------------------*/

/* NOTE: On évite d'utiliser les alias ici,
        Afin que l'envoi des rapports de bug fonctionne même en cas d'erreur avec les alias
*/

// Core
import app, { $ } from '@server/app';
//import templates from './templates';
const templates = {} as {[template: string]: (data: any) => string}
import { jsonToHtml } from './utils';

/*----------------------------------
- SERVICE CONFIG
----------------------------------*/

export type EmailServiceConfig = {
    debug: boolean,
    default: {
        transporter: string,
        from: string
    },
    transporters: Core.EmailTransporters
}

declare global {
    namespace Core {
        interface EmailTransporters { }
        namespace Config {
            interface Services {
                email: EmailServiceConfig
            }
        }
    }
}
    
/*----------------------------------
- TYPES: EMAILS
----------------------------------*/

export type TEmail = THtmlEmail | TTemplateEmail;

type TBaseEmail = { 
    to: string | string[], 
    from?: string 
};

export type THtmlEmail = TBaseEmail & {
    subject: string,
    html: string | { [label: string]: any },
}

export type TTemplateEmail = TBaseEmail & {
    template: keyof typeof templates,
    data?: TObjetDonnees
}

export type TCompleteEmail = With<THtmlEmail, {
    to: string[],
    from: string,
}>;

/*----------------------------------
- TYPES: OPTIONS
----------------------------------*/

export abstract class Transporter {
    public abstract send( emails: TCompleteEmail[] ): Promise<void>;
}

type TOptions = {
    transporter?: string,
    testing?: boolean
}

const config = app.config.email;

/*----------------------------------
- FONCTIONS
----------------------------------*/
export default class Email {

    private transporters = {} as {[name: string]: Transporter};
    public register( name: string, transporter: (new () => Transporter) ) {
        console.log(`[email] registering email transporter: ${name}`);
        this.transporters[ name ] = new transporter();
    }

    public load() {
        $.console.bugReport.addTransporter('email', (report) => this.send(report.type === 'server' ? {
            to: app.identity.author.email,
            subject: "Bug on server: " + (report.error.message),
            html: `
                <a href="${app.env.url}/admin/activity/requests/${report.channelId}">
                    View Request details & console
                </a>
                <br/>
                ${report.logs}
            `
        } : {
            to: app.identity.author.email,
            subject: "Bug on application " + (report.action),
            html: {
                ...report
            }
        }));
        
    }

    public async send(
        emails: TEmail | TEmail[],
        options: TOptions = {}
    ): Promise<void> {

        // Normalisation en tableau
        if (!Array.isArray( emails ))
            emails = [emails];

        config.debug && console.log(`Preparing to send ${emails.length} emails ...`);

        const emailsToSend: TCompleteEmail[] = emails.map(email => {

            const from = email.from === undefined
                ? config.default.from
                : email.from;

            const to = typeof email.to === 'string'
                ? [email.to]
                : email.to;

            // Via template
            if ('template' in email) {

                const template = templates[email.template];

                if (template === undefined)
                    throw new Error(`Impossible de charger la template email ${email.template} depuis le cache (NotFound).`);

                const txt = template(email.data || {})

                const delimTitre = txt.indexOf('\n\n');

                return {
                    ...email,
                    // Vire le "> " au début
                    subject: txt.substring(2, delimTitre),
                    html: txt.substring(delimTitre + 2),
                    from,
                    to
                }

            }

            return {
                ...email,
                html: typeof email.html === "string" 
                    ? email.html 
                    : jsonToHtml(email.html),
                from,
                to
            }
            
        });

        const transporterName = options.transporter || app.config.email.default.transporter;
        if (transporterName === undefined)
            throw new Error(`Please define at least one mail transporter.`);

        console.info(`Sending ${emailsToSend.length} emails via transporter "${transporterName}"`, emailsToSend[0].subject);

        // Pas d'envoi d'email quand local
        /*if (app.env.name === 'local' && options.testing !== false) {
            console.log(`Email send canceled: Test mode enabled, or you're in local`, { 
                'options.testing': options.testing,
                'app.env.name': app.env.name,
            });
            return;
        } else */if (emailsToSend.length === 0) {
            console.log(`No email to send.`);
            return;
        }

        const Transporter = this.transporters[ transporterName ];
        await Transporter.send(emailsToSend);

    }
}

/*----------------------------------
- REGISTER SERVICE
----------------------------------*/
app.register('email', Email);
declare global {
    namespace Core {
        interface Services {
            email: Email;
        }
    }
}