/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import renderToString from "preact-render-to-string";
const safeStringify = require('fast-safe-stringify'); // remplace les références circulairs par un [Circular]

// Core
import { default as Router, TRouterContext } from "@server/services/router";
import type { Layout } from '@common/router';
import PageResponse, { TDataProvider, TFrontRenderer } from "@common/router/response/page";

// Composants UI
import App from '@client/app/component';

// Caches
const chunks = require('./chunk-manifest.json');

/*----------------------------------
- TYPES
----------------------------------*/

/*----------------------------------
- FONCTION
----------------------------------*/

export default class Page<TRouter extends Router = Router> extends PageResponse<TRouter> {

    public constructor(
        public dataProvider: TDataProvider | null,
        public renderer: TFrontRenderer,
        public context: TRouterContext,
        public layout?: Layout,

        public route = context.route,
        public router = context.request.router
        
    ) {

        super(dataProvider, renderer, context)
        
    }

    public render(): Promise<string> {

        // We render page & document separatly,
        // because document needs to access to runtime assigned values
        // Ex: runtime added scripts, title, metas, ....
        
        const html = renderToString(
            <App {...this.context} />
        );

        if (html === undefined)
            throw new Error(`Page HTML is empty (undefined)`);

        // Un chunk peut regrouper plusieurs fihciers css / js
        // L'id du chunk est injecté depuis le plugin babel
        this.addChunks();

        /*if (page.classeBody)
            attrsBody.className += ' ' + page.classeBody.join(' ');

        if (page.theme)
            attrsBody.className += ' ' + page.theme;

        // L'url canonique doit pointer vers la version html
        if (page.amp && fullUrl.endsWith('/amp'))
            fullUrl = fullUrl.substring(0, fullUrl.length - 4);*/

        return this.router.render.page(html, this, this.context.response);
    }

    // Define which chunks (script / style) to load
    private addChunks() {
        const pageChunks = [this.route.options["id"]];
        for (const chunk of pageChunks) {

            if (!chunk) continue;

            const assets = chunks[chunk];
            if (!assets) {
                console.warn(`Chunk ${chunk} was not found. Indexed chunks: ${Object.keys(chunks).join(', ')}`);
                continue;
            }

            for (let i = 0; i < assets.length; i++) {
                const asset = assets[i];

                if (asset.endsWith('.css'))
                    this.style.push({
                        id: chunk,
                        url: '/public/' + asset
                    })
                // Si mode amp, on ne charge pas le JS react (rendu serveur uniquement)
                // Sauf si mode dev, car le hot reload est quand même bien pratique ...
                else if (!this.amp)
                    this.scripts.push({
                        id: chunk,
                        url: '/public/' + asset
                    });
            }

        }
    }

    private getSocialMetas() {
        /*if (page.metas.imageUrl)
            page.metas.imageUrl = app.web.url + page.metas.imageUrl;

        if (!page.metas.metasAdditionnelles)
            page.metas.metasAdditionnelles = {};

        page.metas.metasAdditionnelles = {
            'og:locale': 'fr_FR',
            'og:site_name': app.identity.web.title,
            'og:title': page.title,
            'og:description': page.description,
            'og:url': fullUrl,

            ...(page.metas.imageUrl ? {
                'og:image': page.metas.imageUrl,
                ...(page.metas.imageX ? {
                    'og:image:width': page.metas.imageX.toString()
                } : {}),
                ...(page.metas.imageY ? {
                    'og:image:height': page.metas.imageY.toString()
                } : {})
            } : {}),

            'twitter:card': 'summary_large_image',
            'twitter:title': page.title,
            'twitter:description': page.description,
            'twitter:url': fullUrl,
            'twitter:text:title': page.title,

            ...(app.identity.social?.twitter? ? {
                'twitter:site': `@${app.identity.social?.twitter?}`,
                'twitter:creator': `@${app.identity.social?.twitter?}`
            } : {}),

            ...(page.metas.imageUrl ? {
                'twitter:image': page.metas.imageUrl,
                ...(page.metas.imageX ? {
                    'twitter:image:width': page.metas.imageX.toString()
                } : {}),
                ...(page.metas.imageY ? {
                    'twitter:image:height': page.metas.imageY.toString()
                } : {})
            } : {}),

            ...page.metas.metasAdditionnelles
        };*/
    }
}