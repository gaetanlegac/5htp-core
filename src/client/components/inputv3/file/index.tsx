/*----------------------------------
- DEPENDANCES
----------------------------------*/
// Npm
import React from 'react';
import { ComponentChild } from 'preact';

// Composants généraux
import Button, { Props as BtnProps } from '@client/components/button';

// Core libs
import { InputWrapper } from '../base';
import useContext from '@/client/context';

// specific
import FileToUpload from './FileToUpload';

// Ressources
import './index.less';

/*----------------------------------
- OUTILS
----------------------------------*/
export { default as FileToUpload } from './FileToUpload';

export const createImagePreview = (file: Blob) => new Promise((resolve, reject) => {

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

    reader.readAsDataURL(file);
});

// Instanciate FileToUpload from browser side File
const normalizeFile = (file: File) => new FileToUpload({
    name: file.name,
    type: file.type,
    size: file.size,
    data: file,
    //original: file
})

/*----------------------------------
- TYPES
----------------------------------*/

export type Props = {

    // Input
    title: string,
    value?: string | FileToUpload, // string = already registered 

    // Display
    emptyText?: ComponentChild,
    className?: string,
    previewUrl?: string,
    button?: boolean | BtnProps,

    // Actions
    onChange: (file: FileToUpload | undefined) => void
    remove?: () => Promise<void>,
}

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default (props: Props) => {

    /*----------------------------------
    - INITIALIZE
    ----------------------------------*/

    let {
        // Input
        value: file,
        className: customClassName,

        // Display
        emptyText = 'Click here to select a File',
        previewUrl: previewUrlInit,
        button,

        // Actions
        onChange
    } = props;

    const [previewUrl, setPreviewUrl] = React.useState<string | undefined>(previewUrlInit);

    let className = 'input upload';

    if (!button)
        className += ' box';

    if (customClassName !== undefined)
        className += ' ' + customClassName;

    /*----------------------------------
    - ACTIONS
    ----------------------------------*/

    const selectFile = (fileSelectEvent: any) => {
        const selectedfile = fileSelectEvent.target.files[0] as File;
        if (selectedfile) {

            const fileToUpload = normalizeFile(selectedfile);

            onChange(fileToUpload);
        }
    }

    React.useEffect(() => {

        // Image = decode & display preview
        if (file !== undefined && typeof file === 'object' && file.type.startsWith('image/'))
            createImagePreview(file.data).then(setPreviewUrl);
        else 
            setPreviewUrl(undefined);

    }, [file]);

    /*----------------------------------
    - RENDER
    ----------------------------------*/
    return (
        <InputWrapper {...props}>

            <div class={className}>

                {button ? <> 

                    <Button type="secondary" 
                        {...button === true ? {} : button}
                    >
                        {emptyText}
                    </Button>
                
                </> : <>

                    {file && <>
                        <div class="preview">

                            {previewUrl ? (
                                <img src={previewUrl} />
                            ) : typeof file === 'string' ? <>
                                <strong>A file has been selected</strong>
                            </> : file ? <>
                                <strong>{file.name}</strong>
                            </> : null}
                        </div>

                        <div class="row actions sp-05">

                            {typeof file === 'string' && <>
                                <Button type="secondary" icon="eye" shape="pill" size="s" link={file} />
                            </>}
                            
                            <Button class='bg error' icon="trash" shape="pill" size="s"  
                                async onClick={() => onChange(undefined)} />
                        </div>
                    </>}

                    <div class="indication col al-center">
                        {typeof file === 'string' ? <>
                            <strong>A file has been selected</strong>
                        </> : file ? <>
                            <strong>{file.name}</strong>
                        </> : emptyText}
                    </div>
                
                </>}

                <input type="file" onChange={selectFile} />
            </div>
        </InputWrapper>
    )
}