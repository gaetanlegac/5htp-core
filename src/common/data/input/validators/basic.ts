/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import {
    trim,
    isISO8601, toDate,
    isEmail, normalizeEmail,
    isURL
} from 'validator';

// Libs
import { InputError } from '@common/errors';
import File from '@common/data/file';

// Libs métier
import { champ } from './build';
import { TSchemaChamp } from '../validate';
import NormalizedFile from '@common/data/file';

// Components
import NumberInput from '@client/components/input/Number';
import Dropdown from '@client/components/dropdown.old';

/*----------------------------------
- CONTENEURS
----------------------------------*/
export const object = (opts: TSchemaChamp<object> & {} = {}) => champ<object>('object', {
    ...opts,
    valider: async (val: any, donneesSaisie: TObjetDonnees, donneesRetour: TObjetDonnees) => {

        // TODO: executer seulement coté serveur
        /*if (typeof val === 'string' && val.startsWith('{'))
            try {
                val = JSON.parse(val);
            } catch (error) {
                console.error('Unable to convert the given string into an object.');
            }*/

        if (typeof val !== 'object' || val.constructor !== Object)
            throw new InputError("This value must be an object.");

        return opts.valider ? await opts.valider(val, donneesSaisie, donneesRetour) : val;
    },
})

export const array = (subtype?: Schema<any> | TSchemaChamp<any[]>, { choix, ...opts }: TSchemaChamp<any[]> & {} = {}) => {

    if (subtype !== undefined)
        subtype.choix = choix;

    return champ<any[]>('array', {
        ...opts,
        choix,
        multiple: true, // Sélection multiple
        subtype,
        valider: async (items: any, donneesSaisie: TObjetDonnees, donneesRetour: TObjetDonnees) => {

            //console.log('VALIDER ARRAY', items, donneesSaisie);

            if (!Array.isArray(items))
                throw new InputError("This value must be an array.");

            // Verif items
            if (subtype !== undefined) {
                if (subtype instanceof Schema) {

                    console.log('TODO: VALIDER VIA SOUS SCHEMA');

                } else {

                    for (let i = 0; i < items.length; i++)
                        items[i] = await subtype.valider(items[i], items);

                }
            }

            return opts.valider ? await opts.valider(items, donneesSaisie, donneesRetour) : items;
        },
    })
}

export const choice = (values: any[], opts: TSchemaChamp<any> & {} = {}) => champ<any>('object', {
    ...opts,
    valider: async (val: any, donneesSaisie: TObjetDonnees, donneesRetour: TObjetDonnees) => {

        if (!values.includes(val))
            throw new InputError("Invalid value. Must be: " + values.join(', '));

        return opts.valider ? await opts.valider(val, donneesSaisie, donneesRetour) : val;
    },
})

/*----------------------------------
- CHAINES
----------------------------------*/
export const string = ({ min, max, ...opts }: TSchemaChamp<string> = {}) => champ<string>('string', {
    ...opts,
    valider: async (val: any, donneesSaisie: TObjetDonnees, donneesRetour: TObjetDonnees, corriger?: boolean) => {

        if (val === '')
            val = undefined;
        else if (typeof val === 'number')
            return val.toString();
        else if (typeof val !== 'string')
            throw new InputError("This value must be a string.");

        // Espaces blancs
        val = trim(val);

        // Taille min
        if (val.length < min)
            throw new InputError(`Must be at least ` + min + ' characters');

        // Taille max
        if (val.length > max)
            if (corriger)
                val = val.substring(0, max);
            else
                throw new InputError(`Must be up to ` + max + ' characters');

        return opts.valider ? await opts.valider(val, donneesSaisie, donneesRetour) : val;
    },
})

export const url = (opts: TSchemaChamp<string> & {} = {}) => string({
    ...opts,
    valider: async (val: string, donneesSaisie: TObjetDonnees, donneesRetour: TObjetDonnees, corriger?: boolean) => {

        if (!isURL(val, {
            // https://www.npmjs.com/package/validator
        }))
            throw new InputError(`Please provide a valid URL.`);

        return opts.valider ? await opts.valider(val, donneesSaisie, donneesRetour, corriger) : val;
    },
})

export const email = (opts: TSchemaChamp<string> & {} = {}) => string({
    ...opts,
    valider: async (val: any, donneesSaisie: TObjetDonnees, donneesRetour: TObjetDonnees, corriger?: boolean) => {

        if (!isEmail(val))
            throw new InputError("Please enter a valid email address.");

        const retour = normalizeEmail(val);

        return opts.valider ? await opts.valider(retour, donneesSaisie, donneesRetour, corriger) : retour;

    },
})

/*----------------------------------
- NOMBRES
----------------------------------*/
// On ne spread pas min et max afin quils soient passés dans les props du composant
const nombre = (float: boolean) => ({ ...opts }: TSchemaChamp<number> & {} = {}) => champ<number>('nombre', {
    // Force une valeur par défaut si requis
    defaut: opts.opt ? undefined : (opts.min || 0),
    rendu: NumberInput,
    ...opts,
    valider: async (val: any, donneesSaisie: TObjetDonnees, donneesRetour: TObjetDonnees, corriger?: boolean) => {

        // Vérifications suivantes inutiles si des valeurs spécifiques ont été fournies
        if (opts.in === undefined) {

            // Tente conversion chaine en nombre
            if (typeof val === 'string')
                val = float ? parseFloat(val) : parseInt(val);
            
            if (opts.min === undefined)
                opts.min = 0;
            
            // Type de donnée
            if (Number.isNaN(val) || typeof val !== 'number') {
                if (corriger)
                    val = opts.min;
                else
                    throw new InputError("This value must be a number.");
            }

            // Minimum
            if (val < opts.min)
                if (corriger)
                    val = opts.min;
                else
                    throw new InputError(`Must be at least ` + opts.min);

            // Maximum
            if (opts.max !== undefined && val > opts.max)
                if (corriger)
                    val = opts.max;
                else
                    throw new InputError(`Must be up to ` + opts.max);

        }

        return opts.valider ? await opts.valider(val, donneesSaisie, donneesRetour, corriger) : val;
    },
})

export const int = nombre(false);   

export const float = nombre(true);

export const bool = (opts: TSchemaChamp<boolean> & {} = {}) => champ<boolean>('bool', {
    defaut: false,
    ...opts,
    valider: async (val: any, donneesSaisie: TObjetDonnees, donneesRetour: TObjetDonnees) => {

        if (typeof val !== 'boolean' && !['true', 'false'].includes(val))
            throw new InputError("This value must be a boolean.");

        val = !!val;

        return opts.valider ? await opts.valider(val, donneesSaisie, donneesRetour) : val;

    },
})

/*----------------------------------
- AUTRES
----------------------------------*/
export const date = (opts: TSchemaChamp<Date> & {} = {}) => champ<Date>('date', {
    //defaut: new Date,
    ...opts,
    valider: async (val: any, donneesSaisie: TObjetDonnees, donneesRetour: TObjetDonnees): Promise<Date> => {

        const chaine = typeof val == 'string';

        // Chaine = format iso
        if (chaine) {

            if (!isISO8601(val))
                throw new InputError("This value must be a date.");

            val = toDate(val);

        } else if (!(val instanceof Date))
            throw new InputError("This value must be a date.");

        return opts.valider ? await opts.valider(val, donneesSaisie, donneesRetour) : val;

    },
})

/*----------------------------------
- FICHIER
----------------------------------*/
export type TOptsValidateurFichier = TSchemaChamp<object> & {
    type?: (keyof typeof raccourcisMime) | string[], // Raccourci, ou liste de mimetype
    taille?: number
}
const raccourcisMime = {
    image: ['image/jpeg', 'image/png']
}
export const validateurFichier = async (
    { type, taille, ...opts }: TOptsValidateurFichier = {}, 
    val: any, 
    donneesSaisie: TObjetDonnees, 
    donneesRetour: TObjetDonnees
): Promise<File | undefined> => {

    console.log('VALIDER FICHIER', type, val);

    if (!(val instanceof NormalizedFile))
        throw new InputError(`Must be a File (${typeof val} received)`);

    // MIME
    if (type !== undefined) {

        let mimetypes: string[];

        // Raccourcis
        if (typeof type === 'string') {
            if (type in raccourcisMime)
                mimetypes = raccourcisMime[type as keyof typeof raccourcisMime]
            else
                throw new Error(`Aucune liste de mimetype référencée pour le type de fichier « ${type} »`);
        } else
            mimetypes = type;

        // Vérification
        const mimeFichier = val.type;
        if (!mimetypes.includes(mimeFichier))
            throw new InputError('Only the following formats are allowed: ' + mimetypes.join(', ') + '. The file you gave is ' + mimeFichier + '.');

    }

    // Taille
    if (taille) {
        const tailleFichier = val.size / 1024 / 1024; // Mo
        if (tailleFichier > taille)
            throw new InputError(`Le fichier ne doit pas faire plus de ${taille} Mo (taille reçue: ${tailleFichier} Mo)`);
    }

    return opts.valider ? await opts.valider(val, donneesSaisie, donneesRetour) : val;
}