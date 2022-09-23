/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

// Core
import route from '@router';
import Button from '@client/components/button';

// App

/*----------------------------------
- RESSOURCES
----------------------------------*/

/*----------------------------------
- CONTROLEUR
----------------------------------*/
route.error(401, {  }, ({ }, { api, toast, modal, request, page }) => {

    request.response?.redirect('/');

    React.useEffect(() => {

        page?.go('/');


    }, []);

    return '';
});