/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import renderToString from "preact-render-to-string";
const safeStringify = require('fast-safe-stringify'); // remplace les références circulairs par un [Circular]
import React from 'react';

// Core
import ServerResponse from "@server/services/router/response";
import { PageResponse } from "@common/router/response";
import { ClientContext } from '@client/context';

// Composants UI
import Html from './document';
import App from '@client/App';
import DocumentStatic from "./document.static";

// Caches
const chunks = require('./chunk-manifest.json');

/*----------------------------------
- TYPES
----------------------------------*/

/*----------------------------------
- FONCTION
----------------------------------*/

export const staticDocument = () => renderToString(<DocumentStatic />);

export const page = async (
    page: PageResponse,
    response: ServerResponse,
    context: ClientContext
): Promise<string> => {

    // We render page & document separatly,
    // because document needs to access to runtime assigned values
    // Ex: runtime added scripts, title, metas, ....
    
    const html = renderToString(
        <App context={context} />
    );

    // 1 chunk peut regrouper plusieurs fihciers css / js
    // L'id du chunk est injecté depuis le plugin babel
    const pageChunks = [response.route.options["id"]];
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
                page.style.push({
                    id: chunk,
                    url: '/public/' + asset
                })
            // Si mode amp, on ne charge pas le JS react (rendu serveur uniquement)
            // Sauf si mode dev, car le hot reload est quand même bien pratique ...
            else if (!page.amp)
                page.scripts.push({
                    id: chunk,
                    url: '/public/' + asset
                });
        }

    }

    if (html === undefined)
        throw new Error(`Page HTML is empty (undefined)`);

    const ssrData = safeStringify(await response.forSsr(page));

    return renderToString(
        <Html page={page} request={response.request} ssrData={ssrData}>
            {html}
        </Html>
    );

}