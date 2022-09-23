// https://github.com/adonisjs/validator

/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import { ComponentChild } from 'preact'

// Libs
import { Erreur, TListeErreursSaisie, ErreurSaisieSchema } from '@common/errors';

import { EXCLURE_VALEUR } from './validators/build';

/*----------------------------------
- CONSTANTES
----------------------------------*/

const debug = false;

/*----------------------------------
- TYPES: DECLARATION SCHEMA
----------------------------------*/

//import type { Choix } from '@client/components/Champs/Base/Choix';

export type TSchema = { [champ: string]: TSchema | TSchemaChampComplet }

export type TSchemaChamp<TValeur> = {

    rendu?: TBaseComposantChamp,
    activer?: (donnees: TObjetDonnees) => boolean,
    onglet?: string, // Sert juste d'identifiant secondaire. Ex: nom onglet correspondant

    // Executé après le validateur propre au type
    valider?: (val: TValeur, donneesSaisie: TObjetDonnees, donneesRetour: TObjetDonnees, corriger?: boolean) => Promise<TValeur>,
    dependances?: string[],
    opt?: true,
    defaut?: TValeur,
    as?: string[], // Mapping personnalisé

}

export type TBaseComposantChamp = (props: any) => ComponentChild;

export type TSchemaChampComplet<TValeur = unknown> = TSchemaChamp<TValeur> & {
    type: string,
    valider: (val: any, formData?: unknown) => Promise<TValeur | undefined>
}

/*----------------------------------
- TYPES: VALIDATION SCHEMA
----------------------------------*/
type TOptsValider = {
    critique?: boolean,
    validationComplete?: boolean,
    avecDependances?: boolean,
    corriger?: boolean,
}

export type TDonneesValidees<TSchemaA extends TSchema> = {
    [cle in keyof TSchemaA]: TSchemaA[cle]["type"] extends string
    // Champ
    ? ThenArg<ReturnType<TSchemaA[cle]["valider"]>>
    // Schema
    : TDonneesValidees<TSchemaA[cle]>
}

export type TRetourValidation<TSchemaA extends TSchema> = {
    valeurs: TDonneesValidees<TSchemaA>,
    nbErreurs: number,
    erreurs: TListeErreursSaisie
}

/*----------------------------------
- FONCTIONS
----------------------------------*/
export const isSchema = <TElem extends TSchema | TSchemaChampComplet>(elem: TElem): elem is TSchema => !('type' in elem)

export const initDonnees = <TSchemaA extends TSchema>(
    schema: TSchemaA,
    donnees: TObjetDonnees,
    toutConserver: boolean = false
): Partial<TDonneesValidees<TSchemaA>> => {

    // toutConserver = true: on conserve toutes les données, y compris celles n'étant pas été définies dans le schéma
    let retour: Partial<TDonneesValidees<TSchemaA>> = toutConserver ? { ...donnees } : {}

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

export const validate = async <TSchemaA extends TSchema, TDonnees extends TObjetDonnees>(

    schema: TSchemaA,

    inputAvalider: Partial<TDonnees>,
    inputComplet?: TDonnees,
    output: TObjetDonnees = {},

    opts: TOptsValider = {},
    chemin: string[] = []

): Promise<TRetourValidation<TSchemaA>> => {

    opts = {
        critique: false,
        validationComplete: false,
        avecDependances: true,
        corriger: false,
        ...opts,
    }

    const clesAvalider = Object.keys(opts.validationComplete === true ? schema : inputAvalider);

    let outputSchema = output;
    for (const branche of chemin)
        outputSchema = outputSchema[branche];

    // Validation de chacune d'entre elles
    let erreurs: TListeErreursSaisie = {};
    let nbErreurs = 0;
    for (const champ of clesAvalider) {

        // La donnée est répertoriée dans le schema
        const metas = schema[champ];
        if (metas === undefined) {
            debug && console.warn('[schema][valider][' + champ + ']', 'Exclusion (pas présent dans le schéma)');
            continue;
        }

        const cheminA = [...chemin, champ].join('.')

        // Sous-schema
        if (isSchema(metas)) {

            // Initialise la structure pour permettre l'assignement d'outputSchema
            if (outputSchema[champ] === undefined)
                outputSchema[champ] = {}

            const validationSchema = await validate(
                metas,
                inputAvalider[champ],
                inputComplet,
                output,
                opts,
                cheminA
            );
            erreurs = { ...erreurs, ...validationSchema.erreurs };
            nbErreurs += validationSchema.nbErreurs;

            // Pas besoin d'assigner, car output est passé en référence
            //output[champ] = validationSchema.valeurs;



        } else if (metas.activer !== undefined && metas.activer(inputComplet) === false) {

            delete outputSchema[champ];

        } else {

            // Champ composé de plusieurs valeurs
            const valOrigine = metas.as === undefined
                ? inputAvalider[champ]
                // Le champ regroupe plusieurs valeurs (ex: Periode)
                : metas.as.map((nomVal: string) => inputAvalider[nomVal])

            // Validation
            try {

                const val = await metas.valider(valOrigine, inputComplet, output, opts.corriger);

                // Exclusion seulement si explicitement demandé
                // IMPORTANT: Conserver les valeurs undefined
                //      La présence d'un valeur undefined peut être utile, par exemple, pour indiquer qu'on souhaite supprimer une donnée
                //      Exemple: undefinec = suppression fichier | Absende donnée = conservation fihcier actuel
                if (val === EXCLURE_VALEUR)
                    debug && console.log('[schema][valider][' + cheminA + '] Exclusion demandée');
                else
                    outputSchema[champ] = val;

                debug && console.log('[schema][valider][' + cheminA + ']', valOrigine, '=>', val);

            } catch (error) {

                debug && console.warn('[schema][valider][' + cheminA + ']', valOrigine, '|| Erreur:', error);

                if (error instanceof Erreur) {

                    // Référencement erreur
                    erreurs[cheminA] = [error.message]
                    nbErreurs++;

                } else
                    throw error;
            }
        }
    }

    if (nbErreurs !== 0 && opts.critique === true) {
        throw new ErreurSaisieSchema(erreurs);
    }

    debug && console.log('[schema][valider]', inputAvalider, '=>', output);

    return { erreurs, nbErreurs, valeurs: output, };

}