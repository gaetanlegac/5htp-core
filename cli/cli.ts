/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import { Logger } from "tslog";
import cp from 'child_process';
import fs from 'fs-extra';

// Libs
import Paths from './paths';
import loadAppConfig, { TEnvConfig } from '../src/server/app/config';

/*----------------------------------
- TYPES
----------------------------------*/

import type { App } from '../src/server/app';

type TCliCommand = () => Promise<{ 
    run: () => Promise<void> 
}>

export type TAppSide = 'server' | 'client'

/*----------------------------------
- CLASSE
----------------------------------*/
export default class CLI {

    public app: App;

    public constructor(
        cwd: string, 
        public paths = new Paths(cwd)
    ) {

        console.log(`[cli] Start debugger ...`);
        new Logger({ name: "cli", overwriteConsole: true });

        console.log(`[cli] Apply aliases ...`);
        paths.applyAliases();

        console.log(`[cli] Instanciate the app ...`);
        this.app = require("@server/app").default;

        // Import services configuration, defined in the app side
        console.log(`[cli] Load services config ...`);
        const configPath = paths.app.src + '/server/config.ts';
        console.log("Loading servixes config file:", configPath);
        require( configPath );

    }

    public pkg = {
        app: require(this.paths.app.root + '/package.json'),
        core: require(this.paths.core.root + '/package.json'),
    }
    public args: TObjetDonnees = {};

    /*----------------------------------
    - COMMANDS
    ----------------------------------*/
    // Les importations asynchrones permettent d'accéder à l'instance de cli via un import
    public commands: { [name: string]: TCliCommand } = {
        "dev": () => import('./commands/dev'),
        "release": () => import('./commands/build'),
        "deploy-web": () => import('./commands/deploy/web'),
        "deploy-app": () => import('./commands/deploy/app'),
    }

    public async runCommand(command: string, args: TObjetDonnees) {

        this.args = args;

        console.info(`Running command ${command}`, this.args);

        // Loading
        this.commands[command]().then((runner) => {

            // Running
            runner.run().then(() => {

                console.info(`Command ${command} finished.`);

            }).catch((e) => {

                console.error(`Error during execution of ${command}:`, e);

            }).finally(() => {

                process.exit();

            })

        }).catch((e) => {

            console.error(`Error loading ${command}:`, e);

        });
    }


    public shell(...commands: string[]) {

        return new Promise<void>(async (resolve) => {

            const fullCommand = commands.map(command => {

                command = command.trim();

                if (command.endsWith(';'))
                    command = command.substring(0, command.length - 1);

                return command;

            }).join(';');

            console.log('$ ' + fullCommand);

            /*const tempFile = this.paths.app.root + '/.exec.sh';
            fs.outputFileSync(tempFile, '#! /bin/bash\n' + fullCommand);
            const wrappedCommand =  `tilix --new-process -e bash -c 'chmod +x "${tempFile}"; "${tempFile}"; echo "Entrée pour continuer"; read a;'`;*/
            const wrappedCommand =  `bash -c '${fullCommand}; echo "Entrée pour continuer"; read a;'`;
            console.log("Running command: " + wrappedCommand)
            //await this.waitForInput('enter');

            const proc = cp.spawn(wrappedCommand, [], {
                cwd: process.cwd(),
                detached: false,
                // Permer de lancer les commandes via des chaines pures (autrement, il faut separer chaque arg dans un tableau)
                // https://stackoverflow.com/questions/23487363/how-can-i-parse-a-string-into-appropriate-arguments-for-child-process-spawn
                shell: true
            });

            console.log( proc.exitCode );

            proc.on('exit', function () {

                //fs.removeSync(tempFile);

                resolve();
            })

        });
        
    }

}