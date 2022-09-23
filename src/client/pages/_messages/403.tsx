/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

// Core
import route from '@router';
import Button from '@client/components/button';

// App
import useHeader from '@client/pages/useHeader';

/*----------------------------------
- CONTROLEUR
----------------------------------*/
route.error( 403, {}, ({ message }, { modal }) => {

    if (!message)
        message = "You do not have sufficient permissions to access this content.";

    useHeader({
        title: 'Access Denied.',
        subtitle: message
    });

    return (
        <div class="col pd-2">
            <i src="times-circle" class="txtPrimary xxl" />

            <h1>Access Denied.</h1>

            <p>{message}</p>
        </div>
    )
});