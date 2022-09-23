// Lancement en tant que root = risque sécurité
if (process.getuid && process.getuid() === 0) {
    console.error("Ne lance pas un serveur en root, pauvre fou !");
    process.exit(1);
}

const moduleAlias = require('module-alias')
moduleAlias.addAliases({
    'react': "preact/compat",
    'react-dom': "preact/compat",
})

/*----------------------------------
- DEBUG
----------------------------------*/

// Gestion crash
process.on('unhandledRejection', (error: any, promise: any) => {

    console.error("Unhandled promise rejection:", error);

});

/*----------------------------------
- DATES & TIMZEONE
----------------------------------*/
process.env.TZ = 'Europe/Paris';

// https://www.npmjs.com/package/javascript-time-ago#intl
import IntlPolyfill from 'intl'
const locales = ['en'];
if (typeof Intl === 'object') {
    if (!Intl.DateTimeFormat || Intl.DateTimeFormat.supportedLocalesOf(locales).length !== locales.length) {
        Intl.DateTimeFormat = IntlPolyfill.DateTimeFormat
    }
} else {
    global.Intl = IntlPolyfill
}