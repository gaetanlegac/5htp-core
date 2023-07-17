/*----------------------------------
- DEPENDANCES
----------------------------------*/

import './patch';

// Npm
import path from 'path';

// Core
import Services from '../service/container';
import ConfigParser, { TEnvConfig } from './config';

/*----------------------------------
- CLASS
----------------------------------*/
export class ApplicationContainer {

    /*----------------------------------
    - INIT
    ----------------------------------*/

    public Services = Services;
    public Environment: TEnvConfig;
    public Identity: Config.Identity;

    public constructor() {

        // Load config files
        const configParser = new ConfigParser( this.path.root );
        this.Environment = configParser.env();
        this.Identity = configParser.identity();
    }

    // Context
    public hmr: __WebpackModuleApi.Hot | undefined = module.hot;

    public path = {
        root: process.cwd(),
        public: path.join( process.cwd(), '/public'),
        var: path.join( process.cwd(), '/var'),

        client: {
            generated: path.join( process.cwd(), 'src', 'client', '.generated')
        },
        server: {
            generated: path.join( process.cwd(), 'src', 'server', '.generated')
        },
    }

    /*----------------------------------
    - HMR
    - TODO: move in dev server
    ----------------------------------*/
    private activateHMR() {

        if (!module.hot) return;

        console.info(`Activating HMR ...`);

        module.hot.accept();
        module.hot.accept( this.path.root + '/.cache/commun/routes.ts' );

        module.hot.addDisposeHandler((data) => {

            console.info(`Cleaning application ...`);

            // Services hooks
            //this.app.shutdown();

            /*
            console.log("[nettoyage] Arrêt serveur socket ...");
            if (socket !== undefined)
                socket.serveur.close()

            console.log("[nettoyage] Reset du cache requêtes JSQL ...");
            QueryParser.clearCache();*/

        });
    }

}

export default new ApplicationContainer;