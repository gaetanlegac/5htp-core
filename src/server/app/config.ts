/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import fs from 'fs-extra';
import yaml from 'yaml';
import deepExtend from 'deep-extend';

/*----------------------------------
- TYPES
----------------------------------*/

declare global {
    namespace Core {
        namespace Config {
            type EnvName = TEnvConfig["name"];
            interface Services {}

            type Identity = AppIdentityConfig;
        }
    }
}

export type TEnvName = TEnvConfig["name"];
export type TEnvConfig = {
    profile: 'dev' | 'prod',
    level: 'silly' | 'info' | 'warn' | 'error',
    domain: string,
    protocol: 'http' | 'https',
    url: string, // protocol + domain
    localIP?: string
} & ({
    name: 'local'
} | {
    name: 'server',
    ssh: {
        login: string,
        host: string,
        port: number
    }
})

type AppIdentityConfig = {

    name: string,
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
        description: string,
        version: string
    }                                 
}

/*----------------------------------
- LOADE
----------------------------------*/
export default ( appDir: string, envName?: Core.Config.EnvName ): { 
    env: TEnvConfig, 
    identity: Core.Config.Identity,
    config: Core.Config.Services,
} => {

    const envFile = appDir + '/env' + (envName === undefined ? '' : '.' + envName) + '.yaml';
    const env = loadYaml( envFile ) as TEnvConfig;

    const config = { 
        env, 
        identity: loadYaml( appDir + '/identity.yaml' ),
        //config: require('@/').default(envName)
    }

    console.log("Loaded config:", config);

    return config;
}

export const loadYaml = (filepath: string) => {
    console.info(`Loading config ${filepath}`);
    const rawConfig = fs.readFileSync(filepath, 'utf-8');
    return yaml.parse(rawConfig);
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