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
- CONTROLEUR
----------------------------------*/
Router.error( 400, ({ message, modal }) => {

    useHeader({
        title: 'Bad request',
        subtitle: message
    });

    return (
        <div class="card w-3-4 col al-center pd-2">

            <i src="times-circle" class="fg error xxl" />

            <h1>Bad Request</h1>

            <p>{message}</p>

            <Button type="primary" link="/">Go Home</Button>
        </div>
    )
});