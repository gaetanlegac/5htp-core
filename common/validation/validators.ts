/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import trim from 'validator/lib/trim';
import isISO8601 from 'validator/lib/isISO8601';
import toDate from 'validator/lib/toDate';
import isEmail from 'validator/lib/isEmail';
import isURL from 'validator/lib/isURL';

import normalizeUrl, { Options as NormalizeUrlOptions } from 'normalize-url';

// Core
import { InputError } from '@common/errors';
import FileToUpload from '@client/components/File/FileToUpload';

// Speciific
import Schema, { TSchemaFields } from './schema'
import Validator, { TValidatorOptions, EXCLUDE_VALUE, TValidatorDefinition } from './validator'

/*----------------------------------
- TYPES
----------------------------------*/

export type TFileValidator = TValidatorOptions<FileToUpload> & {
    type?: string[], // Raccourci, ou liste de mimetype
    taille?: number,
    disk?: string, // Disk to upload files to
}

type TSchemaSubtype = Schema<{}> | TSchemaFields | TValidatorDefinition;

type TSubtype = TSchemaSubtype | Validator<any> | TValidatorDefinition;

/*----------------------------------
- CONST
----------------------------------*/

export type TRichTextValidatorOptions = {
    attachements?: TFileValidator
}

export const getFieldValidator = (field: TValidatorDefinition) => {

    if (Array.isArray(field)) {

        const [validatorName, validatorArgs] = field;
        const getValidator = validators[validatorName];
        if (getValidator === undefined)
            throw new Error('Unknown validator: ' + validatorName);

        return getValidator(...validatorArgs);

        // TSchemaFields
    } else if (field.constructor === Object) {

        return new Schema(field as TSchemaFields);

        // Schema
    } else
        return field as Validator<any>
}

// Recursive function to validate each node
function validateLexicalNode(node: any, opts: TRichTextValidatorOptions ) {

    // Each node should be an object with a `type` property
    if (typeof node !== 'object' || !node.type || typeof node.type !== 'string')
        throw new InputError("Invalid rich text value (3).");

    // Validate text nodes
    if (node.type === 'text') {

        if (typeof node.text !== 'string')
            throw new InputError("Invalid rich text value (4).");

        // Validate paragraph, heading, or other structural nodes that may contain children
    } else if (['paragraph', 'heading', 'list', 'listitem'].includes(node.type)) {

        if (!Array.isArray(node.children) || !node.children.every(children => validateLexicalNode(children, opts))) {
            throw new InputError("Invalid rich text value (5).");
        }

        // Files upload
    } else if (node.type === 'image') {

        // Check if allowed
        /*if (opts.attachements === undefined)
            throw new InputError("Image attachments not allowed in this rich text field.");*/

        // TODO: check mime


        // Upload file


    }

    return true;
}

/*----------------------------------
- CLASS
----------------------------------*/
export class SchemaValidators {

    /*----------------------------------
    - UTILITIES
    ----------------------------------*/
    // Make every field optional
    public partial = <TFields extends TSchemaFields>(schema: TFields, fieldsList?: (keyof TFields)[] ) => {

        if (fieldsList === undefined)
            fieldsList = Object.keys(schema) as (keyof TFields)[];

        const partialSchema: Partial<TFields> = {};
        for (const key of fieldsList) {

            if (!(key in schema))
                throw new Error("The field " + key + " is not in the schema.");

            // Only if validator
            if (schema[key] instanceof Validator)
                partialSchema[key] = new Validator(schema[key].type, schema[key].validateType, {
                    ...schema[key].options,
                    opt: true
                });
            else
                partialSchema[key] = schema[key];
        }

        return partialSchema as TFields;
    }

    /*----------------------------------
    - CONTENEURS
    ----------------------------------*/
    public object = ( subtype?: TSchemaSubtype, { ...opts }: TValidatorOptions<object> & {

    } = {}) => 
        new Validator<object>('object', (val, options, path) => {

            // The value should be an object
            if (typeof val !== 'object' || val.constructor !== Object)
                throw new InputError("This value must be an object.");

            // If no subtype, return the object as is
            if (subtype === undefined)
                return val;

            // If subtype is a schema
            const schema = getFieldValidator(subtype) as Schema<{}>;

            // Validate schema
            const value = schema.validate(val, options, path);
            
            return value;
        }, opts)

    public array = ( subtype: TSubtype, { choice, min, max, ...opts }: TValidatorOptions<any[]> & {
        choice?: any[],
        min?: number, 
        max?: number
    } = {}) => new Validator<any[]>('array', (items, options, path) => {

        // Type
        if (!Array.isArray(items))
            throw new InputError("This value must be a list.");

        // Items number
        if ((min !== undefined && items.length < min))
            throw new InputError(`Please select at least ${min} items.`);
        if ((max !== undefined && items.length > max))
            throw new InputError(`Please select maximum ${max} items.`);

        // Verif each item
        if (subtype === undefined)
            return items;

        const validator = getFieldValidator(subtype);

        items = items.map( item =>
            validator.validate( item, options, path )
        )

        return items;
    }, {
        ...opts,
        //multiple: true, // Sélection multiple
    })

    public choice = (choices?: any[], { multiple, ...opts }: TValidatorOptions<any> & { 
        multiple?: boolean 
    } = {}) => new Validator<any>('choice', (val, options, path) => {

        // Empty array = undefined if not required
        if (val.length === 0 && opts.opt)
            return undefined;

        // Normalize for verifications
        const choicesValues = choices?.map(v => typeof v === 'object' ? v.value : v)

        const checkChoice = ( choice: any ) => {

            // Choice object = extract value
            //  We check for choice objec via the label prop, as the value can be undefined (and so, not transmitted)
            if (typeof choice === 'object' && ('label' in choice) && typeof choice.label === 'string' && typeof choice.value !== 'object')
                choice = choice.value;

            // If choices list rpovided, check if the choice is in the choices list
            if (choicesValues !== undefined && !choicesValues.includes(choice))
                throw new InputError("Invalid value: " + choice + ". Must be: " + choicesValues.join(', '));

            return choice;

        }

        // Check every choice
        if (Array.isArray( val ))
            val = val.map(checkChoice)
        else 
            val = checkChoice( val );

        return val;

    }, opts, { choices, multiple })

    /*----------------------------------
    - CHAINES
    ----------------------------------*/
    public string = ({ min, max, in: choices, ...opts }: TValidatorOptions<string> & { 
        min?: number, 
        max?: number,
        in?: string[]
    } = {}) => new Validator<string>('string', (val, options, path) => {

        // Check type
        if (val === '')
            return undefined;
        else if (typeof val === 'number')
            return val.toString();
        else if (typeof val !== 'string')
            throw new InputError("This value must be a string.");

        // Whitespace
        val = trim(val);

        // In
        if (choices !== undefined && !choices.includes(val))
            throw new InputError(`Invalid value: ${val}. Must be one of: ${choices.join(', ')}`);

        // Min size
        if (min !== undefined && val.length < min)
            throw new InputError(`Must be at least ` + min + ' characters');

        // Max size
        if (max !== undefined && val.length > max)
            if (options?.autoCorrect)
                val = val.substring(0, max);
            else
                throw new InputError(`Must be up to ` + max + ' characters');

        return val;
        
    }, opts)

    public url = (opts: TValidatorOptions<string> & {
        normalize?: NormalizeUrlOptions
    } = {}) => 
        new Validator<string>('url', (inputVal, options, path) => {

            let val = this.string(opts).validate(inputVal, options, path);

            // Check if URL
            if (!isURL(val, {
                // https://www.npmjs.com/package/validator
            }))
                throw new InputError(`Please provide a valid URL.`);

            // Normalize
            if (opts.normalize !== undefined)
                val = normalizeUrl(val, opts.normalize);

            return val;
        }, opts)

    public email = (opts: TValidatorOptions<string> & {} = {}) => 
        new Validator<string>('email', (inputVal, options, path) => {

            let val = this.string(opts).validate(inputVal, options, path);

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
    public number = (withDecimals: boolean) => ({ ...opts }: TValidatorOptions<number> & {
        min?: number,
        max?: number,
        step?: number,
    } = {}) => new Validator<number>('number', (val, options, path) => {

        // Tente conversion chaine en nombre
        if (typeof val === 'string')
            val = withDecimals ? parseFloat(val) : parseInt(val);
        
        if (opts.min === undefined)
            opts.min = 0;
        
        // Type de donnée
        if (Number.isNaN(val) || typeof val !== 'number') {
            if (options?.autoCorrect)
                val = opts.min;
            else
                throw new InputError("This value must be a number.");
        }

        // Minimum
        if (val < opts.min)
            if (options?.autoCorrect)
                val = opts.min;
            else
                throw new InputError(`Must be at least ` + opts.min);

        // Maximum
        if (opts.max !== undefined && val > opts.max)
            if (options?.autoCorrect)
                val = opts.max;
            else
                throw new InputError(`Must be up to ` + opts.max);

        return val;
    }, {
        // Force une valeur par défaut si requis
        defaut: opts.opt ? undefined : (opts.min || 0),
        ...opts,
    })

    public int = this.number(false)   

    public float = this.number(true) 

    public bool = (opts: TValidatorOptions<boolean> & {} = {}) => 
        new Validator<boolean>('bool', (val, options, path) => {

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
    public date = (opts: TValidatorOptions<Date> & {

    } = {}) => new Validator<Date>('date', (val, options, path) => {

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

    public richText(opts: TValidatorOptions<string> & TRichTextValidatorOptions = {}) {
        return new Validator<string>('richText', (val, options, path) => {

            // We get a stringified json as input since the editor workds with JSON string
            try {
                val = JSON.parse(val);
            } catch (error) {
                console.error("Failed to parse rich text json:", error, val);
                throw new InputError("Invalid rich text format.");
            }

            // Check that the root exists and has a valid type
            if (!val || typeof val !== 'object' || typeof val.root !== 'object' || val.root.type !== 'root')
                throw new InputError("Invalid rich text value (1).");

            // Check if root has children array
            if (!Array.isArray(val.root.children))
                throw new InputError("Invalid rich text value (2).");

            // Validate each child node in root
            for (const child of val.root.children) {
                validateLexicalNode(child, opts);
            }

            return val;

        }, {
            //defaut: new Date,
            ...opts,
        })
    }

    /*----------------------------------
    - FICHIER
    ----------------------------------*/
    public file = ({ type, taille, ...opts }: TFileValidator & {

    } = {}) => new Validator<FileToUpload>('file', (val, options, path) => {

        // Chaine = url ancien fichier = exclusion de la valeur pour conserver l'ancien fichier
        // NOTE: Si la valeur est présente mais undefined, alors on supprimera le fichier
        if (typeof val === 'string')
            return EXCLUDE_VALUE;

        if (!(val instanceof FileToUpload))
            throw new InputError(`Must be a File (${typeof val} received)`);

        // MIME
        if (type !== undefined) {

            const mimeMatch = type.some( t => t === val.type || val.type.startsWith(t + '/') );
            if (!mimeMatch)
                throw new InputError('Only the following formats are allowed: ' + type.join(', ') + '. The file you gave is ' + val.type + '.');

        }

        // Taille
        if (taille) {
            const tailleFichier = val.size / 1024 / 1024; // Mo
            if (tailleFichier > taille)
                throw new InputError(`Le fichier ne doit pas faire plus de ${taille} Mo (taille reçue: ${tailleFichier} Mo)`);
        }

        return val;

    }, {
        //defaut: new Date,
        ...opts,
    })
}

const validators = new SchemaValidators();

export default validators;