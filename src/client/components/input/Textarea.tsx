/*----------------------------------
- DEPENDANCES
----------------------------------*/

import React from 'react';
import Champ from './Base';

import TextareaAutosize from 'react-textarea-autosize';

/*----------------------------------
- TYPES
----------------------------------*/
type TValeur = string;
const valeurDefaut = '' as string;
type TValeurDefaut = typeof valeurDefaut;
type TValeurOut = string;

export type Props = {
    valeur: TValeur,
    onPressEnter?: (valeur: TValeur) => void,
    autoFocus?: boolean,
}

/*----------------------------------
- COMPOSANTS
----------------------------------*/
export default Champ<Props, TValeurDefaut, TValeurOut>('textarea', { valeurDefaut, saisieManuelle: true }, ({
    onPressEnter, attrsChamp
}, { valeur, state, setState }, rendre) => {

    if (onPressEnter)
        attrsChamp.onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {

                // Entrée seulement = envoi
                if (!e.shiftKey) {
                    onPressEnter( valeur );
                }

                // Nouvelle ligne si shift key + valeur ok
                if (!(e.shiftKey && valeur)) {
                    //e.stopPropagation();
                    e.preventDefault();
                    return false;
                }
            }
        }

    return rendre((
        <TextareaAutosize {...attrsChamp} 
            value={valeur} 
            onChange={(e: any) => {
                setState({ valeur: e.target.value });
            }} 
        />
    ), {  });
})