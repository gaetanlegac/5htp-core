/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

// Core
import { router } from '@app';
import Button from '@client/components/button';

// App

/*----------------------------------
- RESSOURCES
----------------------------------*/

/*----------------------------------
- CONTROLEUR
----------------------------------*/
router.error(401, {  }, ({ }, { api, toast, modal, request, page }) => {

    request.response?.redirect('/');

    React.useEffect(() => {

        page?.go('/');


    }, []);

    return '';
});