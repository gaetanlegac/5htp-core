/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

// Core
import { router } from '@app';
import { Button } from '@client/components';

// App
import useHeader from '@client/pages/useHeader';

/*----------------------------------
- CONTROLEUR
----------------------------------*/
router.error( 500, ({ message }) => {

    useHeader({
        title: 'Technical Error',
        subtitle: message
    });

    return (
        <div class="col pd-2">

            <i src="times-circle" class="fg error xxl" />

            <h1>Technical Error</h1>

            <p>{message}</p>

            <Button type="primary" link="/">Go Home</Button>
        </div>
    )
});