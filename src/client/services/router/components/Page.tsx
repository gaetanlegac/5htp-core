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

    // Temporary fix: context.page may not be updated at this stage
    //  Seems to be the case when we change page, but still same page component with different data
    context.page = page;

    // Bind data
    const [apiData, setApiData] = React.useState<{[k: string]: any} | null>( page.data || {});
    page.setAllData = setApiData;
    context.data = apiData;

    // Page component has not changed, but data were updated (ex: url parameters change)
    React.useEffect(() => {

        setApiData(page.data);

    }, [page.data]);

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