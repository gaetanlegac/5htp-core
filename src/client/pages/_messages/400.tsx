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
router.error(400, {}, ({ message, modal }) => {

    if (!message)
        message = "The request you made is incorrect.";

    useHeader({
        title: 'Bad request',
        subtitle: message
    });

    return (
        <div class="col pd-2">
            <i src="times-circle" class="txtPrimary xxl" />

            <h1>Bad request</h1>

            <p>{message}</p>
        </div>
    )

});