/*----------------------------------
- DEPS
----------------------------------*/

// Core
import Application, { Service } from '@server/app';

// Specific
import type Driver from './driver';

/*----------------------------------
- TYPES
----------------------------------*/

type TMountpointList = { [name: string]: Driver }

type Config<MountpointList extends TMountpointList> = {
    default: keyof MountpointList,
}

export type Hooks = {

}

/*----------------------------------
- SERVICE
----------------------------------*/
export default class DisksManager<
    MountpointList extends TMountpointList = {},
    TConfig extends Config<MountpointList> = Config<MountpointList>,
    TApplication extends Application = Application
> extends Service<TConfig, Hooks, TApplication> {

    public default: Driver;

    public constructor( 
        public app: TApplication, 
        public config: TConfig,
        public mounted:  MountpointList
    ) {

        super(app, config);

        if (Object.keys( mounted ).length === 0)
            throw new Error("At least one disk should be mounted.");

        const defaultDisk = mounted[ config.default ];
        if (defaultDisk === undefined)
            console.log(`Default disk "${config.default as string}" not mounted.`);

        this.default = defaultDisk;

    }

    public async register() {

    }

    public async start() {

    }

}