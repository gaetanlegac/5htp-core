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
router.error( 404, ({ message, modal }) => {

    useHeader({
        title: 'Page Not Found',
        subtitle: message
    });

    return (
        <div class="card w-3-4 col al-center pd-2">

            <i src="times-circle" class="fg error xxl" />

            <h1>Page Not Found</h1>

            <p>{message}</p>

            <Button type="primary" link="/">Go Home</Button>
        </div>
    )
});