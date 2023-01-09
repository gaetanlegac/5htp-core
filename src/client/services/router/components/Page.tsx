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
        page.loadIndicator ? null : page.data 
    );
    page.setAllData = setApiData;
 
    React.useEffect(() => {

        // Fetch the data asynchronously for the first time
        if (apiData === null && isCurrent)
            page.fetchData().then( loadedData => {
                page.loadIndicator = false;
                setApiData(loadedData);
            })

    }, []);

    return (
        <div 
            class={"page" + (isCurrent ? ' current' : '')} 
            id={page.chunkId === undefined ? undefined : 'page_' + page.chunkId}
        >

            {/* Make request parameters and api data accessible from the page component */}
            {page.renderer ? (

                <page.renderer 
                    // Services
                    {...context} 
                    // URL params
                    {...context.request.data} 
                    // API data
                    {...apiData} 
                />
                
            ) : null}

        </div>
    )
}