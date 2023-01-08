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