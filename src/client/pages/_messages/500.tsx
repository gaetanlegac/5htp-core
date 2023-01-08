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
router.error( 500, {}, ({ message }) => {

    if (!message)
        message = "A technical error occurred.";

    useHeader({
        title: 'Technical Error',
        subtitle: message
    });

    return (
        <div class="col pd-2">
            <i src="times-circle" class="txtPrimary xxl" />

            <h1>Technical Error</h1>

            <p>{message}</p>
        </div>
    )
});