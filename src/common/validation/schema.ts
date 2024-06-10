/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Core
import { CoreError, TListeErreursSaisie, InputErrorSchema } from '@common/errors';

// Specific
import { default as Validator, EXCLUDE_VALUE } from './validator';

/*----------------------------------
- TYPES
----------------------------------*/

export type TSchemaFields = { [fieldName: string]: TSchemaFields | Schema<{}> | Validator<any> }

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

    public validate<TDonnees extends TObjetDonnees>(
        dataToValidate: Partial<TDonnees>,
        opts: TValidateOptions<TFields> = {},
        chemin: string[] = []
    ): TValidatedData<TFields> {

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
    
            // La donnée est répertoriée dans le schema
            let field = this.fields[fieldName];
            let validator: Validator<any> | Schema<{}>;
            if (field === undefined) {
                opts.debug && console.warn(LogPrefix, '[' + fieldName + ']', 'Exclusion (pas présent dans le schéma)');
                continue;
            } else if (field.constructor === Object)
                validator = new Schema(field as TSchemaFields);
            else
                validator = field as Validator<any>;

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
                else
                    output[fieldName] = val;

                opts.debug && console.log(LogPrefix, '[' + cheminA + ']', valOrigine, '=>', val);

            } catch (error) {

                opts.debug && console.warn(LogPrefix, '[' + cheminA + ']', valOrigine, '|| CoreError:', error);

                if (error instanceof InputErrorSchema) {

                    erreurs = { ...erreurs, ...error.erreursSaisie };
                    errorsCount += Object.keys(error.erreursSaisie).length;

                } else if (error instanceof CoreError) {

                    erreurs[cheminAstr] = [error.message]
                    errorsCount++;

                } else if (SERVER) {

                    // Server: transmiss error & report bug
                    throw error;

                } else {

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
                erreurs = error.erreursSaisie;
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