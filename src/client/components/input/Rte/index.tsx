
// INSPIRATION: 
// https://github.com/sstur/react-rte
// https://drupalgutenberg.org/demo

/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import {

    Editor, 
    EditorState,

    SelectionState,

    convertToRaw,
    KeyBindingUtil,
    RawDraftContentState,

    ContentBlock,
    EditorBlock
} from 'draft-js';

// Libs
import Champ from '../Base';
import { getSelection, getSelectionRect } from './selection';

/*----------------------------------
- TYPES
----------------------------------*/
type TValeur = EditorState
const valeurDefaut = '' as string;
type TValeurDefaut = EditorState;
type TValeurOut = string;

export type Props = {
    valeur: TValeur,
}

/*----------------------------------
- COMPOSANT
----------------------------------*/
import './index.less';
export default Champ<Props, TValeurDefaut, TValeurOut>('rte', {
    valeurDefaut, 
    saisieManuelle: true
}, ({
    // Spread TOUTES les props dont on a besoin pour éviter les problèmes de référence avec props
    placeholder, attrsChamp
}, { valeur, state, setState, commitCurrentValue }, rendre) => {

    /*----------------------------------
    - CONSTRUCTION CHAMP
    ----------------------------------*/

    const refEditeur = React.useRef<Editor>(null);
   
    // Init state
    if (!valeur)
        valeur = EditorState.createEmpty();

    /*const updateToolbar = (selection: SelectionState) => {

        if (selection.isCollapsed()) {
            return;
        }
        // eslint-disable-next-line no-undef
        const nativeSelection = getSelection(window);
        if (!nativeSelection.rangeCount) {
            return;
        }
        const selectionBoundary = getSelectionRect(nativeSelection);

        console.log('selectionBoundary', selectionBoundary);

        const toolbarNode = document.getElementById('toolbar');
        if (!toolbarNode) return;
        const toolbarBoundary = toolbarNode.getBoundingClientRect();

        // parent = conteneur éditeur draft
        const parent = document.getElementById('toolbar');
        if (!parent) return;
        const parentBoundary = parent.getBoundingClientRect();

        toolbarNode.style.top =
            `${(selectionBoundary.top - parentBoundary.top - toolbarBoundary.height - 5)}px`;
        toolbarNode.style.width = `${toolbarBoundary.width}px`;

        // The left side of the tooltip should be:
        // center of selection relative to parent - half width of toolbar
        const selectionCenter = (selectionBoundary.left + (selectionBoundary.width / 2)) - parentBoundary.left;
        let left = selectionCenter - (toolbarBoundary.width / 2);
        const screenLeft = parentBoundary.left + left;
        if (screenLeft < 0) {
            // If the toolbar would be off-screen
            // move it as far left as it can without going off-screen
            left = -parentBoundary.left;
        }
        toolbarNode.style.left = `${left}px`;
        

    }*/

    const onChange = (state: EditorState) => {

        /*const selection = state.getSelection();
        updateToolbar(selection);*/

        // Détection changement de contenu
        /*const currentContentState = valeur.getCurrentContent()
        const newContentState = state.getCurrentContent()
        if (currentContentState === newContentState)*/

        setState({ valeur: state });

    }

    /*----------------------------------
    - RENDU DU CHAMP
    ----------------------------------*/
    return rendre((
        <div className="champ typographie" onClick={() => refEditeur.current?.focus()}>
            <Editor
                ref={refEditeur}
                editorState={valeur}

                onChange={onChange}
                onBlur={() => commitCurrentValue()}

                placeholder={placeholder}
                textAlignment="left"
                textDirectionality="LTR"

            />

            {/* <div id="toolbar">coucou</div> */}
        </div>
    // Les propétés modifiées sont passées ici
    ), {  });
})
