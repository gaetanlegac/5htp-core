/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { VNode } from 'preact';

// Core
import app, { services } from '@server/app';

/*----------------------------------
- TYPES
----------------------------------*/

import ServerRequest from '../../services/router/request';
import { TSsrData } from '../../services/router/response';
import PageResponse from '@common/router/response/page';

/*----------------------------------
- RESSOURCES
----------------------------------*/


/*----------------------------------
- COMPOSANT
----------------------------------*/
export default ({ page, children: html, request, ssrData }: {
    page: PageResponse,
    children: string,
    request: ServerRequest,
    ssrData: TSsrData
}) => {

    const routesForClient = JSON.stringify( services.router.ssrRoutes );

    const fullUrl = services.http.publicUrl + request.path;

    let attrsBody = {
        className: [...page.bodyClass].join(' '),
    };

    /*if (page.classeBody)
        attrsBody.className += ' ' + page.classeBody.join(' ');

    if (page.theme)
        attrsBody.className += ' ' + page.theme;

    // L'url canonique doit pointer vers la version html
    if (page.amp && fullUrl.endsWith('/amp'))
        fullUrl = fullUrl.substring(0, fullUrl.length - 4);*/


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

    return (
        <html lang="en" {...(page.amp ? { amp: "true" } : {})}>
            <head>
                {/* Format */}
                <meta charSet="utf-8" />
                {page.amp && ( // As a best practice, you should include the script as early as possible in the <head>.
                    <script async={true} src="https://cdn.ampproject.org/v0.js"></script>
                )}
                <meta content="IE=edge" httpEquiv="X-UA-Compatible" />
                <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1" />
                {!page.amp && page.amp && (
                    <link rel="amphtml" href={fullUrl + '/amp'} />
                )}

                {/* Basique*/}
                <meta content={app.identity.web.title} name="apple-mobile-web-app-title" />
                <title>{page.title}</title>
                <meta content={page.description} name="description" />
                <link rel="canonical" href={fullUrl} />

                {/* Réseaux sociaux */}
                {/*page.metas.metasAdditionnelles && Object.entries(page.metas.metasAdditionnelles).map(
                    ([ cle, val ]: [ string, string ]) => (
                        <meta name={cle} content={val} />
                    )
                    )*/}

                {/* Mobile */}
                <meta name="theme-color" content={app.identity.maincolor} />
                <meta name="msapplication-TileColor" content={app.identity.maincolor} />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-title" content={app.identity.web.title} />

                {/* Identité */}
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="application-name" content={app.identity.web.title} />
                <meta name="type" content="website" />
                {/*app.identity.social?.facebook?.appId && (
                    <meta content={app.identity.social?.facebook?.appId} property="fb:appid" />
                )*/}

                {/* https://stackoverflow.com/questions/48956465/favicon-standard-2019-svg-ico-png-and-dimensions */}
                {/*<link rel="manifest" href={RES['manifest.json']} />*/}
                <link rel="shortcut icon" href="/public/app/favicon.ico" />
                <link rel="icon" type="image/png" sizes="16x16" href="/public/app/favicon-16x16.png" />
                <link rel="icon" type="image/png" sizes="32x32" href="/public/app/favicon-32x32.png" />
                <link rel="apple-touch-icon" sizes="180x180" href="/public/app/apple-touch-icon-180x180.png" />
                <meta name="msapplication-config" content="/public/app/browserconfig.xml" />

                {/* CSS */}
                <link rel="stylesheet" type="text/css" href="/public/icons.css" />
                <link rel="preload" href="/public/client.css" as="style" />
                <link rel="stylesheet" type="text/css" href="/public/client.css" />

                {page.style.map( style => 'url' in style ? <>
                    <link rel="preload" href={style.url} as="style" />
                    <link rel="stylesheet" type="text/css" href={style.url} />
                </> : <>
                    <style id={style.id} dangerouslySetInnerHTML={{ __html: style.inline }} />
                </>)}

                {/* Sera remplacé par la chaine exacte après renderToStaticMarkup */}
                {page.amp && (<style amp-boilerplate=""></style>)}

                {/* JS */}
                {!page.amp && (
                    <script type="text/javascript" dangerouslySetInnerHTML={{ 
                        __html: `window.ssr=${ssrData}; window.routes=${routesForClient};` + (app.env.profile === 'dev' ? 'window.dev = true;' : '')
                    }} />
                )}

                <link rel="preload" href="/public/client.js" as="script" />
                <script defer type="text/javascript" src="/public/client.js" />

                {page.scripts.map( script => 'url' in script ? <>
                    <link rel="preload" href={script.url} as="script" />
                    <script type="text/javascript" src={script.url} {...script.attrs || {}} />
                </> : <>
                    <script type="text/javascript" {...script.attrs || {}} id={script.id} dangerouslySetInnerHTML={{ __html: script.inline }} />
                </>)}

                <script async src={"https://www.googletagmanager.com/gtag/js?id=" + app.config.tracking.ga.pub}></script>
                <script dangerouslySetInnerHTML={{ __html: `
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());

                    gtag('config', '${app.config.tracking.ga.pub}', {
                        send_page_view: false
                    });
                `}} />

                {/* Rich Snippets: https://schema.org/docs/full.html + https://jsonld.com/ */}
                {/* <script type="application/ld+json" dangerouslySetInnerHTML={{
                    __html: JSON.stringify( schemaGenerator(page, route) )
                }}/> */}

            </head>
            <body {...attrsBody} dangerouslySetInnerHTML={{ __html: html }}></body>
        </html>
    );

}
