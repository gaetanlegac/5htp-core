import React from "react";

import type { Choice } from '@client/components/Select';

const ConnectedInput = <TComponent extends React.ComponentType<any>>({ 
    component: Component, data: dataInit, ...props 
}: {
    component: TComponent,
    data?: Choice[] | ((search?: string) => Promise<Choice[]>),
} & Omit<React.ComponentProps<TComponent>, 'data' | 'onSearchChange'>) => {

    const [data, setData] = React.useState<Choice[]>([]);
    const [search, setSearch] = React.useState<string>('');

    React.useEffect(() => {

        if (!dataInit) return;
        if (Array.isArray(dataInit))
            setData(dataInit);
        else
            dataInit(search).then(setData);

    }, [dataInit, search]);

    return (
        <Component 
            {...props} 
           data={data}
           onSearchChange={setSearch}
        />
    )
}

export default ConnectedInput;