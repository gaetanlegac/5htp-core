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

import normalizeUrl, { Options as NormalizeUrlOptions } from 'normalize-url';

// Core
import { InputError } from '@common/errors';
import FileToUpload from '@client/components/inputv3/file/FileToUpload';

// Speciific
import Schema from './schema'
import Validator, { TValidator } from './validator'

// Components
import NumberInput from '@client/components/input/Number';
import Dropdown from '@client/components/dropdown.old';

/*----------------------------------
- TYPES
----------------------------------*/

export type TFileValidator = TValidator<FileToUpload> & {
    type?: (keyof typeof raccourcisMime) | string[], // Raccourci, ou liste de mimetype
    taille?: number
}

/*----------------------------------
- CONST
----------------------------------*/

const raccourcisMime = {
    image: ['image/jpeg', 'image/png']
}

/*----------------------------------
- CLASS
----------------------------------*/
export default class SchemaValidators {

    /*----------------------------------
    - CONTENEURS
    ----------------------------------*/
    public object = ({ ...opts }: TValidator<object> & {} = {}) => 
        new Validator<object>('object', (val, input, output) => {

            // TODO: executer seulement coté serveur
            /*if (typeof val === 'string' && val.startsWith('{'))
                try {
                    val = JSON.parse(val);
                } catch (error) {
                    console.error('Unable to convert the given string into an object.');
                }*/

            if (typeof val !== 'object' || val.constructor !== Object)
                throw new InputError("This value must be an object.");

            return val;
        }, opts)

    public array = ( subtype?: Validator<any> | Schema<{}>, { 
        choice, min, max, ...opts 
    }: TValidator<any[]> & {
        choice?: any[],
        min?: number, 
        max?: number
    } = {}) => {

        return new Validator<any[]>('array', (items, input, output, corriger) => {

            // Type
            if (!Array.isArray(items))
                throw new InputError("This value must be a list.");

            // Items number
            if ((min !== undefined && items.length < min))
                throw new InputError(`Please select at least ${min} items.`);
            if ((max !== undefined && items.length > max))
                throw new InputError(`Please select maximum ${max} items.`);

            // Verif each item
            if (subtype !== undefined) {
                if (subtype instanceof Schema) {

                    items = items.map( item =>
                        subtype.validate( item, item, item, { }, []).values
                    )

                } else {

                    items = items.map( item =>
                        subtype.validate( item, items, items, corriger )
                    )

                }
            }

            return items;
        }, {
            ...opts,
            //multiple: true, // Sélection multiple
            //subtype
        })
    }

    public choice = (choices?: any[], opts: TValidator<any> & {} = {}) => 
        new Validator<any>('choice', (val, input, output) => {

            // Choice object
            if (typeof val === 'object' && ('value' in val) && typeof val.value !== 'object')
                val = val.value;

            if (choices !== undefined) {
                const isValid = choices.some(v => v.value === val);
                if (!isValid)
                    throw new InputError("Invalid value. Must be: " + choices.map(v => v.value).join(', '));
            }

            return val;

        }, opts, { choices })

    /*----------------------------------
    - CHAINES
    ----------------------------------*/
    public string = ({ min, max, ...opts }: TValidator<string> & { min?: number, max?: number } = {}) => 
        new Validator<string>('string', (val, input, output, corriger?: boolean) => {

            if (val === '')
                return undefined;
            else if (typeof val === 'number')
                return val.toString();
            else if (typeof val !== 'string')
                throw new InputError("This value must be a string.");

            // Espaces blancs
            val = trim(val);

            // Taille min
            if (min !== undefined && val.length < min)
                throw new InputError(`Must be at least ` + min + ' characters');

            // Taille max
            if (max !== undefined && val.length > max)
                if (corriger)
                    val = val.substring(0, max);
                else
                    throw new InputError(`Must be up to ` + max + ' characters');

            return val;
            
        }, opts)

    public url = (opts: TValidator<string> & {
        normalize?: NormalizeUrlOptions
    } = {}) => 
        new Validator<string>('url', (inputVal, input, output, corriger?) => {

            let val = this.string(opts).validate(inputVal, input, output, corriger);

            // Check if URL
            if (!isURL(val, {
                // https://www.npmjs.com/package/validator
            }))
                throw new InputError(`Please provide a valid URL.`);

            // Normalize
            if (opts.normalize !== undefined)
                val = normalizeUrl(val, opts.normalize);

            console.log("@@@@@@@@@@@@@NORMALISZE URL", opts.normalize, val);

            return val;
        }, opts)

    public email = (opts: TValidator<string> & {} = {}) => 
        new Validator<string>('email', (inputVal, input, output, corriger?: boolean) => {

            let val = this.string(opts).validate(inputVal, input, output, corriger);

            if (!isEmail(val))
                throw new InputError("Please enter a valid email address.");

            // Disable normalzation !!! We should keep the email as it was entered by the user
            /*const normalizedEmail = normalizeEmail(val, {
                all_lowercase: true,
                gmail_lowercase: true,
                gmail_remove_dots: false,
                gmail_remove_subaddress: true,
                gmail_convert_googlemaildotcom: true,
              
                outlookdotcom_lowercase: true,
                outlookdotcom_remove_subaddress: true,
              
                yahoo_lowercase: true,
                yahoo_remove_subaddress: true,
              
                yandex_lowercase: true,

                icloud_lowercase: true,
                icloud_remove_subaddress: true,
            });*/

            const normalizedEmail = val.toLowerCase();
            console.log("validate email, inou", val, normalizedEmail);

            return normalizedEmail;
        }, opts)

    /*----------------------------------
    - NOMBRES
    ----------------------------------*/
    // On ne spread pas min et max afin quils soient passés dans les props du composant
    public number = (withDecimals: boolean) => ({ ...opts }: TValidator<number> & {
        min?: number,
        max?: number,
        step?: number,
    } = {}) => new Validator<number>('number', (val, input, output, corriger?: boolean) => {

        // Vérifications suivantes inutiles si des values spécifiques ont été fournies
        if (opts.in === undefined) {

            // Tente conversion chaine en nombre
            if (typeof val === 'string')
                val = withDecimals ? parseFloat(val) : parseInt(val);
            
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

        return val;
    }, {
        // Force une valeur par défaut si requis
        defaut: opts.opt ? undefined : (opts.min || 0),
        rendu: NumberInput,
        ...opts,
    })

    public int = this.number(false)   

    public float = this.number(true) 

    public bool = (opts: TValidator<boolean> & {} = {}) => 
        new Validator<boolean>('bool', (val, input, output) => {

            if (typeof val !== 'boolean' && !['true', 'false'].includes(val))
                throw new InputError("This value must be a boolean.");

            val = !!val;

            return val;
        }, {
            defaut: false,
            ...opts
        })

    /*----------------------------------
    - AUTRES
    ----------------------------------*/
    public date = (opts: TValidator<Date> & {

    } = {}) => new Validator<Date>('date', (val, input, output) => {

        const chaine = typeof val == 'string';

        // Chaine = format iso
        if (chaine) {

            if (!isISO8601(val))
                throw new InputError("This value must be a date.");

            val = toDate(val);

        } else if (!(val instanceof Date))
            throw new InputError("This value must be a date.");

        return val;

    }, {
        //defaut: new Date,
        ...opts,
    })

    /*----------------------------------
    - FICHIER
    ----------------------------------*/
    protected validateFile = (
        { type, taille, ...opts }: TFileValidator = {}, 
        val: any, 
        input: TObjetDonnees, 
        output: TObjetDonnees
    ): File | undefined => {

        if (!(val instanceof FileToUpload))
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

        return val;
    }

}