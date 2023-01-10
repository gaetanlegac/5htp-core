/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Core
import { Erreur, TListeErreursSaisie, InputErrorSchema } from '@common/errors';

// Specific
import { default as Validator, EXCLUDE_VALUE } from './validator';

/*----------------------------------
- TYPES
----------------------------------*/

export type TSchemaFields = { [fieldName: string]: Schema<{}> | Validator<any> }

type TOptsValider = {
    critique?: boolean,
    validationComplete?: boolean,
    avecDependances?: boolean,
    corriger?: boolean,
}

export type TValidationResult<TFields extends TSchemaFields> = {
    values: TValidatedData<TFields>,
    nbErreurs: number,
    erreurs: TListeErreursSaisie
}

export type TValidatedData<TFields extends TSchemaFields> = {
    // For each field, the values returned by validator.validate()
    [name in keyof TFields]: ReturnType<TFields[name]["validate"]>
}

/*----------------------------------
- CONST
----------------------------------*/

const debug = true;

const LogPrefix = '[schema][validator]';

/*----------------------------------
- CLASS
----------------------------------*/
export default class Schema<TFields extends TSchemaFields> {

    public constructor(
        public fields: TFields
    ) {

    }

    public validate<TDonnees extends TObjetDonnees>(
    
        dataToValidate: Partial<TDonnees>,
        allData: TDonnees,
        output: TObjetDonnees = {},
    
        opts: TOptsValider = {},
        chemin: string[] = []
    
    ): TValidationResult<TFields> {
    
        opts = {
            critique: false,
            validationComplete: false,
            avecDependances: true,
            corriger: false,
            ...opts,
        }
    
        const clesAvalider = Object.keys(opts.validationComplete === true ? this.fields : dataToValidate);
    
        let outputSchema = output;
        for (const branche of chemin)
            outputSchema = outputSchema[branche];
    
        // Validation de chacune d'entre elles
        let erreurs: TListeErreursSaisie = {};
        let nbErreurs = 0;
        for (const champ of clesAvalider) {
    
            // La donnée est répertoriée dans le schema
            const field = this.fields[champ];
            if (field === undefined) {
                debug && console.warn(LogPrefix, '[' + champ + ']', 'Exclusion (pas présent dans le schéma)');
                continue;
            }
    
            const cheminA = [...chemin, champ]
            const cheminAstr = cheminA.join('.')
    
            // Sous-schema
            if (field instanceof Schema) {
    
                // Initialise la structure pour permettre l'assignement d'outputSchema
                if (outputSchema[champ] === undefined)
                    outputSchema[champ] = {}

                // The corresponding data should be an object
                const schemadata = dataToValidate[champ];
                if (typeof schemadata !== 'object') {
                    erreurs[ cheminAstr ] = [`Should be an object`];
                    nbErreurs++;
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
                nbErreurs += validationSchema.nbErreurs;
    
                // Pas besoin d'assigner, car output est passé en référence
                //output[champ] = validationSchema.values;
    
    
            // I don't remind what is options.activer about
            /*} else if (field.activer !== undefined && field.activer(allData) === false) {
    
                delete outputSchema[champ];*/
    
            // Validator
            } else {
    
                // Champ composé de plusieurs values
                const valOrigine = field.options.as === undefined
                    ? dataToValidate[champ]
                    // Le champ regroupe plusieurs values (ex: Periode)
                    : field.options.as.map((nomVal: string) => dataToValidate[nomVal])
    
                // Validation
                try {
    
                    const val = field.validate(valOrigine, allData, output, opts.corriger);
    
                    // Exclusion seulement si explicitement demandé
                    // IMPORTANT: Conserver les values undefined
                    //      La présence d'un valeur undefined peut être utile, par exemple, pour indiquer qu'on souhaite supprimer une donnée
                    //      Exemple: undefinec = suppression fichier | Absende donnée = conservation fihcier actuel
                    if (val === EXCLUDE_VALUE)
                        debug && console.log(LogPrefix, '[' + cheminA + '] Exclusion demandée');
                    else
                        outputSchema[champ] = val;
    
                    debug && console.log(LogPrefix, '[' + cheminA + ']', valOrigine, '=>', val);
    
                } catch (error) {
    
                    debug && console.warn(LogPrefix, '[' + cheminA + ']', valOrigine, '|| Erreur:', error);
    
                    if (error instanceof Erreur) {
    
                        // Référencement erreur
                        erreurs[cheminAstr] = [error.message]
                        nbErreurs++;
    
                    } else
                        throw error;
                }
            }
        }
    
        if (nbErreurs !== 0 && opts.critique === true) {
            throw new InputErrorSchema(erreurs);
        }
    
        debug && console.log(LogPrefix, '', dataToValidate, '=>', output);
    
        return { 
            values: output as TValidatedData<TFields>,
            erreurs, 
            nbErreurs, 
        };
    
    }
}