/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import { spawn, ChildProcess } from 'child_process';

// Cor elibs
import Keyboard from '../../src/server/utils/keyboard';

// Configs
import createCompilers, { compiling } from '../compiler';
import cli from '../';

/*----------------------------------
- COMMANDE
----------------------------------*/
export const run = () => new Promise<void>(async () => {

    const multiCompiler = await createCompilers('dev', {

        before: () => {

            console.log('before');
            stopApp();

        }, 
        after: () => {


        }
    });

    multiCompiler.watch({

        // https://webpack.js.org/configuration/watch/#watchoptions
        // Watching may not work with NFS and machines in VirtualBox
        // Uncomment next line if it is your case (use true or interval in milliseconds)
        poll: 1000,

        // Decrease CPU or memory usage in some file systems
        ignored: /node_modules\/(?!@dopamyn\/framework\/src\/)/,

        //aggregateTimeout: 1000,
    }, async (error, stats) => {

        if (error) {
            console.error(`Error in milticompiler.watch`, error, stats?.toString());
            return;
        }

        console.log("Watch callback. Reloading app ...");
        startApp();

    });

    Keyboard.input('ctrl+r', async () => {

        console.log(`Waiting for compilers to be ready ...`, Object.keys(compiling));
        await Promise.all(Object.values(compiling));

        console.log(`Reloading app ...`);
        startApp();

    });

    Keyboard.input('ctrl+c', () => {
        stopApp();
    });
});


/*----------------------------------
- APP RUN
----------------------------------*/
let cp: ChildProcess | undefined = undefined;

async function startApp() {

    stopApp();

    console.info(`Launching new server ...`);
    cp = spawn('node', ['' + cli.paths.app.bin + '/server.js', '--preserve-symlinks'], {

        // sdin, sdout, sderr
        stdio: ['inherit', 'inherit', 'inherit']

    });
}

function stopApp() {
    if (cp !== undefined) {
        console.info(`Killing current server instance (ID: ${cp.pid}) ...`);
        cp.kill();
    }

}