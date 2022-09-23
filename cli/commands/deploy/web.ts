/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import fs from 'fs-extra';

import prompts from 'prompts';


// Core
import { loadYaml } from "../../../src/server/app/config";
import cli from '../..';
import { sendFiles, ssh, api } from './utils';

// Load configs
const localEnv = loadYaml( cli.paths.app.root + '/env.yaml' );
const serverEnv = loadYaml(cli.paths.app.root + '/env.server.yaml');

0/*----------------------------------
- HELPERS
----------------------------------*/

const mergeDeps = ({ dependencies: coreDeps }, { dependencies: appDeps }) => {
    for (const dep in appDeps)
        if (dep in coreDeps) {

            if (coreDeps[dep] !== appDeps[dep])
                throw new Error(`Duplicate dependency "${dep}" with different version in core (${coreDeps[dep]}) and app (${appDeps[dep]})`);
            else
                console.warn(`Duplicate dependency "${dep}" in core and app`);

        } else
            coreDeps[dep] = appDeps[dep];
    return coreDeps;
}

const toast = (type: string, title: string, content: string) =>
    api('POST', '/admin/api/notification', { type, title, content }, true)

/*----------------------------------
- COMMAND
----------------------------------*/
export async function run() {

    const { simulate } = cli.args;
    console.log(localEnv, '=>', serverEnv);

    const temp = cli.paths.app.root + '/.temp';
    fs.emptyDirSync(temp);

    // app package.json: Merge dependencies
    const appPkg = fs.readJSONSync(cli.paths.app.root + '/package.json');
    const corePkg = fs.readJSONSync(cli.paths.core.root + '/package.json');
    fs.outputJSONSync(temp + '/package.json', {

        ...appPkg,
        dependencies: mergeDeps(corePkg, appPkg),
        devDependencies: {}

    }, { spaces: 4 });

    fs.copyFileSync( cli.paths.app.root + (simulate ? '/env.yaml' : '/env.server.yaml'), temp + '/env.yaml' );

    // Upload
    await cli.shell(

        'echo "Uploading App files ..."',
        sendFiles( cli.paths.app.root, [
            '/bin/**',      // Server & chunks
            '/*.yaml',      // Config files
            '/public/**',   // Public resources
            ...(simulate ? ['/var/**'] : []) // Internal variable resources
        ], simulate),

        'echo "Uploading App files ..."',
        sendFiles( temp, [
            '/package.json',
            '/env.yaml',
        ], simulate),

        'echo "Applying update ..."',
        ssh(`

            ${toast("info", "Server update", 
                "A server update will start. You might experience some temporary slowdowns.")}

            if [ -d "./node_modules" ]; then
                echo "Updating node_modules";
                npm install --prefer-offline --no-audit --ignore-scripts;
            else
                echo "Installing node_modules";
                npm install
            fi

            echo "Finished.";

            ${toast("success", "Updated.", 
                "Your app has been updated. Please reload it to use the new version and, by the way, prevent bugs.")}

        ` + (simulate ? `

            npm start;
        
        ` : `
        
        `), simulate)

    );

    fs.removeSync(temp);

}