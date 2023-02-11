/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import type { ComponentChild } from 'preact';

// Core
import Router from '@client/services/router/components/router';
import { ClientContext } from '@/client/context';

// Core components

// Resources
import "./index.less";

/*----------------------------------
- TYPES
----------------------------------*/


/*----------------------------------
- COMPOSANT
----------------------------------*/
export default function App ({ context, menu }: { 
    context: ClientContext,
    menu: ComponentChild
}) {

    const { router, page, toast } = context;

    return (
        <div id="internaLlayout">

            <div class="center row al-fill">

                <Router service={router} />
                
            </div>
        </div>
    )
}