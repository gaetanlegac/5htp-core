/*----------------------------------
- DEPENDANCES
----------------------------------*/
import React from 'react';
import Slider from 'react-slider';
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
    step?: number,

    min?: number,
    max?: number,

    formater?: (valeur: number) => string
}

/*----------------------------------
- COMPOSANT
----------------------------------*/
import './index.less';
export default Champ<Props, TValeurDefaut, TValeurOut>('slider', { valeurDefaut, saisieManuelle: false }, ({
    suffixeLabel, attrsChamp, 
    step, min, max, formater
}, { valeur, state, setState }, rendre) => {

    if (suffixeLabel === undefined)
        suffixeLabel = <strong>{formater ? formater(valeur) : valeur}</strong>

    // On copie les attributs pour ne pas modifer l'objet attrsChamp et provoquer des comportements imprévus
    let attributs = { ...attrsChamp };

    return rendre((
        <Slider {...attributs}
            step={step}
            min={min} 
            max={max} 

            value={valeur}
            onChange={(valeur: number) => {
                setState({ valeur });
            }}

            className="champ slider"
            thumbClassName="thumb"
            trackClassName="track"
        />
    ), { suffixeLabel });
});