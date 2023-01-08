// https://github.com/adonisjs/validator

/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import { ComponentChild } from 'preact'

// Libs
import { Erreur, TListeErreursSaisie, InputErrorSchema } from '@common/errors';

import { EXCLURE_VALEUR } from './validators/build';

/*----------------------------------
- CONSTANTES
----------------------------------*/

const debug = false;

/*----------------------------------
- TYPES: DECLARATION SCHEMA
----------------------------------*/

//import type { Choix } from '@client/components/Champs/Base/Choix';


/*----------------------------------
- FONCTIONS
----------------------------------*/
export const isSchema = <TElem extends TSchema | TSchemaChampComplet>(elem: TElem): elem is TSchema => !('type' in elem)

export const initDonnees = <TSchemaA extends TSchema>(
    schema: TSchemaA,
    donnees: TObjetDonnees,
    toutConserver: boolean = false
): Partial<TValidatedData<TSchemaA>> => {

    // toutConserver = true: on conserve toutes les données, y compris celles n'étant pas été définies dans le schéma
    let retour: Partial<TValidatedData<TSchemaA>> = toutConserver ? { ...donnees } : {}

    for (const nomChamp in schema) {
        const elem = schema[nomChamp];

        // Sous-schema
        if (isSchema(elem)) {

            retour[nomChamp] = initDonnees(elem, donnees[nomChamp] || {}, toutConserver);

            // Champ
        } else if (elem.defaut !== undefined && donnees[nomChamp] === undefined) {

            retour[nomChamp] = elem.defaut;

        } else
            retour[nomChamp] = donnees[nomChamp];
    }

    return retour;

}

export const validate = 