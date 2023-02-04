/*----------------------------------
- DEPENDANCES
----------------------------------*/

if (typeof window === 'undefined')
    throw new Error(`This file shouldn't be loaded on server side !!!!`);

window.dev && require('preact/debug');

// Core
import { CoreError } from '@common/errors';
import type { Layout } from '@common/router';
import { createDialog } from '@client/components/Dialog/Manager';

// Local
import type { AnyService } from './service';

export { default as Service } from './service';

/*----------------------------------
- TYPES
----------------------------------*/

declare global {
    interface Window {
        dev: boolean,
        // Defined by loading gtag.js
        gtag: (action: string, name: string, params?: any) => void,
        /*context: ClientContext,
        user: User,*/
    }
}

export type TBugReportInfos = {
    stacktrace?: string,
    observation?: string,
    before?: string,
}

/*----------------------------------
- CLASS
----------------------------------*/
export default abstract class Application {

    public side = 'client' as 'client';

    private servicesList: AnyService[] = []

    // TODO: merge modal and toast in the same instance
    public modal = createDialog(this, false);
    public toast = createDialog(this, true);

    public constructor() {

    }

    public registerService( service: AnyService ) {
        console.log(`[app] Register service`, service.constructor?.name);
        this.servicesList.push(service);
    }

    public start() {
        this.bindErrorHandlers();
        this.startServices();
        this.boot();
    }

    public abstract boot(): void;

    public startServices() {

        console.log(`[app] Starting ${this.servicesList.length} services.`);

        for (const service of this.servicesList) {
            console.log(`[app] Start service`, service);
            service.start();
        }

        console.log(`[app] All ${this.servicesList.length} services were started.`);
    }

    public bindErrorHandlers() {

        // Impossible de recup le stacktrace ...
        /*window.addEventListener("unhandledrejection", (e) => {
            clientBug(JSON.stringify(e))
            console.log("unhandledrejection", e.stack);
            
        });*/
        
        window.onerror = (message, file, line, col, stacktrace) =>
            this.reportBug({
                stacktrace: stacktrace?.stack || JSON.stringify({ message, file, line, col })
            }).then(() => {

                // TODO in toas service: app.on('bug', () => toast.warning( ... ))
                /*context?.toast.warning("Bug detected", 
                    "A bug report has been sent, because I've detected a bug on the interface. I'm really sorry for the interruption.",
                    null,
                { autohide: false });*/

            })
    }

    public handleError( error: CoreError | Error, httpCode?: number ) {
    
        /*console.error(`[api] Network error:`, e);
        context.toast.error("Please check your internet connection and try again.", undefined, null, { autohide: false });*/
    }

    public reportBug = (infos: TBugReportInfos) => fetch('/help/bug/gui', {
        method: 'POST',
        headers: {
            'Accept': "application/json",
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            url: window.location.pathname,
            ssrData: JSON.stringify(window["ssr"]),
            guiVersion: BUILD_DATE,
            ...infos
        })
    })

    public setLayout(layout: Layout) {
        throw new Error(`page.setLayout has been called before the function is assigned from the <App /> component.`);
    };
}   