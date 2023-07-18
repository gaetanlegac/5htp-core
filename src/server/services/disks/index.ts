/*----------------------------------
- DEPS
----------------------------------*/

// Core
import type { Application } from '@server/app';
import Service, { AnyService } from '@server/app/service';
import type { TRegisteredServicesIndex } from '@server/app/service/container';

// Specific
import type Driver from './driver';
export type { default as Driver } from './driver';

/*----------------------------------
- TYPES
----------------------------------*/

type Config = {
    debug: boolean,
    default: string,//keyof MountpointList,
}

export type Hooks = {

}

export type Services = {

}

/*----------------------------------
- SERVICE
----------------------------------*/
export default class DisksManager<
    MountpointList extends Services = {},
    TConfig extends Config = Config,
    TApplication extends Application = Application
> extends Service<TConfig, Hooks, TApplication, MountpointList> {

    public default!: Driver;

    public mounted: MountpointList = this.services;

    public constructor( 
        parent: AnyService, 
        config: TConfig,
        drivers: MountpointList,
        app: TApplication, 
    ) {

        super(parent, config, drivers, app);

        if (Object.keys( drivers ).length === 0)
            throw new Error("At least one disk driver should be mounted.");

    }

    /*----------------------------------
    - LIFECYCLE
    ----------------------------------*/

    public async start() {

        const defaultDisk = this.mounted[ this.config.default ];
        if (defaultDisk === undefined)
            console.log(`Default disk "${this.config.default as string}" not mounted.`);

        this.default = defaultDisk;
        
    }

    public async ready() {

    }

    public async shutdown() {

    }

    /*----------------------------------
    - LIFECYCLE
    ----------------------------------*/

    public get( diskName?: 'default' | keyof MountpointList ): Driver {

        const disk = diskName == 'default' || diskName === undefined
            ? this.default 
            : this.mounted[diskName];

        if (disk === undefined)
            throw new Error(`Disk "${diskName as string}" not found.`);

        return disk;
    }

}