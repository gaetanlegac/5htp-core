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

import cli from '..';
import CLI from '../cli';

/*----------------------------------
- COMMAND
----------------------------------*/
export const run = (): Promise<void> => new Promise(async (resolve) => {

    const multiCompiler = await createCompilers('prod');

    const { deploy } = cli.args;

    multiCompiler.run(async (error, stats) => {

        if (deploy) {
            await cli.runCommand('deploy-web', { simulate: false });
        } else {

            // Next steps
            const { action } = await prompts({
                type: 'select',
                name: 'action',
                message: 'What to do next ?',
                choices: [
                    { title: 'Deploy (simulation)', value: 'deploy-simulation' },
                    { title: 'Deploy (production)', value: 'deploy' }
                ],
            });

            switch (action) {
                case 'deploy-simulation':
                    await cli.runCommand('deploy-web', { simulate: true });
                    break;
                case 'deploy':
                    await cli.runCommand('deploy-web', { simulate: false });
                    break;
            }

        }

        resolve();


    });

});