/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { SketchPicker } from 'react-color'

// Composants
import Champ from './Base';
import Popover from '../Conteneurs/Popover';
import Bouton from '../Bouton';

/*----------------------------------
- TYPES
----------------------------------*/
type TValeur = string;
const valeurDefaut = '' as string;
type TValeurDefaut = typeof valeurDefaut;
type TValeurOut = string;

export type Props = {
    valeur: TValeur,
}

const couleurs = ["#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5", "#2196f3", "#03a9f4", "#00bcd4", "#009688", "#4caf50", "#8bc34a", "#ff9800", "#ff5722", "#795548", "#607d8b", "#000"];

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default Champ<Props, TValeurDefaut, TValeurOut>('couleur', { valeurDefaut }, ({
    
}, { valeur, state, setState }, rendre) => {

    return rendre((
        <Popover
            style={{ width: "300px" }}
            content={(
                <SketchPicker
                    disableAlpha
                    color={valeur}
                    onChangeComplete={(color) => setState({ valeur: color.hex.substring(1) })}
                    presetColors={couleurs}
                />
            )}
        >
            <Bouton className="champ">
                <span className="pastille l mgr-1" style={{
                    backgroundColor: '#' + (valeur || '000')
                }}></span>
                {valeur ? '#' + valeur : "Sélectionnez une couleur"}
            </Bouton>
        </Popover>
    ), {  });
})
