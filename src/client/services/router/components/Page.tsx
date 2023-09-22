/*----------------------------------
- DEPENDANCES
----------------------------------*/
// Npm
import React from 'react';

// Core
import useContext from '@/client/context';

// Specific
import type Page from '../response/page';

/*----------------------------------
- PAGE STATE
----------------------------------*/

export default ({ page }: { page: Page }) => {

    /*----------------------------------
    - CONTEXT
    ----------------------------------*/
    const context = useContext();

    const [apiData, setApiData] = React.useState<{[k: string]: any} | null>( 
        page.data || {}
    );
    page.setAllData = setApiData;
    context.data = apiData;

    /*----------------------------------
    - RENDER
    ----------------------------------*/
    //  Make request parameters and api data accessible from the page component
    return page.renderer ? (

        <page.renderer 
            // Services
            {...context} 
            // API data & URL params
            data={{
                ...apiData,
                ...context.request.data
            }}
            context={context}
        />
        
    ) : 'Renderer missing'
}