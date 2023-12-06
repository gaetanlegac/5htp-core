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

export type TSchemaFields = { [fieldName: string]: Schema<{}> | Validator<any> }

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
        allData: TDonnees,
        output: TObjetDonnees = {},
    
        opts: TValidateOptions<TFields> = {},
        chemin: string[] = []
    
    ): TValidationResult<TFields> {
    
        opts = {
            debug: false,
            throwError: false,
            validateDeps: true,
            autoCorrect: false,
            ...opts,
        }
    
        let outputSchema = output;
        for (const branche of chemin)
            outputSchema = outputSchema[branche];

        const keysToValidate = opts.only || Object.keys(this.fields);
    
        // Validation de chacune d'entre elles
        let erreurs: TListeErreursSaisie = {};
        let errorsCount = 0;
        for (const fieldName of keysToValidate) {
    
            // La donnée est répertoriée dans le schema
            const field = this.fields[fieldName];
            if (field === undefined) {
                opts.debug && console.warn(LogPrefix, '[' + fieldName + ']', 'Exclusion (pas présent dans le schéma)');
                continue;
            }

            const cheminA = [...chemin, fieldName]
            const cheminAstr = cheminA.join('.')
    
            // Sous-schema
            if (field instanceof Schema) {
    
                // Initialise la structure pour permettre l'assignement d'outputSchema
                if (outputSchema[fieldName] === undefined)
                    outputSchema[fieldName] = {}

                // The corresponding data should be an object
                const schemadata = dataToValidate[fieldName];
                if (typeof schemadata !== 'object') {
                    erreurs[ cheminAstr ] = [`Should be an object`];
                    errorsCount++;
                    continue;
                }
    
                // Validate the data
                const validationSchema = field.validate(

                    schemadata,
                    allData,
                    output,

                    opts,
                    cheminA
                );
                erreurs = { ...erreurs, ...validationSchema.erreurs };
                errorsCount += validationSchema.errorsCount;
    
                // Pas besoin d'assigner, car output est passé en référence
                //output[fieldName] = validationSchema.values;
    
    
            // I don't remind what is options.activer about
            /*} else if (field.activer !== undefined && field.activer(allData) === false) {
    
                delete outputSchema[fieldName];*/
    
            // Validator
            } else {
    
                // Champ composé de plusieurs values
                const valOrigine = field.options.as === undefined
                    ? dataToValidate[fieldName]
                    // Le fieldName regroupe plusieurs values (ex: Periode)
                    : field.options.as.map((nomVal: string) => dataToValidate[nomVal])
    
                // Validation
                try {
    
                    const val = field.validate(valOrigine, allData, output, opts);
    
                    // Exclusion seulement si explicitement demandé
                    // IMPORTANT: Conserver les values undefined
                    //      La présence d'un valeur undefined peut être utile, par exemple, pour indiquer qu'on souhaite supprimer une donnée
                    //      Exemple: undefinec = suppression fichier | Absende donnée = conservation fihcier actuel
                    if (val === EXCLUDE_VALUE)
                        opts.debug && console.log(LogPrefix, '[' + cheminA + '] Exclusion demandée');
                    else
                        outputSchema[fieldName] = val;
    
                    opts.debug && console.log(LogPrefix, '[' + cheminA + ']', valOrigine, '=>', val);
    
                } catch (error) {
    
                    opts.debug && console.warn(LogPrefix, '[' + cheminA + ']', valOrigine, '|| CoreError:', error);
    
                    if (error instanceof CoreError) {
    
                        // Référencement erreur
                        erreurs[cheminAstr] = [error.message]
                        errorsCount++;
    
                    } else
                        throw error;
                }
            }
        }
    
        if (errorsCount !== 0 && opts.throwError === true) {
            throw new InputErrorSchema(erreurs);
        }
        
        opts.debug && console.log(LogPrefix, '', dataToValidate, '=>', output);
    
        return { 
            values: output as TValidatedData<TFields>,
            erreurs, 
            errorsCount, 
        };
    
    }
}