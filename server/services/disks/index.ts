/*----------------------------------
- DEPS
----------------------------------*/

// Core
import type { Application } from '@server/app';
import Service, { AnyService } from '@server/app/service';

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
    [diskId: string]: Driver
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

    /*----------------------------------
    - LIFECYCLE
    ----------------------------------*/

    public async ready() {

        const drivers = this.services;
        
        if (Object.keys( drivers ).length === 0)
            throw new Error("At least one disk driver should be mounted.");

        console.log('start disks service', Object.keys( drivers ), Object.keys( this.mounted ), Object.keys( this.services ));

        const defaultDisk = drivers[ this.config.default ];
        if (defaultDisk === undefined)
            console.log(`Default disk "${this.config.default as string}" not mounted.`);

        this.default = defaultDisk;

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