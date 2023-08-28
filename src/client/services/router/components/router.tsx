/*----------------------------------
- DEPENDANCES
----------------------------------*/
// Npm
import React from 'react';

// Core
import useContext from '@/client/context';

// Specific
import type ClientRouter from '..';
import PageComponent from './Page';
import ClientRequest from '../request';
import { history, location, Update } from '../request/history';
//import initTooltips from '@client/components/Donnees/Tooltip';
import type Page from '../response/page';

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

const PageLoading = ({ clientRouter }: { clientRouter?: ClientRouter }) => {

    const [isLoading, setLoading] = React.useState(false);

    if (clientRouter)
        clientRouter.setLoading = setLoading;

    return isLoading ? (
        <div id="loading">
            <i src="spin" />
        </div>
    ) : null

}

/*----------------------------------
- COMPONENT
----------------------------------*/
export default ({ service: clientRouter }: { service?: ClientRouter }) => {

    const context = useContext();

    const [pages, setPages] = React.useState<{
        current: undefined | Page
    }>({
        current: context.page
    });
    
    const resolvePage = async (request: ClientRequest, locationUpdate?: Update) => {

        if (!clientRouter) return;

        // WARNING: Don"t try to play with pages here, since the object will not be updated
        //  If needed to play with pages, do it in the setPages callback below
        
        // Set loading state
        clientRouter.setLoading(true);

        // Load the route chunks
        context.request = request;
        const newpage = context.page = await clientRouter.resolve(request);

        // Page not found: Directly load with the browser
        if (newpage === undefined) {
            window.location.replace(request.url);
            console.error("not found");
            return;
        // Unable to load (no connection, server error, ....)
        } else if (newpage === null) {
            return;
        }

        // Fetch API data to hydrate the page
        const newData = context.data = await newpage.fetchData();

        // Add page container
        setPages( pages => {

            // Check if the page changed
            if (pages.current?.chunkId === newpage.chunkId)  {
                console.warn(LogPrefix, "Canceling navigation to the same page:", {...request});
                pages.current.setAllData(newData);
                clientRouter.setLoading(false);
                return { ...pages }
            }

            // If if the layout changed
            const curLayout = pages.current?.layout;
            const newLayout = newpage?.layout;
            if (newLayout && curLayout && newLayout.path !== curLayout.path) {

                // TEMPORARY FIX: reload everything when we change layout
                //  Because layout can have a different theme
                //  But when we call setLayout, the style of the previous layout are still oaded and applied
                //  Find a way to unload the  previous layout / page resources before to load the new one
                console.log(LogPrefix, `Changing layout. Before:`, curLayout, 'New layout:', newLayout);
                window.location.replace(request.url);
                return { ...pages }

                context.app.setLayout(newLayout);
            }

            return  { current: newpage }
        });
    }

    const restoreScroll = (currentPage?: Page) => currentPage?.scrollToId 
        && document.getElementById( currentPage.scrollToId.substring(1) )?.scrollIntoView({
            behavior: "smooth", 
            block: "start", 
            inline: "nearest"
        })

    // First render
    React.useEffect(() => {

        // Resolve page if it wasn't done via SSR
        if (context.page === undefined)
            resolvePage(context.request);

        // Foreach URL change (Ex: bowser' back buttton)
        return history?.listen(async (locationUpdate) => {

            // Load the concerned route
            const request = new ClientRequest(locationUpdate.location, context.Router);
            await resolvePage(request);
            
            // Scroll to the selected content via url hash
            //restoreScroll(pages.current);
        })
    }, []);

    // On every page change
    React.useEffect(() => {

        if (!clientRouter) return;

        // Page loaded
        clientRouter.setLoading(false);

        // Reset scroll
        window.scrollTo(0, 0);
        // Should be called AFTER rendering the page (so after the state change)
        pages.current?.updateClient();
        // Scroll to the selected content via url hash
        restoreScroll(pages.current);

        // Hooks
        clientRouter.runHook('page.changed', pages.current)
        
    }, [pages.current]);

    // Render the page component
    return <>
        {/*pages.previous && (
            <Page page={pages.previous} key={pages.previous.id === undefined ? undefined : 'page_' + pages.previous.id} />
        )*/}

        {pages.current && (
            <PageComponent page={pages.current} 
                /* Create a new instance of the Page component every time the page change 
                Otherwise the page will memorise the data of the previous page */
                key={pages.current.chunkId === undefined ? undefined : 'page_' + pages.current.chunkId} 
            />
        )}

        <PageLoading clientRouter={clientRouter} />
    </>
}