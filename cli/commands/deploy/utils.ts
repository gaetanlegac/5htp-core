/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import fs from 'fs-extra';
import path from 'path';

// Core
import { loadYaml } from "../../../src/server/app/config";
import cli from '../..';

// Load configs
const localEnv = loadYaml(cli.paths.app.root + '/env.yaml');
const serverEnv = loadYaml(cli.paths.app.root + '/env.server.yaml');
const sshString = serverEnv.ssh.login + '@' + serverEnv.ssh.host;


/*----------------------------------
- TYPES
----------------------------------*/


/*----------------------------------
- UTILS
----------------------------------*/

export const ssh = (commands: string, simulate: boolean) => {

    commands = commands.trim();

    if (!commands.endsWith(';'))
        commands += ';';

    return simulate
        ? `cd "${testsRoot}"; ${commands}`
        : `ssh -t ` + sshString + ` -p ` + serverEnv.ssh.port + ` <<EOT
cd "${serverEnv.root}";
${commands}
EOT`;
}

export const api = (method: string, path: string, data: object, local: boolean = false) =>
    `curl -X ${method} ${local ? 'http://localhost:3010' : 'https://dopamyn.io'}${path} ` +
    `-H 'Content-Type: application/json' -H 'Accept: application/json' ` +
    `-d '${JSON.stringify(data)}';`;