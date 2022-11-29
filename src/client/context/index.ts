/*----------------------------------
- DEPENDANCES
----------------------------------*/

// npm
import React from 'react';
import type { ComponentChild } from 'preact';

// Core
import { createDialog } from '@client/components/Dialog/Manager';
import BaseRequest from '@common/router/request';
import router, { TClientRoute } from '@client/router';
import PageResponse from '@common/router/response/page';

// Services
import Recaptcha from './captcha';
import SocketClient from './socket';

/*----------------------------------
- TYPES
----------------------------------*/

import type { Layout } from '@common/router';

export type TBugReportInfos = {
    stacktrace?: string,
    observation?: string,
    before?: string,
}

/*----------------------------------
- HOOKS
----------------------------------*/

// Sera initialisé via le routeur
export const ReactClientContext = React.createContext<ClientContext>({} as ClientContext);
export default (): ClientContext => React.useContext<ClientContext>(ReactClientContext);

// Hooks
/*export { default as useState } from '@client/hooks/useState';
export type { TActions as TActionsState } from '@client/hooks/useState';
export { default as useComponent } from '@client/hooks/useComponent';
export { default as useScript } from '@client/hooks/useScript';*/

// Utils
export const Switch = (val: string | number, options: { [cle: string]: ComponentChild }) => {
    return (val in options) ? options[val] : null;
}

export const useState = <TData extends TObjetDonnees>(initial: TData): [
    TData,
    (data: Partial<TData>) => void
] => {
    const [state, setState] = React.useState<TData>(initial);
    const setPartialState = (data: Partial<TData>) => setState(current => ({ ...current, ...data }));
    return [state, setPartialState]
}

/*----------------------------------
- CONTEXT
----------------------------------*/
export class ClientContext {

    public context = this; // To access to the full nstance within a destructuration
    public user: User | null;

    public id = Date.now();
    public bridges: { [name: string]: Function } = {};
    public setLayout?: (layout: Layout) => void;

    public loadIndicator;
    public loading(state: boolean) {

        if (state === true) {
            if (!document.body.classList.contains("loading"))
                document.body.classList.add("loading");
        } else {
            document.body.classList.remove("loading");
        }

    }

    // Doit etre initialisé le plus tot possible
    public page!: PageResponse;
    public async createPage(
        route: TClientRoute,
        data?: TObjetDonnees
    ) {
        
        this.page = new PageResponse(this, route);

        // Load the fetchers list to load data if needed
        if (route.controller)
            this.page.fetchers = route.controller(this.request.data, this);

        if (data !== undefined) {
            this.page.loading = false;
            this.page.data = data;
        }

        return this.page;

    }

    public constructor(
        public request: BaseRequest, 
        public clientBug?: (infos: TBugReportInfos) => any 
    ) {
       
        this.request = request;
        this.user = this.request.user || null;

    }

    // Is overwrote by the native app
    public Application = {
        platform: () => 'web',
        
        // Actions on the native app 
        reloadDaemon: () => { },
        reloadGui: () => {
            this.page?.go('/');
        },
        optimize: () => {},

        // After auth
        auth: (token: string, email: string) => {
            localStorage?.setItem("latestemail", email);
            this.page?.go('/');
        },
        // Google one tap click
        googleAuth: () => {
            window.location.replace("/auth/google");
        },
        logout: undefined as undefined | (() => void),
    }

    public async connectApp() {

        // TODO: Chrome extension

        // Android
        if (window["Application"]) {

            console.log("Connecting android app ...", window["Application"]);

            this.Application = window["Application"];

        // Web
        }

        if (window["ssr"] === undefined) {
            this.user = this.request.user = await this.api.get('/user').run();
        }
    }

    // fetch doit appartenir à response, et non clientcontxt
    // car la méthode varie selon client (http) ou serveur (router.resolve)
    public api = {
        ...this.request.api,
        set: (newData: TObjetDonnees) => {

            console.log("[api] Update page data", newData);
            if (this.page)
                this.page.setAllData(curData => ({ ...curData, ...newData }));
            
        },
        reload: (ids?: string | string[], params?: TObjetDonnees) => {
            
            if (this.page === undefined)
                throw new Error("context.page is missing");

            if (ids === undefined)
                ids = Object.keys(this.page.fetchers);
            else if (typeof ids === 'string')   
                ids = [ids];

            console.log("[api] Reload data", ids, params, this.page.fetchers);

            for (const id of ids) {

                const fetcher = this.page.fetchers[id];
                if (fetcher === undefined)
                    return console.error(`Unable to reload ${id}: Request not found in fetchers list.`);

                if (params !== undefined)
                    fetcher.data = { ...(fetcher.data || {}), ...params };

                console.log("[api][reload]", id, fetcher.method, fetcher.path, fetcher.data);
                const indicator = this.toast.loading("Loading ...");

                this.request.fetchAsync(fetcher.method, fetcher.path, fetcher.data).then((data) => {

                    this.api.set({ [id]: data });

                }).finally(() => {

                    indicator.close(true);

                })
            }
        }
    }

    public handleError(e: Error) {
        switch (e.http) {
            case 401:
                this.page?.go('/');
                break;
            default:
                this.toast.error(e.title || "Uh Oh ...", e.message, null, { autohide: false });
                break;
        }
    }

    public register(
        services: { [id: string]: (response: ClientContext) => any },
        bridges: { [name: string]: Function } = {}
    ) {
        for (const id in services) {
            console.log('Registering service', id);
            this[id] = services[id](this);
        }

        for (const id in bridges) {
            console.log('Registering bridge', id);
            this.bridges[id] = bridges[id];
        }
    }

    // Services
    public modal = createDialog(this, false);
    public toast = createDialog(this, true);
    public socket = new SocketClient(this)
    public captcha = new Recaptcha(this);

    // Tracking
    public event( name: string, params?: object ) {
        if (!window.gtag) return;
        if (name === 'pageview')
            window.gtag('send', name);
        else
            window.gtag('event', name, params);
    }

}