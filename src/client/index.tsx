/*----------------------------------
- DEPENDANCES
----------------------------------*/
window.dev && require('preact/debug');

import * as testLayouts from '@/client/pages/**/_layout/index.tsx';

// Npm
import React from 'react';
import ReactDOM from 'react-dom';

// Core libs
import router from '@client/router';
import { location } from '@client/router/request/history';
import coreRoutes from '@client/pages/**/*.tsx';
import appRoutes from '@/client/pages/**/*.tsx';

import ClientResponse from './router/response';
import ClientRequest from './router/request';
import { ClientContext, TBugReportInfos } from '@client/context';
import PageResponse from '@common/router/response/page';
import type { TSsrData } from '@server/services/router/response';

// Core components
import App from '@client/App';

/*----------------------------------
- types
----------------------------------*/

declare global {
    interface Window {
        dev: boolean,
        context: ClientContext,
        user: User,
        gtag: (action: string, name: string, params?: any) => void
    }
}

/*----------------------------------
- BUG REPORT
----------------------------------*/
const clientBug = (infos: TBugReportInfos) => fetch('/help/bug/gui', {
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

// Impossible de recup le stacktrace ...
/*window.addEventListener("unhandledrejection", (e) => {
    clientBug(JSON.stringify(e))
    console.log("unhandledrejection", e.stack);
    
});*/

window.onerror = (message, file, line, col, stacktrace) =>
    clientBug({
        stacktrace: stacktrace?.stack || JSON.stringify({ message, file, line, col })
    }).then(() => {

        if (context)
            context.toast.warning("Bug detected", 
                "A bug report has been sent, because I've detected a bug on the interface. I'm really sorry for the interruption.",
                null,
            { autohide: false });

    })

/*----------------------------------
- LAUNCH APP
----------------------------------*/
const ssrResponse = window["ssr"] as (TSsrData | undefined);

if (!location)
    throw new Error(`Unable to retrieve current location.`);

let context: ClientContext;
try {
    const request = new ClientRequest(location, window.context);
    request.context = window.context = context = request.gui = new ClientContext(request, clientBug);

    router.initialize({ ...coreRoutes, ...appRoutes }, async (route) => {

        // Restituate SSR response
        let renderer = ReactDOM.render;
        if (ssrResponse) {

            console.log("SSR Response restitution ...");

            if (!route)
                throw new Error(`Route ${ssrResponse.page.id} was not found in ssr routes list.`);

            context.user = request.user = ssrResponse.user || null;

            request.data = ssrResponse.request.data;

            request.response = new ClientResponse<PageResponse>(
                request,
                route
            );

            await context.createPage(route, ssrResponse.page.data);

            renderer = ReactDOM.hydrate;
        }

        await context.connectApp();

        renderer( <App context={context} />, document.body, () => {

            console.log(`Render complete`);

        });
    }, context);


} catch (error) {

    clientBug({ stacktrace: error.stack || error.message });

}