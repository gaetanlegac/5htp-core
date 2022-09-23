/*----------------------------------
- DEPENDANCES
----------------------------------*/

import Handlebars, { TemplateDelegate } from 'handlebars';

//import * as templates from '@cache/serveur/emails';
import templatesDefault from '@root/default/serveur/emails/*.hbs';
import templatesProjet from '@/*/serveur/emails/*.hbs';
const templates = { ...templatesDefault, ...templatesProjet }
import url from '@commun/routeur/url';

/*----------------------------------
- HELPERS   
----------------------------------*/

Handlebars.registerHelper('plur', (mot: string, nb: number) =>
    mot + (nb > 1 ? 's' : '')
)

Handlebars.registerHelper('url', (route: string, params?: any, absolu?: boolean) =>
    url(route, params, absolu)
)

/*----------------------------------
- FONCTIONS
----------------------------------*/
const cache: {[nomTemplate: string]: TemplateDelegate} = {}

export const compiler = async () => {

    console.log(`[boot] Précompilation de ${Object.keys(templates).length} templates email`);

    try {
        for (const nomTemplate in templates) {

            const template = templates[nomTemplate];

            cache[ nomTemplate ] = Handlebars.compile(template, {
                strict: true, // Erreur quand variable inexistante
            });
    
        }
    } catch (error) {
        console.error(`Erreur lors de la précompilation des templates email:`, error);
    }
}

export default cache