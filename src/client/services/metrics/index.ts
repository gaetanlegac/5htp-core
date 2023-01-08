/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm

// Core
import type ClientApplication from '@client/app';

/*----------------------------------
- TYPES
----------------------------------*/



/*----------------------------------
- SERVICE
----------------------------------*/
export default class ClientMetrics {

    public constructor( public app: ClientApplication ) {

    }

    public start() {
        
    }

    // Tracking
    public event( name: string, params?: object ) {
        if (!window.gtag) return;
        if (name === 'pageview')
            window.gtag('send', name);
        else
            window.gtag('event', name, params);
    }
}