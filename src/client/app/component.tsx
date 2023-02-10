/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

// Core
import type { Layout } from '@common/router';
import { ReactClientContext } from '@/client/context';
import DialogManager from '@client/components/Dialog/Manager'

// Core components
import Router from '@client/services/router/components/router';
import type { TClientOrServerContext } from '@common/router';

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default function App ({ context }: { 
    context: TClientOrServerContext,
}) {

    const curLayout = context.page?.layout;
    const [layout, setLayout] = React.useState<Layout | false | undefined>(curLayout);

    // TODO: context.page is always provided in the context on the client side
    if (context.app.side === "client")
        context.app.setLayout = setLayout;

    return (
        <ReactClientContext.Provider value={context}>

            <DialogManager context={context} />
            
            {!layout ? <>
                {/* TODO: move to app, because here, we're not aware that the router service has been defined */}
                <Router service={context.router} />
            </> : <>
                <layout.Component context={context} />
            </>}
            
        </ReactClientContext.Provider>
    )
}