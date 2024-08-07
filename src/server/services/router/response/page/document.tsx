/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import renderToString from "preact-render-to-string";
const safeStringify = require('fast-safe-stringify'); // remplace les références circulairs par un [Circular]

// Core
import type { default as Router, Response as ServerResponse } from "@server/services/router";
import type Page from '.';

/*----------------------------------
- TYPES
----------------------------------*/


/*----------------------------------
- SERVICE
----------------------------------*/
export default class DocumentRenderer<TRouter extends Router> {

    public constructor(
        public router: TRouter,
        public app = router.app
    ) {

    }

    public staticDocument() {
        const routesForClient = JSON.stringify( this.router.ssrRoutes );
        return '<!doctype html>' + renderToString(
            <html lang="en">
                <head>
                    {/* Format */}
                    <meta charSet="utf-8" />
                    <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1" />

                    {/* CSS */}
                    <link rel="stylesheet" type="text/css" href="/public/icons.css" />
                    <link rel="preload" href="/public/client.css" as="style" />
                    <link rel="stylesheet" type="text/css" href="/public/client.css" />

                    {/* JS */}
                    <script type="text/javascript" dangerouslySetInnerHTML={{
                        __html: `window.routes=${routesForClient};` + (this.app.env.profile === 'dev' ? 'window.dev = true;' : '')
                    }} />
                    <link rel="preload" href="/public/client.js" as="script" />
                    <script defer type="text/javascript" src="/public/client.js" />

                </head>
                <body></body>
            </html>
        );
    }

    public async page( html: string, page: Page, response: ServerResponse<TRouter> ) {

        // TODO: can be customized via page / route config
        const canonicalUrl = response.request.req.url;

        let attrsBody = {
            className: [...page.bodyClass].join(' '),
        };

        return '<!doctype html>' + renderToString(
            <html lang="en">
                <head>
                    {/* Format */}
                    <meta charSet="utf-8" />
                    <meta content="IE=edge" httpEquiv="X-UA-Compatible" />
                    <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1" />

                    {/* Basique*/}
                    <meta content={this.app.identity.web.title} name="apple-mobile-web-app-title" />
                    <title>{page.title}</title>
                    <meta content={page.description} name="description" />
                    <link rel="canonical" href={canonicalUrl} />

                    {this.metas( page )}

                    {this.styles( page )}

                    {await this.scripts( response, page )}

                    {/* Rich Snippets: https://schema.org/docs/full.html + https://jsonld.com/ */}
                    {/* <script type="application/ld+json" dangerouslySetInnerHTML={{
                        __html: JSON.stringify( schemaGenerator(page, route) )
                    }}/> */}

                </head>
                <body {...attrsBody} dangerouslySetInnerHTML={{ __html: html }}></body>
            </html>
        )
    }

    private metas( page: Page ) {
        return <>
            {/* Réseaux sociaux */}
            {/*page.metas.metasAdditionnelles && Object.entries(page.metas.metasAdditionnelles).map(
                ([ cle, val ]: [ string, string ]) => (
                    <meta name={cle} content={val} />
                )
                )*/}

            {/* Mobile */}
            <meta name="theme-color" content={this.app.identity.maincolor} />
            <meta name="msapplication-TileColor" content={this.app.identity.maincolor} />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-title" content={this.app.identity.web.title} />
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0"/>

            {/* Identité */}
            <meta name="mobile-web-app-capable" content="yes" />
            <meta name="application-name" content={this.app.identity.web.title} />
            <meta name="type" content="website" />

            {/* https://stackoverflow.com/questions/48956465/favicon-standard-2019-svg-ico-png-and-dimensions */}
            {/*<link rel="manifest" href={RES['manifest.json']} />*/}
            <link rel="shortcut icon" href="/public/app/favicon.ico" />
            <link rel="icon" type="image/png" sizes="16x16" href="/public/app/favicon-16x16.png" />
            <link rel="icon" type="image/png" sizes="32x32" href="/public/app/favicon-32x32.png" />
            <link rel="apple-touch-icon" sizes="180x180" href="/public/app/apple-touch-icon-180x180.png" />
            <meta name="msapplication-config" content="/public/app/browserconfig.xml" />

            {page.metas?.map(({ $, ...attrs }) => (
                React.createElement($, attrs)
            ))}
        </>
    }

    private styles( page: Page ) {
        return <>
            <link rel="stylesheet" type="text/css" href={"/public/icons.css?" + BUILD_ID} />
            <link rel="preload" href="/public/client.css" as="style" />
            <link rel="stylesheet" type="text/css" href="/public/client.css" />

            {page.style.map( style => 'url' in style ? <>
                <link rel="preload" href={style.url} as="style" />
                <link rel="stylesheet" type="text/css" href={style.url} />
            </> : <>
                <style id={style.id} dangerouslySetInnerHTML={{ __html: style.inline }} />
            </>)}
        </>
    }

    private async scripts( response: ServerResponse<TRouter>, page: Page ) {

        const context = safeStringify( response.forSsr(page) );

        const routesForClient = JSON.stringify( this.router.ssrRoutes );

        return <>
            {/* JS */}
            <script type="text/javascript" dangerouslySetInnerHTML={{ 
                __html: `window.ssr=${context}; window.routes=${routesForClient};` + (
                    this.app.env.profile === 'dev' ? 'window.dev = true;' : ''
                )
            }} />

            <link rel="preload" href={"/public/client.js?v=" + BUILD_ID} as="script" />
            <script defer type="text/javascript" src={"/public/client.js?v=" + BUILD_ID} />

            {page.scripts.map( script => 'url' in script ? <>
                <link rel="preload" href={script.url} as="script" />
                <script type="text/javascript" src={script.url} {...script.attrs || {}} />
            </> : <>
                <script type="text/javascript" {...script.attrs || {}} id={script.id} 
                    dangerouslySetInnerHTML={{ __html: script.inline }} />
            </>)}
        </>
    }
}