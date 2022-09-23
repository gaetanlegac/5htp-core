/*----------------------------------
- DEPENDANCES
----------------------------------*/
// Npm
import React from 'react';
import { ComponentChild } from 'preact';

// Composants généraux
import Bouton from '@client/components/button';

// Libs
import useContext, { useState } from '@client/context';
import NormalisedFile from '@common/data/file';

// Ressources
import './index.less';

/*----------------------------------
- OUTILS
----------------------------------*/
export const getBase64 = (fichier: Blob) => new Promise((resolve, reject) => {

    // Conversion de l'image en base24 pour l'afficher
    const reader = new FileReader();
    let imageBase64: string | null = null;
    reader.addEventListener('load', () => {

        var enc = new TextDecoder("utf-8");

        // reader.result pout être une chaine ou un arraybuffer
        imageBase64 = reader.result instanceof ArrayBuffer
            ? enc.decode(reader.result) // ArrayBuffer => Chaine
            : reader.result;

        // Affichage
        resolve(imageBase64);
    });

    reader.readAsDataURL(fichier);
});

const normalizeFile = (file: File) => new NormalisedFile({
    name: file.name,
    type: file.type,
    size: file.size,
    data: undefined,
    original: file
})

/*----------------------------------
- COMPOSANT
----------------------------------*/
/*export default Champ<Props, TValeurDefaut, TValeurOut>('image', { valeurDefaut, saisieManuelle: false }, ({
    nom,
    className,
    render,
    api,
    indication,
    format = 'contain',
    opt,
    remove
},{ value, state, setState } , rendre) => {*/

export default ({
    value: initialValue, render, indication, uploadUrl, className, format = 'contain', remove,
    onSelect
}: {

    value?: string,
    render?: (urlImg: string) => ComponentChild,
    indication?: ComponentChild,
    uploadUrl?: string, // Si spécifié, l'envoi se fera juste après la sélection d'un fichier
    className?: string,
    format?: 'contain' | 'cover',
    remove?: () => Promise<void>,

    onSelect?: (imageUrl: string) => void
}) => {

    /*----------------------------------
    - STATE
    ----------------------------------*/
    
    const { api } = useContext();

    const [{ urlApercu, progress, value }, setState] = useState({
        value: initialValue,
        urlApercu: undefined as string | undefined, 
        progress: false as false | number
    });

    className = 'uploadImg ' + format + (className === undefined ? '' : ' ' + className)

    if (!render) {
        className += ' miniature';
        render = (urlImg: string) => (
            <img src={urlImg} />
        )
    }

    if (progress !== false)
        className += ' enCours';

    if (urlApercu !== undefined)
        className += ' imageChoisie';

    /*----------------------------------
    - ACTIONS
    ----------------------------------*/

    const envoyer = (fichier: File) => {

        if (!uploadUrl) return;

        const data = new FormData();
        data.append('image', fichier);

        return api.post( uploadUrl, data, {
            onProgress: (progress: number) => setState({ progress })
        }).then(( url ) => {

            if (onSelect !== undefined)
                onSelect(url);
            else
                setState({ 
                    progress: false,  
                    // Rechargement url image intiale, sans cache
                    urlApercu: url + '?' + (new Date().getTime())
                });

        }).catch(e => {

            setState({
                progress: false,
                urlApercu: undefined,
            });
            throw e;

        })
    }

    /*----------------------------------
    - RENDER
    ----------------------------------*/
    return (
        <div class={className}>

            {urlApercu !== undefined && render( urlApercu )}

            <div class="indicateur row">
                {progress === false ? <>

                    {indication ? (

                        <span>{indication}</span>

                    ) : <>

                        <span>Click here to select a File</span>
                    
                        {(value !== undefined && remove !== undefined) && (
                            <Bouton icon="trash" async onClick={() => remove().then(() => {
                                setState({ 
                                    value: undefined,
                                    progress: false,  
                                    urlApercu: undefined
                                });
                            })} />
                        )}
                    
                    </>}

                    <input type="file" onChange={(c: any) => {

                        const fichier = c.target.files[0] as File;
                        if (fichier) {

                            // Indicateur chargement le temps de convertir l'image en base64
                            setState({ progress: 0 })

                            // Récup apercu via fichier sélectionné
                            getBase64(fichier).then((urlApercu: string) => {

                                // Injection de l'url d'apercu dans le fichier pour pouvoir y accéder en dehors du composant
                                //fichier.urlApercu = urlApercu;

                                // Affichage apercu et réinit progressbar
                                setState({ 
                                    value: normalizeFile(fichier),  
                                    urlApercu,
                                    progress: uploadUrl ? 0 : false
                                });

                                // Envoi direct sur endpoint api
                                if (uploadUrl)
                                    envoyer(fichier);

                            });

                        }
                    }} />
                </> : (
                    <div class="col al-center">
                        <i src="spin" />

                        <span>
                            {progress === 0 ? (
                                "Preparing ..."
                            ) : progress !== 100 ? (
                                "Uploading your image ... " + progress + "%"
                            ) : (
                                "Processing your image ..."
                            )}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}