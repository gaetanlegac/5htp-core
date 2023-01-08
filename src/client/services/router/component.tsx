/*----------------------------------
- DEPENDANCES
----------------------------------*/
// Npm
import React from 'react';

// Libs
import useContext from '@/client/context';
import type Router from '.';
import ClientRequest from './request';
//import initTooltips from '@client/components/Donnees/Tooltip';
import type Page from './response/page';

// Navigation
import { history, location, Update } from './request/history';

/*----------------------------------
- TYPES
----------------------------------*/

export type PropsPage<TParams extends { [cle: string]: unknown }> = TParams & {
    data: {[cle: string]: unknown}
}

/*----------------------------------
- PAGE STATE
----------------------------------*/

const LogPrefix = `[router][component]`

/*----------------------------------
- PAGE STATE
----------------------------------*/

const PageComponent = ({ page, isCurrent }: { page: Page, isCurrent?: boolean }) => {

    const context = useContext();

    const [data, setData] = React.useState<{[k: string]: any} | null>( 
        page.loadIndicator ? null : page.data 
    );
    page.setAllData = setData;
 
    React.useEffect(() => {

        // Fetch the data asynchronously for the first time
        if (data === null && isCurrent)
            page.fetchData().then( loadedData => {
                page.loadIndicator = false;
                setData(loadedData);
            })

    }, []);

    return (
        <div 
            class={"page" + (isCurrent ? ' current' : '')} 
            id={page.chunkId === undefined ? undefined : 'page_' + page.chunkId}
        >

            {/* Make request parameters and api data accessible from the page component */}
            {page.renderer ? (

                <page.renderer {...context} {...context.request.data} {...data} />
                
            ) : null}

        </div>
    )
}

/*----------------------------------
- COMPONENT
----------------------------------*/
export default ({ service: router }: { service: Router }) => {

    const context = useContext();

    const [pages, setPages] = React.useState<{
        current: undefined | Page,
        //previous: undefined | Page
    }>({
        current: context.page,
        //previous: undefined
    });
    
    const resolvePage = async (request: ClientRequest, locationUpdate?: Update) => {

        // WARNING: Don"t try to play with pages here, since the object will not be updated
        //  If needed to play with pages, do it in the setPages callback below

        // Load the route chunks
        context.request = request;
        const newpage = context.page = await router.resolve(request);

        // Page not found: Directly load with the browser
        if (newpage === undefined) {
            window.location.replace(request.path);
            return;
        // Unable to load (no connection, server error, ....)
        } else if (newpage === null) {
            return;
        }

        // Set.loadIndicator state
        newpage.loadIndicator = <i src="spin" />
        // Add page container
        setPages( pages => {

            const currentRoute = pages.current?.route;

            // Check if the page changed
            if (currentRoute?.path === request.path)  {
                console.warn(LogPrefix, "Canceling navigation to the same page:", {...request});
                return pages;
            }

            // If if the layout changed
            const curLayout = currentRoute?.options.layout;
            const newLayout = newpage?.route.options.layout;
            if (newLayout && curLayout && newLayout.path !== curLayout.path) {
                console.log(LogPrefix, `Changing layout. Before:`, curLayout, 'New layout:', newLayout);
                context.app.setLayout(newLayout);
            }

            // Remove old page after the aff-page css transition
            const oldPage = pages.current;
            if (oldPage !== undefined) {
                setTimeout(() => setPages({ 
                    current: newpage,
                    //previous: undefined
                }), 500);
            }

            return  {
                current: newpage,
                //previous: oldPage
            }
        });
    }

    const restoreScroll = (currentPage?: Page) => currentPage?.scrollToId 
        && document.getElementById( currentPage.scrollToId.substring(1) )?.scrollIntoView({
            behavior: "smooth", 
            block: "start", 
            inline: "nearest"
        })

    // First load
    React.useEffect(() => {

        // Resolve page if it wasn't done via SSR
        if (context.page === undefined)
            resolvePage(context.request);

        // Foreach URL change (Ex: bowser' back buttton)
        return history?.listen(async (locationUpdate) => {

            // Load the concerned route
            const request = new ClientRequest(locationUpdate.location, context);
            await resolvePage(request);
            
            // Scroll to the selected content via url hash
            restoreScroll(pages.current);
        })
    }, []);

    // On every page change
    React.useEffect(() => {

        // Reset scroll
        window.scrollTo(0, 0);
        // Should be called AFTER rendering the page (so after the state change)
        pages.current?.updateClient();
        // Scroll to the selected content via url hash
        restoreScroll(pages.current);

        // Hooks
        router.runHook('page.changed', pages.current)
        
    }, [pages.current]);
    
    // Render the page component
    return <>
        {/*pages.previous && (
            <Page page={pages.previous} key={pages.previous.id === undefined ? undefined : 'page_' + pages.previous.id} />
        )*/}

        {pages.current && (
            <PageComponent page={pages.current} 
                isCurrent 
                key={pages.current.id === undefined ? undefined : 'page_' + pages.current.id} 
            />
        )}
    </>
}