/*----------------------------------
- DEPENDANCES
----------------------------------*/
import React from 'react';
import Champ from '../Base';
import { ComponentChild } from 'preact';

import uid from '@common/data/id';

/*----------------------------------
- TYPES
----------------------------------*/
type TValeur = boolean;
const valeurDefaut = false as boolean;
type TValeurDefaut = typeof valeurDefaut;
type TValeurOut = string;

export type Props = {
    valeur: TValeur,
    switch?: boolean,
    children?: ComponentChild
}

/*----------------------------------
- COMPOSANTS
----------------------------------*/
import './index.less';
export default Champ<Props, TValeurDefaut, TValeurOut>('checkbox', { valeurDefaut }, ({
    label, titre, children, switch: isSwitch, attrsContChamp, attrsChamp, nom, description, 
    readOnly
}, { valeur, state, setState }, rendre) => {

    if (label === undefined)
        label = true;
    if (!titre && children)
        titre = children;

    if (isSwitch) {
        attrsContChamp.className += ' switch';
        if (label)
            attrsContChamp.className += ' avecLabel';
    } else
        attrsContChamp.className += ' classique';

    if (state.chargement)
        attrsContChamp.disabled = true;

    attrsChamp.id = 'check_' + (nom || uid());

    if (readOnly)
        return rendre(valeur ? 'Yes' : 'No', {});

    return rendre(<>

        <input type="checkbox" {...attrsChamp}
            onChange={() => {
                setState({ valeur: !valeur });
            }}
            checked={valeur}
        />

        {/* On ne peut pas rendre le switch + le texte du label dans le même <label> */}
        {(true || (isSwitch && label)) && (
            <label htmlFor={attrsChamp.id} />
        )}

        <div className="contLabel">
            <label htmlFor={attrsChamp.id}>{titre}</label>   
             
            {description && <p className="desc">{description}</p>}
        </div>

    </>, { ecraser: true });
})
