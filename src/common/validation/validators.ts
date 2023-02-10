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

// Core
import { InputError } from '@common/errors';
import FileToUpload from '@client/components/inputv3/file/FileToUpload';

// Speciific
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
export default class SchemaValidator {

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

    public array = (subtype?: Validator<any>, { choice, ...opts }: TValidator<any[]> & {
        choice?: any[]
    } = {}) => {

        if (subtype !== undefined)
            subtype.options.in = choice;

        return new Validator<any[]>('array', (items, input, output, corriger) => {

            //console.log('VALIDER ARRAY', items, input);

            if (!Array.isArray(items))
                throw new InputError("This value must be an array.");

            // Verif items
            if (subtype !== undefined) {
                if (false/*subtype instanceof Schema*/) {

                    console.log('TODO: VALIDER VIA SOUS SCHEMA');

                } else {

                    for (let i = 0; i < items.length; i++)
                        items[i] = subtype.validate( items[i], items, items, corriger );

                }
            }

            return items;
        }, {
            ...opts,
            in: choice,
            //multiple: true, // Sélection multiple
            //subtype
        })
    }

    public choice = (values: any[], opts: TValidator<any> & {} = {}) => 
        new Validator<any>('object', (val, input, output) => {

            if (!values.includes(val))
                throw new InputError("Invalid value. Must be: " + values.join(', '));

            return val;

        }, opts)

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

    public url = (opts: TValidator<string> & {} = {}) => 
        new Validator<string>('url', (inputVal, input, output, corriger?) => {

            let val = this.string(opts).validate(inputVal, input, output, corriger);

            if (!isURL(val, {
                // https://www.npmjs.com/package/validator
            }))
                throw new InputError(`Please provide a valid URL.`);

            return val;
        }, opts)

    public email = (opts: TValidator<string> & {} = {}) => 
        new Validator<string>('email', (inputVal, input, output, corriger?: boolean) => {

            let val = this.string(opts).validate(inputVal, input, output, corriger);

            if (!isEmail(val))
                throw new InputError("Please enter a valid email address.");

            const retour = normalizeEmail(val);

            return retour;
        }, opts)

    /*----------------------------------
    - NOMBRES
    ----------------------------------*/
    // On ne spread pas min et max afin quils soient passés dans les props du composant
    public number = (withDecimals: boolean) => ({ ...opts }: TValidator<number> & {
        min?: number,
        max?: number,
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