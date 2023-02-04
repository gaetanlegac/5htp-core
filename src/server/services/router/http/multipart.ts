/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import mime from 'mime-types';

// Core
import FileToUpload from '@client/components/inputv3/file/FileToUpload';
import { InputError } from '@common/errors';

/*----------------------------------
- TYPES
----------------------------------*/

import type { Request, Response, NextFunction } from 'express';
import type { FileArray, UploadedFile } from 'express-fileupload';

/*----------------------------------
- CONFIG
----------------------------------*/
const reMultipart = /^multipart\/(?:form-data|related)(?:;|$)/i;

/*----------------------------------
- MIDDLEWARE
----------------------------------*/
export const MiddlewareFormData = (req: Request, res: Response, next: NextFunction) => {

    // Verif si multipart
    if (!isMutipart( req ))
        return next();
        
    // Données body + fichiers
    // NOTE: Les données devant obligatoirement passer par le validateur de schema, 
    //  On peut mélanger le body et les files sans risque de sécurité
    req.body = traiterMultipart(req.body, req['files']);
    //req.files = traiterMultipart(req.files);

    next();
}

/*----------------------------------
- FUNCTIONS
----------------------------------*/
export const isMutipart = (req: Request) => req.headers['content-type'] && reMultipart.exec( req.headers['content-type'] );

export const traiterMultipart = (...canaux: any[]) => {

    let sortie: {[nom: string]: any} = {};

    for (const donnees of canaux) {

        if (!donnees)
            continue;

        for (const fieldPath in donnees) {
            let donnee = donnees[fieldPath];

            let brancheA = sortie;
            const results = [...fieldPath.matchAll(/[^\[\]]+/g)];
            for (let iCle = 0; iCle < results.length; iCle++) {

                const [cle] = results[ iCle ];

                // Need to go deeper to find data
                if (iCle !== results.length - 1) {

                    if (brancheA[ cle ] === undefined) {
                        const tableau = !isNaN( results[ iCle + 1 ][0] as any )
                        brancheA[ cle ] = tableau ? [] : {};
                    }

                    brancheA = brancheA[ cle ];
                    continue;
                }

                // Data reached
                if (
                    typeof donnee === 'object' 
                    && 
                    donnee.data !== undefined 
                    && 
                    donnee.data instanceof Buffer
                ){
                    donnee = normalizeFile(donnee);
                }
                
                brancheA[ cle ] = donnee;
            }
        }
    }

    return sortie;
}

const normalizeFile = (file: UploadedFile) => {

    const ext = mime.extension(file.mimetype);

    if (ext === false)
        throw new InputError(`We couldn't determine the type of the CV file you sent. Please encure it's not corrupted and try again.`);

    return new FileToUpload({

        name: file.name,
        type: file.mimetype,
        size: file.size,
    
        data: file.data,
    
        md5: file.md5,
        ext: ext
    })
}