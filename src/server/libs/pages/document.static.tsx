/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

// Core
import app, { services } from '@server/app';

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default () => {

    const routesForClient = JSON.stringify(services.router.ssrRoutes);
    return (
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
                    __html: `window.routes=${routesForClient};` + (app.env.profile === 'dev' ? 'window.dev = true;' : '')
                }} />
                <link rel="preload" href="/public/client.js" as="script" />
                <script defer type="text/javascript" src="/public/client.js" />

            </head>
            <body></body>
        </html>
    );

}
