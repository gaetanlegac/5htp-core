/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core';

// Core
import type { Layout } from '@common/router';
import { ReactClientContext } from '@/client/context';
import DialogManager from '@client/components/Dialog/Manager'

// Core components
import RouterComponent from '@client/services/router/components/router';
import type { TClientOrServerContextForPage } from '@common/router';

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default function App({ context }: {
    context: TClientOrServerContextForPage,
}) {

    const curLayout = context.page?.layout;
    const [layout, setLayout] = React.useState<Layout | false | undefined>(curLayout);
    const [apiData, setApiData] = React.useState<{ [k: string]: any } | null>(context.page?.data || {});

    // TODO: context.page is always provided in the context on the client side
    if (context.app.side === "client")
        context.app.setLayout = setLayout;

    return (
        <ReactClientContext.Provider value={context}>

            <MantineProvider theme={{
                cursorType: 'pointer',
                
                // TODO: fill with var.less variables
                defaultRadius: 'md',
                radius: { md: '0.75rem', /* @radius */ },
                primaryColor: 'primary',

                colors: {
                    primary: [
                        '#6C5DD3',
                        '#6C5DD3',
                        '#6C5DD3',
                        '#6C5DD3',
                        '#6C5DD3',
                        '#6C5DD3',
                        '#6C5DD3',
                        '#6C5DD3',
                        '#6C5DD3',
                        '#6C5DD3',
                    ],
                },
                components: {
                    // Set the default size to "md" for each component:
                    Button: { defaultProps: { size: 'md' } },
                    TextInput: { defaultProps: { size: 'md' } },
                    PasswordInput: { defaultProps: { size: 'md' } },
                    NumberInput: { defaultProps: { size: 'md' } },
                    Select: { defaultProps: { size: 'md' } },
                    MultiSelect: { defaultProps: { size: 'md' } },
                    Checkbox: { defaultProps: { size: 'md' } },
                    Radio: { defaultProps: { size: 'md' } },
                    Switch: { defaultProps: { size: 'md' } },
                    SegmentedControl: { defaultProps: { size: 'md' } },
                    Menu: { defaultProps: { size: 'md' } },
                    MenuItem: { defaultProps: { size: 'md' } },
                    Autocomplete: { defaultProps: { size: 'md' } },
                    TagsInput: { defaultProps: { size: 'md' } },
                    // Add any others you use...
                },
            }} withGlobalStyles withNormalizeCSS>

                <DialogManager context={context} />

                {!layout ? <>
                    {/* TODO: move to app, because here, we're not aware that the router service has been defined */}
                    <RouterComponent service={context.Router} />
                </> : <> {/* Same as router/components/Page.tsx */}
                    <layout.Component
                        // Services
                        {...context}
                        // API data & URL params
                        data={{
                            ...apiData,
                            ...context.request.data
                        }}
                    />
                </>}
            </MantineProvider>

        </ReactClientContext.Provider>
    )
}