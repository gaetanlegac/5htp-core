/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

// Libs
import Champ from '../Base';
import genChoix, { Choix } from '../Base/Choix';

/*----------------------------------
- TYPES
----------------------------------*/
type TValeur = string | undefined;
const valeurDefaut = undefined;
type TValeurDefaut = typeof valeurDefaut;
type TValeurOut = string;

export type Props = {
    valeur: TValeur,
    choix: Choix
}

/*----------------------------------
- COMPOSANT
----------------------------------*/
import './index.less';
export default Champ<Props, TValeurDefaut, TValeurOut>('radio', { valeurDefaut, saisieManuelle: false }, ({
    choix: choixInit, attrsChamp
}, { state, setState, valeur }, rendre) => {

    const choix = genChoix( choixInit );

    return rendre((
        choix.map(({ label, value, attrs }, indexChoix: number) => {

            const idChoix = 'radio_' + indexChoix;
            return <>
                <input type="radio" id={idChoix} {...attrsChamp} {...(attrs ? attrs : {})}
                    // @ts-ignore
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setState({ valeur: value })
                    }}
                    checked={valeur === value}
                />
                <label htmlFor={idChoix}>{label}</label>
            </>
        })
    ), {  });
})