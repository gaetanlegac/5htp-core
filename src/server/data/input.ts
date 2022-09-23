/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Libs métier
import buildValidators, { EXCLURE_VALEUR, champ } from '@common/data/input/validators/build';
import { validateurFichier, TOptsValidateurFichier } from '@common/data/input/validators/basic';

/*----------------------------------
- VALIDATEURS
----------------------------------*/
export default buildValidators({

    file: ({ ...opts }: TOptsValidateurFichier & {}) => champ<object>('fichier', {
        ...opts,
        valider: async (val: any, donneesSaisie: TObjetDonnees, donneesRetour: TObjetDonnees) => {

            // Chaine = url ancien fichier = exclusion de la valeur pour conserver l'ancien fichier
            // NOTE: Si la valeur est présente mais undefined, alors on supprimera le fichier
            if (typeof val === 'string')
                return EXCLURE_VALEUR;

            // Validation universelle
            const fichier = await validateurFichier(opts, val, donneesSaisie, donneesRetour);

            if (fichier === undefined)
                return fichier;


            // Résolution image
            if (opts.sharp !== undefined) {



            }

            return opts.valider ? await opts.valider(fichier, donneesSaisie, donneesRetour) : fichier;
        }
    })

});