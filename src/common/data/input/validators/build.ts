/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Libs
import { ErreurSaisie } from '@common/errors';
import * as basicValidators from './basic';

// Components
import Input from '@client/components/input';

/*----------------------------------
- TYPES
----------------------------------*/

import { TSchemaChampComplet, TSchema } from '../validate';

export const EXCLURE_VALEUR = "action:exclure";

/*----------------------------------
- VALIDATION DE BASE
----------------------------------*/
// Remplace un simple !val, qui compterait un zéro comme une valeur vide
export const valeurVide = (val: any) => val === undefined || val === '' || val === null;

export const champ = <TValeur>(
    type: string,
    opts: Omit<TSchemaChampComplet<TValeur>, 'type'>
): TSchemaChampComplet<TValeur> => {
    return {
        ...opts,
        type: type,
        rendu: Input,
        valider: async (val: any, donneesSaisie: TObjetDonnees, donneesRetour: TObjetDonnees, valider?: boolean) => {

            if (valeurVide(val)) {
                // Optionnel, on skip
                if (opts.opt === true)
                    return undefined;
                // Requis
                else
                    throw new ErreurSaisie("Please enter a value");
            }

            if (opts.valider !== undefined)
                val = await opts.valider(val, donneesSaisie, donneesRetour, valider);

            // La valeur ayant passé les étapes de validation
            // On considère que son type correspond aintenant à celui attendu
            return val as TValeur | undefined;
        },
    };
}

export default (validators) => ({

    ...basicValidators,

    ...validators,

    new: <TSchemaA extends TSchema>(schema: TSchemaA): TSchemaA => schema,

})