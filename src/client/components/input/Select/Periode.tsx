/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

// Composant de base
import Select from './Classique';

// Libs
import { Periodes, periodeToParams } from '@commun/donnees/stats';
import { TActions } from '@client/hooks/useState';

/*----------------------------------
- TYPES
----------------------------------*/

export type Props<TCle extends string> = {
    state: TActions<{ [cle in TCle]: any }>,
    cle: TCle
}

export type { Choix } from '../Base/Choix';

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default <TCle extends string>({ state, cle }: Props<TCle>) => {

    const { debut, fin } = state.params[ cle ];

    const periode = Object.entries(Periodes).find(
        ([ , p ]) => p.debut.isSame(debut) && p.fin.isSame(fin)
    )

    const setPeriode = (periode: keyof typeof Periodes) => state.recharger(cle, periodeToParams(periode))
    
    return (
        <Select
            label={false}
            titre="Period"
            choix={Object.keys(Periodes)}

            valeur={periode ? periode[0] : undefined}
            onChange={setPeriode}
        />
    )
    
}
