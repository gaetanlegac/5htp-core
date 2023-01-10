/*----------------------------------
- DEPENDANCES
----------------------------------*/

/* NOTE: On évite d'utiliser les alias ici,
        Afin que l'envoi des rapports de bug fonctionne même en cas d'erreur avec les alias
*/

// Core
import Application, { Service } from '@server/app';

// Speciic
import { jsonToHtml } from './utils';
import type { Transporter } from './transporter';

/*----------------------------------
- SERVICE CONFIG
----------------------------------*/

export type Config = {
    debug: boolean,
    default: {
        transporter: string,
        from: string
    },
    transporters: {
        [transporterName: string]: Transporter
    },
    bugReport: {
        from: string,
        to: string
    }
}

export type Hooks = {

}

/*----------------------------------
- TYPES: EMAILS
----------------------------------*/

export { Transporter } from './transporter';

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
type TOptions = {
    transporter?: string,
    testing?: boolean
}

/*----------------------------------
- FONCTIONS
----------------------------------*/
export default class Email extends Service<Config, Hooks, Application> {
    
    private transporters = this.config.transporters;

    public async register() {

    }

    public async start() {
        
    }


    public async send(
        emails: TEmail | TEmail[],
        options: TOptions = {}
    ): Promise<void> {

        // Normalisation en tableau
        if (!Array.isArray( emails ))
            emails = [emails];

        this.config.debug && console.log(`Preparing to send ${emails.length} emails ...`);

        const emailsToSend: TCompleteEmail[] = emails.map(email => {

            const from = email.from === undefined
                ? this.config.default.from
                : email.from;

            const to = typeof email.to === 'string'
                ? [email.to]
                : email.to;

            // Via template
            // TODO: Restore templates feature
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

        const transporterName = options.transporter || this.config.default.transporter;
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

        const transporter = this.transporters[ transporterName ];
        await transporter.send(emailsToSend);

    }
}