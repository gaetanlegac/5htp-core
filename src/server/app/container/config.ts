/*----------------------------------
- DEPENDANCES
----------------------------------*/

/*
    WARNING: This file SHOULDN'T import deps from the project
        Because it's imported by the CLI, which should be independant of the app escept for loading config
*/

// Npm
import fs from 'fs-extra';
import yaml from 'yaml';

/*----------------------------------
- TYPES
----------------------------------*/

declare global {
    namespace Config {

        type EnvName = TEnvConfig["name"];

        type Env = TEnvConfig;
        type Identity = AppIdentityConfig;
        interface Services {}
    }
}

export type TEnvName = TEnvConfig["name"];
export type TEnvConfig = {
    name: 'local' | 'server',
    profile: 'dev' | 'prod',
    version: string,
}

type AppIdentityConfig = {

    name: string,
    identifier: string,
    description: string,
    author: {
        name: string,
        url: string,
        email: string
    },

    social: {

    },

    language: string
    maincolor: string, 

    web: {
        title: string,
        titleSuffix: string,
        fullTitle: string,
        description: string,
        version: string
    }                                 
}

export type AppConfig = { 
    env: Config.Env, 
    identity: Config.Identity,
}

const debug = false;

/*----------------------------------
- LOADE
----------------------------------*/
export default class ConfigParser {

    public constructor(
        public appDir: string,
        public envName?: string
    ) {

    }

    private loadYaml( filepath: string ) {
        debug && console.info(`Loading config ${filepath}`);
        const rawConfig = fs.readFileSync(filepath, 'utf-8');
        return yaml.parse(rawConfig);
    }

    public env(): TEnvConfig {
        // We assume that when we run 5htp dev, we're in local
        // Otherwise, we're in production environment (docker)
        console.log("[app] Using environment:", process.env.NODE_ENV);
        const envFileName = this.appDir + '/env.yaml';
        const envFile = this.loadYaml( envFileName );
        return {
            ...envFile,
            version: BUILD_DATE
        }
    }

    public identity() {
        const identityFile = this.appDir + '/identity.yaml';
        debug && console.info(`Loading identity ${identityFile}`);
        return this.loadYaml( identityFile );
    }
}

/*const walkYaml = (dir: string, configA: any, envName: string) => {

    const files = fs.readdirSync(dir);
    for (const file of files) {

        const fullpath = dir + '/' + file;

        // extension .yaml
        const isDir = fs.lstatSync(fullpath).isDirectory();
        let key = file;
        if (!isDir) {

            if (!file.endsWith('.yaml'))
                continue;

            key = key.substring(0, key.length - 5);

        }

        let fileConfig = configA;

        // Ciblage environnement
        // Before: /config/services/env.<envName>.yaml
        // After: /config/services
        if (key.startsWith('env.')) {

            // Excluding not mtching env name
            if (key.substring(4) !== envName)
                continue;

        // Créé l'entrée dans la config, sauf si le nom du fichier est default
        } else if (key !== 'default') {

            // Init config
            if (!(key in fileConfig))
                fileConfig[key] = {};

            fileConfig = configA[key];

        }

        // Recursion
        if (isDir)
            walk(fullpath, fileConfig, envName);
        // Lecture fichier
        else
            deepExtend(fileConfig, loadYaml(fullpath));

    }
}*/