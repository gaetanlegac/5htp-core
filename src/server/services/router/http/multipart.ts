/*----------------------------------
- DEPENDANCES
----------------------------------*/

import NormalizedFile from '@common/data/file';

/*----------------------------------
- TYPES
----------------------------------*/

import type { Request, Response, NextFunction } from 'express';
import type { FileArray, UploadedFile } from 'express-fileupload';

export const traiterMultipart = (...canaux: any[]) => {

    let sortie: {[nom: string]: any} = {};

    for (const donnees of canaux) {

        if (!donnees)
            continue;

        for (const chemin in donnees) {
            let donnee = donnees[chemin];

            let brancheA = sortie;
            const resultats = [...chemin.matchAll(/[^\[\]]+/g)];
            for (let iCle = 0; iCle < resultats.length; iCle++) {

                const [cle] = resultats[ iCle ];

                // Si ce n'est pas le dernier
                if (iCle !== resultats.length - 1) {

                    if (brancheA[ cle ] === undefined) {
                        const tableau = !isNaN( resultats[ iCle + 1 ][0] as any )
                        brancheA[ cle ] = tableau ? [] : {};
                    }

                    brancheA = brancheA[ cle ];

                // Donnée atteinte
                } else {

                    // Fichier
                    if (typeof donnee === 'object' && donnee.data !== undefined && donnee.data instanceof Buffer){
                        donnee = normaliserFichier(donnee);
                    }
                    
                    brancheA[ cle ] = donnee;
                        

                }

            }
        }
    }

    return sortie;
}

const reMultipart = /^multipart\/(?:form-data|related)(?:;|$)/i;
export const requeteMultipart = (req: Request) => reMultipart.exec( req.headers['content-type'] );

const normaliserFichier = (file: UploadedFile) => new NormalizedFile({
    name: file.name,
    type: file.mimetype,
    size: file.size,
    data: file.data,
})

export const MiddlewareFormData = (req: Request, res: Response, next: NextFunction) => {

    // Verif si multipart
    if (!requeteMultipart( req ))
        return next();
        
    // Données body + fichiers
    // NOTE: Les données devant obligatoirement passer par le validateur de schema, 
    //  On peut mélanger le body et les files sans risque de sécurité
    req.body = traiterMultipart(req.body, req.files);
    //req.files = traiterMultipart(req.files);

    next();
}
