/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Specific
import Application from ".";
import type { Command } from "./commands"; 

/*----------------------------------
- TYPES: OPTIONS
----------------------------------*/

export type AnyService = Service<{}, {}, Application>

type THookCallback<THookArgs extends THookOptions> = (...args: THookArgs["args"]) => Promise<void>;

type THooksList = {
    [hookName: string]: THookOptions
}

type THookOptions = {
    args: any[]
}

export type TPriority = -2 | -1 | 0 | 1 | 2

/*----------------------------------
- CONFIG
----------------------------------*/

const LogPrefix = '[service]';

/*----------------------------------
- CLASS
----------------------------------*/
export default abstract class Service<
    TConfig extends {}, 
    THooks extends THooksList,
    TApplication extends Application
> {

    public priority: TPriority = 0;
    public started?: Promise<void>;

    public commands?: Command[];

    public constructor( 
        public app: TApplication, 
        public config: TConfig,
    ) {

        if (!( this instanceof Application ))
            // Make the app aware of his services
            app.registerService(this);
        
    }

    public abstract register?(): Promise<void>;

    public abstract start?(): Promise<void>;

    /*----------------------------------
    - HOOKS
    ----------------------------------*/
    public hooks: {[name in keyof THooks]?: THookCallback< THooks[name] >[]} = {}

    public on<THookName extends keyof THooksList>( 
        name: THookName, 
        callback: THookCallback<THooksList[THookName]> 
    ) {

        const callbacks = this.hooks[ name ];
        if (callbacks)
            callbacks.push( callback );
        else
            this.hooks[ name ] = [callback]

        return this;
    }

    public runHook<THookName extends keyof THooksList>( 
        name: THookName, 
        ...args: THooksList[THookName]["args"]
    ) {

        const callbacks = this.hooks[name];
        if (!callbacks)
            return console.info(LogPrefix, `No ${name} hook defined in the current service instance.`);

        console.info(`[hook] Run all ${name} hook (${callbacks.length}).`);
        return Promise.all( 
            callbacks.map(
                cb => cb(...args).catch(e => {
                    console.error(`[hook] Error while executing hook ${name}:`, e);
                    if (name !== 'error')
                        this.runHook('error', e);
                })
            ) 
        ).then(() => {
            console.info(`[hook] Hooks ${name} executed with success.`);
        })
    }

}