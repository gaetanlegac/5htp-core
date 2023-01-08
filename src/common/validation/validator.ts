/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import type { ComponentChild } from 'preact'

// Core
import { InputError } from '@common/errors';

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
    corriger?: boolean
]

type TValidationFunction<TValue, TAllValues extends {} = {}> = (
    ...args: TValidationArgs<TValue, TAllValues>
    ) => TValue | typeof EXCLUDE_VALUE | undefined;

/*----------------------------------
- CONST
----------------------------------*/

export const EXCLUDE_VALUE = "action:exclure" as const;

/*----------------------------------
- CLASS
----------------------------------*/
export default class Validator<TValue> {

    public constructor( 
        public type: string,
        public validateType: TValidationFunction<TValue>, 
        public options: TValidator<TValue>
    ) {

    }

    public isEmpty = (val: any) => val === undefined || val === '' || val === null

    public validate(...[ val, input, output, correct ]: TValidationArgs<TValue, {}>) {

        // Required value
        if (this.isEmpty(val)) {
            // Optionnel, on skip
            if (this.options.opt === true)
                return undefined;
            // Requis
            else
                throw new InputError("Please enter a value");
        }

        // Validate type
        return this.validateType(val, input, output, correct);
    }

}