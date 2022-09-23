/*----------------------------------
- DEPENDANCES
----------------------------------*/
import Champ from './Base';
import React from 'react';

// Npm
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';

import 'prismjs/themes/prism.css';

/*----------------------------------
- TYPES
----------------------------------*/
type TValeur = string;
const valeurDefaut = '' as string;
type TValeurDefaut = typeof valeurDefaut;
type TValeurOut = string;

export type Props = {
    valeur: TValeur,
    language: string
}

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default Champ<Props, TValeurDefaut, TValeurOut>('code', { valeurDefaut, saisieManuelle: true }, ({
    language
}, { valeur, state, setState }, rendre) => {

    return rendre((
        <Editor
            value={valeur || ''}
            onValueChange={code => setState({ valeur: code })}
            highlight={code => highlight(code, languages[ language ])}
            padding={0}
            tabSize={4}
            style={{
                fontFamily: '"Fira code", "Fira Mono", monospace',
                fontSize: 12,
            }}

            textareaClassName="code"
        />
    ), {  });
})
