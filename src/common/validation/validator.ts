/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import type { ComponentChild } from 'preact'

// Core
import { InputError } from '@common/errors';

// Specific
import type { TValidateOptions } from './schema';

/*----------------------------------
- TYPES
----------------------------------*/

export type TValidator<TValue> = {

    rendu?: TFieldRenderer,

    // I don't remind what is options.activer about
    activer?: (donnees: TObjetDonnees) => boolean,
    onglet?: string, // Sert juste d'identifiant secondaire. Ex: nom onglet correspondant

    // Restrict to a specific set of values
    in?: TValue[],

    // Executé après le validateur propre au type
    dependances?: string[],
    opt?: true,
    defaut?: TValue,
    as?: string[], // Mapping personnalisé

}

export type TFieldRenderer = (props: any) => ComponentChild;

type TNonEmptyValue = Exclude<any, undefined | '' | null>

type TValidationArgs<TValue, TAllValues extends {}> = [
    // For the value given as input in the validation function,
    //  Only the empty values were escluded
    val: TNonEmptyValue, 
    input: TAllValues, 
    output: Partial<TAllValues>, 
    validateOptions?: TValidateOptions
]

type TValidationFunction<TValue, TAllValues extends {} = {}> = (
    ...args: TValidationArgs<TValue, TAllValues>
) => TValue | typeof EXCLUDE_VALUE;

type TValidateReturnType<
    TOptions extends TValidator<TValue>, 
    TValue extends any
> = TOptions extends { opt: true } 
    ? (undefined | TValue) 
    : TValue

/*----------------------------------
- CONST
----------------------------------*/

export const EXCLUDE_VALUE = "action:exclure" as const;

/*----------------------------------
- CLASS
----------------------------------*/
export default class Validator<TValue, TOptions extends TValidator<TValue> = TValidator<TValue>> {

    public constructor( 
        public type: string,
        public validateType: TValidationFunction<TValue>, 
        public options: TOptions
    ) {

    }

    public isEmpty = (val: any) => val === undefined || val === '' || val === null

    public validate(...[ 
        val, input, output, validateOptions 
    ]: TValidationArgs<TValue, {}>): TValidateReturnType<TOptions, TValue> {

        // Required value
        if (this.isEmpty(val)) {
            // Optionnel, on skip
            if (this.options.opt === true || (
                validateOptions?.ignoreMissing === true
                &&
                val === undefined
            ))
                return undefined as TValidateReturnType<TOptions, TValue>;
            // Requis
            else
                throw new InputError("Please enter a value");
        }

        // Validate type
        return this.validateType(val, input, output, validateOptions) as TValidateReturnType<TOptions, TValue>;
    }

}