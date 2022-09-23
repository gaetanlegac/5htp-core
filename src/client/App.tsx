/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

// Core
import { ReactClientContext, ClientContext } from '@client/context';
import DialogManager from '@client/components/Dialog/Manager'
import type { Layout } from '@common/router';

// Core components
import Router from '@client/router/component';

// Resources
import "@client/assets/css/core.less";

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default function App ({ context }: { context: ClientContext }) {

    const route = context.page?.route;
    const curLayout = route.options.layout;
    const [layout, setLayout] = React.useState<Layout | false | undefined>(curLayout);
    context.setLayout = setLayout;

    return (
        <ReactClientContext.Provider value={context}>

            <DialogManager />
            
            {!layout ? <>
                <Router />
            </> : <>
                <layout.Component context={context} />
            </>}
            
        </ReactClientContext.Provider>
    )
}