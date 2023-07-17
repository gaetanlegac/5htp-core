/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import sharp from 'sharp';
import fs from 'fs-extra';

// Node
import request from 'request';

// Core: general
import type { Application } from '@server/app';
import Service, { AnyService } from '@server/app/service';
import type DisksManager from '../disks';
import type FsDriver from '../disks/driver';

/*----------------------------------
- SERVICE TYPES
----------------------------------*/

export type Config = {
    debug?: boolean,
    disk?: string
}

export type Hooks = {

}

export type Services = {
    disks: DisksManager
}

/*----------------------------------
- TYPES
----------------------------------*/

export type TImageConfig = {
    width: number,
    height: number,
    fit: keyof sharp.FitEnum,
    quality: number
}

/*----------------------------------
- CONST
----------------------------------*/

const LogPrefix = `[services][fetch]`

/*----------------------------------
- SERVICE
-  Tools that helps to consume external resources (including apis, ..)
-----------------------------------*/
export default class FetchService extends Service<Config, Hooks, Application, Services> {

    private disk?: FsDriver;

    public constructor(
        parent: AnyService, 
        config: Config,
        services: Services,
        app: Application
    ) {

        super(parent, config, services, app);

        if (this.services.disks)
            this.disk = this.services.disks.get( config.disk );
        
    }

    /*----------------------------------
    - LIFECYCLE
    ----------------------------------*/

    public async start() {

        
        
        
    }

    public async ready() {

    }

    public async shutdown() {

    }

    /*----------------------------------
    - ACTIONS
    ----------------------------------*/

    public toBuffer( uri: string ): Promise<Buffer> {
        return new Promise<Buffer>((resolve, reject) => {
            request(uri, { encoding: null }, (err, res, body) => {

                if (err)
                    return reject(err);

                if (!body)
                    return reject(`Body is empty for ${uri}.`);

                resolve(body);
            })
        })
    }

    public async image( 
        imageFileUrl: string, 
        { width, height, fit, quality }: TImageConfig, 
        saveToBucket: string,
        saveToPath?: string,
        disk?: FsDriver
    ): Promise<Buffer | null> {

        // Define target disk
        if (this.disk === undefined)
            throw new Error(`Please provide a Disks service in order to download files.`);

        // Download
        let imageBuffer: Buffer;
        try {
            imageBuffer = await this.toBuffer( imageFileUrl );
        } catch (error) {
            console.error(LogPrefix, `Error while fetching image at ${imageFileUrl}:`, error);
            return null;
        }

        // Resize
        const processing = sharp( imageBuffer )
            // Max dimensions (save space)
            .resize(width, height, { fit }) 

        // Convert to webp and finalize
        const processedBuffer = await processing.webp({ quality }).toBuffer().catch(e => {
            console.error(LogPrefix, `Error while processing image at ${imageFileUrl}:`, e);
            return null;
        })

        // Save file
        if (saveToPath !== undefined && processedBuffer !== null) {
            console.log(LogPrefix, `Saving ${imageFileUrl} logo to ${saveToPath}`);
            await this.disk.outputFile(saveToBucket, saveToPath, processedBuffer);
        }

        // We return the original, because Vibrant.js doesn't support webp
        return imageBuffer;
    }

}