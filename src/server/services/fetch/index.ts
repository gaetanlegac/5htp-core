/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import sharp from 'sharp';
import fs from 'fs-extra';

// Node
import request from 'request';

// Core: general
import type Application from '@server/app';
import Service from '@server/app/service';

/*----------------------------------
- SERVICE TYPES
----------------------------------*/

export type Config = {

}

export type Hooks = {

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
export default class FetchService extends Service<Config, Hooks, Application> {

    public async register() {
        
    }

    public async start() {
        
    }

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
        saveToPath?: string
    ): Promise<Buffer | null> {

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
            console.error(LogPrefix, `Error while processing image at ${imageBuffer}:`, e);
            return null;
        })

        // Save file
        if (saveToPath !== undefined && processedBuffer !== null) {
            console.log(LogPrefix, `Saving ${imageBuffer} logo to ${saveToPath}`);
            fs.outputFileSync(saveToPath, processedBuffer);
        }

        // We return the original, because Vibrant.js doesn't support webp
        return imageBuffer;
    }

}