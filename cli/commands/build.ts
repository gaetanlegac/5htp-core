/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import prompts from 'prompts';

// Configs
import createCompilers from '../compiler';

/*----------------------------------
- TYPES
----------------------------------*/

/*----------------------------------
- COMMAND
----------------------------------*/
export const run = (): Promise<void> => new Promise(async (resolve) => {

    const multiCompiler = await createCompilers('prod');

    multiCompiler.run((error, stats) => {

        resolve();

    });
});