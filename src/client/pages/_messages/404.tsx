/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

// Core
import { router } from '@app';
import Button from '@client/components/button';

// App
import useHeader from '@client/pages/useHeader';

/*----------------------------------
- CONTROLEUR
----------------------------------*/
router.error( 404, {}, ({ message }, { modal }) => {

    if (!message)
        message = "The content you asked for was not found.";

    useHeader({
        title: 'Page Not Found',
        subtitle: message
    });

    return (
        <div class="col pd-2">
            <i src="times-circle" class="txtPrimary xxl" />

            <h1>Page Not Found</h1>

            <p>{message}</p>
        </div>
    )
});