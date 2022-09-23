#!/usr/bin/env -S ts-node

const [, , commandName, ...argv] = process.argv;

const globalOptions = {
    workdir: process.cwd()
}

const commands: {[name: string]: {
    [option: string]: string | boolean | undefined | string[]
}} = {
    "dev": {
        cache: false
    },
    "release": {
        cache: false,
        deploy: false
    },
    "deploy-web": {
        simulate: false,
    },
    "deploy-app": {
        project: "",
        local: false,
    },
}

let options = commands[commandName]
if (options === undefined)
    throw new Error(`Command ${commandName} does not exists.`);
options = { ...globalOptions, ...options };

let opt: string | null = null;
for (const a of argv) {

    if (a[0] === '-') {

        opt = a.substring(1);
        if (!(opt in options)) 
            throw new Error(`Unknown option: ${opt}`);

        // Init with default value
        if (typeof options[opt] === "boolean")
            options[opt] = true;

    } else if (opt !== null) {

        const curVal = options[opt];

        if (Array.isArray( curVal ))
            curVal.push(a);
        else
            options[opt] = a;

        opt = null;

    } else {

        //args.push(a);

    }
}

import CLI from './cli';
export { default as CLI } from './cli';

const cli = new CLI(options.workdir);
cli.runCommand(commandName, options);

export default cli;