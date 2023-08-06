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

export default ({ page, isCurrent }: { page: Page, isCurrent?: boolean }) => {

    const context = useContext();

    const [apiData, setApiData] = React.useState<{[k: string]: any} | null>( 
        page.loading  ? null : page.data 
    );
    page.setAllData = setApiData;
    context.data = apiData;
 
    React.useEffect(() => {

        // Fetch the data asynchronously for the first time
        if (/*apiData === null && */isCurrent)
            page.fetchData().then( loadedData => {
                page.loading  = false;
                setApiData(loadedData);
            })

    }, [page]);

    /*
        <div 
            class={"page" + (isCurrent ? ' current' : '')} 
            id={page.chunkId === undefined ? undefined : 'page_' + page.chunkId}
        >
    */

    //  Make request parameters and api data accessible from the page component
    return page.renderer ? (

        <page.renderer 
            // Services
            {...context} 
            // URL params
            {...context.request.data} 
            // API data
            data={apiData}
        />
        
    ) : null
}