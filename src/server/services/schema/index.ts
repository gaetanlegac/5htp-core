/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Core

// Specific
import SchemaValidator, { TFileValidator } from '@common/validation/validators';

import Validator, { EXCLUDE_VALUE,} from '@common/validation/validator';

import NormalizedFile from '@common/data/file';

/*----------------------------------
- TYPES
----------------------------------*/


/*----------------------------------
- SERVICE
----------------------------------*/
export default class ServerSchemaValidator extends SchemaValidator {

    public file = ({ ...opts }: TFileValidator & { sharp: any }) => 
        new Validator<NormalizedFile>('file', (val, input, output) => {

            // Chaine = url ancien fichier = exclusion de la valeur pour conserver l'ancien fichier
            // NOTE: Si la valeur est présente mais undefined, alors on supprimera le fichier
            if (typeof val === 'string')
                return EXCLUDE_VALUE;

            // Validation universelle
            const file = this.validateFile(opts, val, input, output);

            if (file === undefined)
                return file;

            // Process Image
            if (opts.sharp !== undefined) {



            }

            return file;
        }, opts)
}