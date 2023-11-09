/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

// Core
import { Router } from '@app';
import { Button } from '@client/components';

// App
import useHeader from '@client/pages/useHeader';

/*----------------------------------
- RESSOURCES
----------------------------------*/

/*----------------------------------
- CONTROLEUR
----------------------------------*/
Router.error( 401, ({ message, request, page }) => {

    request.response?.redirect('https://becrosspath.com');

    useHeader({
        title: 'Authentication Required',
        subtitle: message
    });

    React.useEffect(() => {

        page?.go('/');

    }, []);

    return (
        <div class="card w-3-4 col al-center pd-2">

            <i src="times-circle" class="fg error xxl" />

            <h1>Authentication Required</h1>

            <p>{message}</p>

            <Button type="primary" link="/">Go Home</Button>
        </div>
    )
});