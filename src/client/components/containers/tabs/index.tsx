/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React, { JSX } from 'react';
import { ComponentChild } from 'preact'; 

// Composants
import Button, { Props as TPropsBouton } from '@client/components/button';

/*----------------------------------
- TYPES
----------------------------------*/

type TOnglet = TPropsBouton & {
    id: string,
    label: ComponentChild
}

export type TContexteOnglets = {
    liste: TOnglet[],
    actuel: string | undefined,
    navig: (id: string) => void
}

export const ContexteOnglets = React.createContext<TContexteOnglets | null>(null);

/*----------------------------------
- COMPOSANT
----------------------------------*/
export const avecOnglets = <TOnglets extends TOnglet[]>(onglets: TOnglets, children: ComponentChild, ref?: React.RefObject<TContexteOnglets>) => {

    const [ongletA, setOngletA] = React.useState<string | undefined>(
        onglets.length === 0 ? undefined : onglets[0].id
    );

    const contexte = {
        liste: onglets,
        actuel: ongletA,
        navig: setOngletA
    }

    if (ref !== undefined)
        ref.current = contexte;

    return (
        <ContexteOnglets.Provider value={contexte}>
            {children}
        </ContexteOnglets.Provider>
    )
}

export const MenuOnglets = (props: JSX.HTMLAttributes<HTMLDivElement>) => {

    const onglets = React.useContext(ContexteOnglets);
    if (onglets === null)
        return <>Contexte onglets NotFound</>;

    return (
        <ul {...props} className={"row tabs" + (props.className ? ' ' + props.className : '')}>
            {onglets.liste.map(({ id, label, ...propsBouton }) => (
                <li className={onglets.actuel === id ? 'active' : ''} onClick={() => onglets.navig(id)}>
                    <Button className="tab" {...propsBouton}>{label}</Button>
                </li>
            ))}
        </ul>
    )
}

export const Onglet = ({ id, children, asDiv, ...props }: { 
    id: string, 
    children: React.ReactChild,
    asDiv: boolean
} & JSX.HTMLAttributes<HTMLDivElement>) => {

    const onglets = React.useContext(ContexteOnglets);
    if (onglets === null)
        return <>Contexte onglets NotFound</>;

    if (id !== onglets.actuel)
        return null;

    if (Object.keys(props).length !== 0)
        asDiv = true;

    return asDiv ? <div {...props}>{children}</div> : children;
}