/*----------------------------------
- DEPENDANCES
----------------------------------*/
// Npm
import React from 'react';

// Libs
import useContext from '@client/context';
import ClientRequest from './request';
//import initTooltips from '@client/components/Donnees/Tooltip';

// Navigation
import router from '.';
import { history, location, Update } from './request/history';

/*----------------------------------
- TYPES
----------------------------------*/

import type PageResponse from '../../common/router/response/page';

export type PropsPage<TParams extends { [cle: string]: unknown }> = TParams & {
    data: {[cle: string]: unknown}
}

/*----------------------------------
- PAGE STATE
----------------------------------*/

const Page = ({ page, isCurrent }: { page: PageResponse, isCurrent?: boolean }) => {

    const gui = useContext();

    const [data, setData] = React.useState<{[k: string]: any} | null>( page.loading ? null : page.data );
    page.setAllData = setData;
 
    React.useEffect(() => {

        if (data === null && isCurrent)
            page.fetchData().then( loadedData => {
                page.loading = false;
                setData(loadedData);
            })

    }, []);

    return (
        <div 
            class={"page" + (isCurrent ? ' current' : '')} 
            id={page.id === undefined ? undefined : 'page_' + page.id}
        >

            {/* Make request parameters and api data accessible from the page component */}
            {page.component ? (

                <page.component {...gui.request.data} {...data} />
                
            ) : null}

        </div>
    )
}

/*----------------------------------
- COMPONENT
----------------------------------*/
export default () => {

    const gui = useContext();

    const [pages, setPages] = React.useState<{
        current: undefined | PageResponse,
        //previous: undefined | PageResponse
    }>({
        current: gui.page,
        //previous: undefined
    });
    
    const resolvePage = async (request: ClientRequest, locationUpdate?: Update) => {

        // WARNING: Don"t try to play with pages here, since the object will not be updated
        //  If needed to play with pages, do it in the setPages callback below

        // Load the route chunks
        gui.request = request;
        const newpage = gui.page = await router.resolve(request, gui);

        // Page not found: Directly load with the browser
        if (newpage === undefined) {
            window.location.replace(request.path);
            return;
        // Unable to load (no connection, server error, ....)
        } else if (newpage === null) {
            return;
        }

        // Set loading state
        newpage.loading = <i src="spin" />
        // Add page container
        setPages( pages => {

            // Page unchanges
            if (pages.current?.route.path === request.path)  {
                console.warn("Canceling navigation to the same page:", {...request});
                return pages;
            }

            //  Layout change
            const curLayout = pages.current?.route.options.layout;
            const newlayout = newpage?.route.options.layout;
            if (newlayout && curLayout && newlayout.path !== curLayout.path) {
                gui.setLayout(newlayout);
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

    const restoreScroll = (currentPage?: PageResponse) => currentPage?.hash 
        && document.getElementById( currentPage.hash.substring(1) )?.scrollIntoView({
            behavior: "smooth", 
            block: "start", 
            inline: "nearest"
        })

    // First load
    React.useEffect(() => {

        /*gui.api.set = (newData: TObjetDonnees) =>  {
            setPage(a => ({ ...a, data: { ...a.data, ...newData } }));
        }*/

        // Resolve page if it wasn't done via SSR
        if (gui.page === undefined)
            resolvePage(gui.request);

        // Foreach URL change (Ex: bowser' back buttton)
        return history?.listen(async (locationUpdate) => {

            // Load the concerned route
            const request = new ClientRequest(locationUpdate.location, gui);
            await resolvePage(request);
            
            // Scroll to the selected content via url hash
            restoreScroll(pages.current);
        })
    }, []);

    // On every page change
    React.useEffect(() => {

        // Tracking
        gui.event('pageview');
        // Reset scroll
        window.scrollTo(0, 0);
        // Should be called AFTER rendering the page (so after the state change)
        gui.page?.updateClient();

        // Scroll to the selected content via url hash
        restoreScroll(pages.current);
            
        
    }, [pages.current]);
    
    // Render the page component
    return <>
        {/*pages.previous && (
            <Page page={pages.previous} key={pages.previous.id === undefined ? undefined : 'page_' + pages.previous.id} />
        )*/}

        {pages.current && (
            <Page page={pages.current} isCurrent key={pages.current.id === undefined ? undefined : 'page_' + pages.current.id} />
        )}
    </>
}