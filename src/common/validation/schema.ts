/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Core
import { CoreError, TListeErreursSaisie, InputErrorSchema } from '@common/errors';

// Specific
import { default as Validator, EXCLUDE_VALUE, TValidatorDefinition } from './validator';
import defaultValidators, { SchemaValidators, getFieldValidator } from './validators';

/*----------------------------------
- TYPES
----------------------------------*/

export type TSchemaFields = { 
    [fieldName: string]: TSchemaFields | Schema<{}> | TValidatorDefinition
}

type TSchemaOptions = {
    opt?: boolean
}

export type TValidateOptions<TFields extends TSchemaFields = {}> = {
    debug?: boolean,
    throwError?: boolean,
    ignoreMissing?: boolean,
    only?: (keyof TFields)[],
    validateDeps?: boolean,
    autoCorrect?: boolean,
    validators?: SchemaValidators
}

export type TValidationResult<TFields extends TSchemaFields> = {
    values: TValidatedData<TFields>,
    errorsCount: number,
    erreurs: TListeErreursSaisie
}

export type TSchemaData<TSchema extends Schema<{}>> =
    TValidationResult<TSchema["fields"]>

export type TValidatedData<TFields extends TSchemaFields> = {
    // For each field, the values returned by validator.validate()
    [name in keyof TFields]: ReturnType<TFields[name]["validate"]>
}

/*----------------------------------
- CONST
----------------------------------*/

const LogPrefix = '[schema][validator]';

/*----------------------------------
- CLASS
----------------------------------*/
export default class Schema<TFields extends TSchemaFields> {

    public constructor(
        public fields: TFields,
        public options: TSchemaOptions = {}
    ) {

    }

    public getFieldValidator(
        fieldName: string,
        validators: SchemaValidators = defaultValidators
    ): null | Validator<any> | Schema<{}> {

        let field = this.fields[fieldName];
        if (field === undefined) {

            return null;

        // TValidatorDefinition
        } else
            return getFieldValidator(field);
    }

    public validate<TDonnees extends TObjetDonnees>(
        dataToValidate: Partial<TDonnees>,
        opts: TValidateOptions<TFields> = {},
        chemin: string[] = []
    ): TValidatedData<TFields> {

        const validators = opts.validators || defaultValidators;

        // Check data type
        if (typeof dataToValidate !== 'object')
            throw new InputErrorSchema({ [chemin.join('.')]: ['Must be an object'] });
    
        // Default options
        opts = {
            debug: false,
            throwError: true,
            validateDeps: true,
            autoCorrect: false,
            ...opts,
        }

        const keysToValidate = (opts.only || Object.keys(this.fields)) as string[];
    
        // Validation de chacune d'entre elles
        const output: Partial<TDonnees> = {};
        let erreurs: TListeErreursSaisie = {};
        let errorsCount = 0;
        for (const fieldName of keysToValidate) {
    
            const validator = this.getFieldValidator(fieldName, validators);
            if (validator === null) {
                opts.debug && console.warn(LogPrefix, '[' + fieldName + ']', 'Exclusion (pas présent dans le schéma)');
                continue;
            }

            // Create field path
            const cheminA = [...chemin, fieldName]
            const cheminAstr = cheminA.join('.')
            const valOrigine = dataToValidate[fieldName];

            // Validation
            try {

                const val = validator.validate(valOrigine, opts, cheminA);

                // Exclusion seulement si explicitement demandé
                // IMPORTANT: Conserver les values undefined
                //      La présence d'un valeur undefined peut être utile, par exemple, pour indiquer qu'on souhaite supprimer une donnée
                //      Exemple: undefinec = suppression fichier | Absende donnée = conservation fihcier actuel
                if (val === EXCLUDE_VALUE)
                    opts.debug && console.log(LogPrefix, '[' + cheminA + '] Exclusion demandée');
                // Key not in the input data, we don't create an entry in the output
                else if (fieldName in dataToValidate)
                    output[fieldName] = val;

                opts.debug && console.log(LogPrefix, '[' + cheminA + ']', valOrigine, '=>', val);

            } catch (error) {

                opts.debug && console.warn(LogPrefix, '[' + cheminA + ']', valOrigine, '|| CoreError:', error);

                if (error instanceof InputErrorSchema) {

                    erreurs = { ...erreurs, ...error.errors };
                    errorsCount += Object.keys(error.errors).length;

                } else if (error instanceof CoreError) {

                    erreurs[cheminAstr] = [error.message]
                    errorsCount++;

                } else if (SERVER) {

                    // Server: transmiss error & report bug
                    throw error;

                } else {

                    console.error(LogPrefix, '[' + cheminA + ']', error);
                    erreurs[cheminAstr] = ["Technical error while validating data"];
                    errorsCount++;
                }
            }
        }
    
        if (errorsCount !== 0)
            throw new InputErrorSchema(erreurs);
        
        opts.debug && console.log(LogPrefix, '', dataToValidate, '=>', output);
    
        return output as TValidatedData<TFields>;
    }

    public validateWithDetails<TDonnees extends TObjetDonnees>(
    
        dataToValidate: Partial<TDonnees>,
        allData: TDonnees,
        output: TObjetDonnees = {},
    
        opts: TValidateOptions<TFields> = {},
        chemin: string[] = []
    
    ): TValidationResult<TFields> {

        let erreurs: TListeErreursSaisie = {};
        let errorsCount = 0;

        try {
            this.validate(dataToValidate, opts, chemin);
        } catch (error) {
            if (error instanceof InputErrorSchema) {
                erreurs = error.errors;
                errorsCount = Object.keys(erreurs).length;
            } else {
                throw error;
            }
        }

        return { 
            values: output as TValidatedData<TFields>,
            erreurs, 
            errorsCount, 
        };
    }
}