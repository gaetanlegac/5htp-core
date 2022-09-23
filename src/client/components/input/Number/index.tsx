/*----------------------------------
- DEPENDANCES
----------------------------------*/

import React from 'react';
import Champ from '../Base';

/*----------------------------------
- TYPES
----------------------------------*/
type TValeur = number;
const valeurDefaut = 0 as number;
type TValeurDefaut = typeof valeurDefaut;
type TValeurOut = string;

export type Props = {
    valeur: TValeur,
    pas?: number,

    min?: number,
    max?: number,

    formater?: (valeur: number) => string
}

/*----------------------------------
- COMPOSANT
----------------------------------*/
import './index.less';
export default Champ<Props, TValeurDefaut, TValeurOut>('number', { valeurDefaut, saisieManuelle: true }, ({ 
    boutons, pas, min, max, attrsChamp, formater, readOnly
}, { valeur, state, setState }, rendre) => {

    if (readOnly) {
        return rendre( formater ? formater(valeur) : valeur, {});
    }

    if (pas === undefined) {
        if (typeof valeur === 'number') {

            // RAPPEL: 10 ^ 0 = 1
            const nbChiffres = Math.floor(valeur).toString().length;
            pas = Math.pow(10, nbChiffres - 1);

        } else
            pas = 1;
    }

    const corrigerValeur = (valeur: number): number => {
        // Correction valeur min
        if (min !== undefined && valeur < min)
            return min;
        // Correction valeur max
        else if (max !== undefined && valeur > max)
            return max;
        else
            return valeur;
    }

    const boutonsControle = [{
        icone: /* @icone */"minus",
        onClick: () => {
            const pasA = pas >= valeur ? pas / 10 : pas;
            setState({ valeur: corrigerValeur(valeur - pasA) }, true);
        }
    }, {
        icone: /* @icone */"plus",
        onClick: () => {
            setState({ valeur: corrigerValeur(valeur + pas) }, true);
        }
    }]

    if (boutons === undefined)
        boutons = boutonsControle;
    else if (typeof boutons === 'object')
        boutons = [...boutonsControle, ...boutons];

    return rendre((
        <input {...attrsChamp}
            /*type="number"
            step={pas}
            min={min}
            max={max}*/
            value={formater ? formater(valeur) : valeur}
            onBlur={(e) => {
                let valeur = parseFloat(
                    e.target.value
                        //.replace(/\,/g, '.')
                        .replace(/[^0-9\.]/g, '')
                );
                console.log(e.target.value, valeur);
                setState({ valeur: corrigerValeur(valeur)  });

                if (attrsChamp.onBlur)
                    attrsChamp.onBlur(e);
            }}
            ref={undefined/*refChamp*/}
        />
    ), { boutons });
})
