/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Core
import { Introuvable } from '@common/errors';
import app from '@server/app';
import context from '@server/context';

/*----------------------------------
- TYPES
----------------------------------*/

import CronTask, { TRunner, TFrequence } from './CronTask';

export { default as CronTask } from './CronTask';

/*----------------------------------
- SERVICE CONFIG
----------------------------------*/

export type CronServiceConfig = {
   
}

declare global {
    namespace Core {
        namespace Config {
            interface Services {
                cron: CronServiceConfig
            }
        }
    }
}

/*----------------------------------
- CLASSE
----------------------------------*/

export class CronManager {

    public static taches: { [nom: string]: CronTask } = {}
    public static timer: NodeJS.Timeout;

    /*----------------------------------
    - HOOKS
    ----------------------------------*/
    public constructor() {
        app.on('cleanup', () => this.cleanup());
    }

    public async load() {
        clearInterval(CronManager.timer);
        CronManager.timer = setInterval(() => {

            for (const id in CronManager.taches)
                CronManager.taches[id].run();

        }, 10000);
    }

    public async cleanup() {
        clearInterval(CronManager.timer);
        CronManager.taches = {}
    }

    /*----------------------------------
    - STATIQUE
    ----------------------------------*/

    /**
     * Create a new Cron task
     * @param nom Unique ID / Label for this task (helpful for tracking & debugging)
     * @param frequence When to execute this task.
     *  - Date: The date at which to execute this task (one time execution)
     *  - string: Cron expression to define the interval for executing this task
     * @param run Function to run 
     * @param autoexec true to execute the task immediatly
     * @returns The CronTask that just have been created
     */
    public task(nom: string, frequence: TFrequence, run: TRunner, autoexec?: boolean) {
        return new Promise<CronTask>((resolve, reject) => {
            context.run({ channelType: 'cron', channelId: nom }, async () => {

                CronManager.taches[nom] = new CronTask(this, nom, frequence, run, autoexec);

                if (autoexec)
                    await CronManager.taches[nom].run(true);

                resolve( CronManager.taches[nom] );

            })
        });

    }

    public async exec(nom: string) {

        const tache = CronManager.taches[nom];

        if (tache === undefined)
            throw new Introuvable("Tâche introuvable: " + nom);

        await tache.run(true);

    }
    public get(): typeof CronManager.taches;
    public get(name: string): CronTask;
    public get(name?: string): CronTask | typeof CronManager.taches {

        if (name === undefined)
            return CronManager.taches;

        const cron = CronManager.taches[name];
        if (cron === undefined)
            throw new Error(`L'instance de la tâche cron ${name} n'a pas été trouvée`);
        return cron;
    }
}

/*----------------------------------
- REGISTER SERVICE
----------------------------------*/
app.register('cron', CronManager);
declare global {
    namespace Core {
        interface Services {
            cron: CronManager;
        }
    }
}