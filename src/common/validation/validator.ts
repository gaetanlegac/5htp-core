/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import type { ComponentChild } from 'preact'

// Core
import { InputError } from '@common/errors';

// Specific
import type { TValidateOptions } from './schema';
import type Validators from './validators';
import type { InputBaseProps } from '@client/components/inputv3/base';

/*----------------------------------
- TYPES
----------------------------------*/

export type TValidatorDefinition<K extends keyof Validators = keyof Validators> = [
    type: K, 
    args: Parameters<Validators[K]>, 
    returnType: ReturnType<Validators[K]> 
]

// TODO: remove
export type TValidatorOptions<TValue> = {

    rendu?: TFieldRenderer,

    // I don't remind what is options.activer about
    activer?: (donnees: TObjetDonnees) => boolean,
    onglet?: string, // Sert juste d'identifiant secondaire. Ex: nom onglet correspondant

    // Executé après le validateur propre au type
    dependances?: string[],
    opt?: true,
    defaut?: TValue,

}

export type TFieldRenderer = (props: any) => ComponentChild;

type TNonEmptyValue = Exclude<any, undefined | '' | null>

type TValidationArgs<TValue, TAllValues extends {}> = [
    // For the value given as input in the validation function,
    //  Only the empty values were escluded
    val: TNonEmptyValue, 
    validateOptions: TValidateOptions,
    path: string[]
]

type TValidationFunction<TValue, TAllValues extends {} = {}> = (
    ...args: TValidationArgs<TValue, TAllValues>
) => TValue | typeof EXCLUDE_VALUE;

type TValidateReturnType<
    TOptions extends TValidatorOptions<TValue>, 
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
export default class Validator<
    TValue, 
    TOptions extends TValidatorOptions<TValue> = TValidatorOptions<TValue>,
    //TComponent = React.FunctionComponent< InputBaseProps< TValue > >
> {

    public constructor( 
        public type: string,
        public validateType: TValidationFunction<TValue>, 
        public options: TOptions,
        public componentAttributes: Partial<InputBaseProps<TValue>> = {}
    ) {

        // Basic component attriutes
        this.componentAttributes.required = options?.opt !== true;
        //this.componentAttributes.validator = this;

    }

    public isEmpty = (val: any) => val === undefined || val === '' || val === null

    public validate(...[ 
        val, validateOptions, path
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
        return this.validateType(val, validateOptions, path) as TValidateReturnType<TOptions, TValue>;
    }

}