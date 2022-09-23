/*----------------------------------
- DEPENDANCES
----------------------------------*/
import React from 'react';
import TimeField from 'react-simple-timefield';

import Champ, { BaseProps, BaseState } from '../Base';

/*----------------------------------
- TYPES
----------------------------------*/
type TValeur = [string | null, string | null]

export type Props = BaseProps<TValeur> & {
    as: [string, string]
}

type State = BaseState<TValeur> & {
    focusedInput?: any | null
}

/*----------------------------------
- COMPOSANTS
----------------------------------*/
export default (propsInit: Props) => {

    const { props, rendre, state, onChange, setState } = Champ<TValeur, State>(
        'plagehoraire', 
        propsInit, 
        {
            baseState: () => ({
                affPopover: false
            })
        }
    );

    const propsInputDate = {
        affPopover: state.affPopover,
        setAffPopover: (etat: boolean) => setState({ affPopover: etat })
    };

    return rendre(
        <div className="champ periode groupeChamps">
            <TimeField
                value={props.valeur[0]}
                onChange={(event, value) => onChange([ value, props.valeur[1] ])}
                input={<input className="input-transparent txt-center" />}
            />

            <i src="solid/long-arrow-right" />

            <TimeField
                value={props.valeur[1]}
                onChange={(event, value) => onChange([ props.valeur[0], value ])}
                input={<input className="input-transparent txt-center" />}
            />
        </div>
    );
}
