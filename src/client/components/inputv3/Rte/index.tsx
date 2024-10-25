/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

import { EditorState, $getRoot } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';

// Core libs
import { useInput, InputBaseProps, InputWrapper } from '../base';
import editorNodes from '@common/data/rte/nodes';

// Special componets
import ExampleTheme from './ExampleTheme';
import ToolbarPlugin from './ToolbarPlugin';
import './style.less';

const EMPTY_STATE = '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';

/*----------------------------------
- TYPES
----------------------------------*/

export type Props = {
    onPressEnter?: (value: string) => void,
} 

const ValueControlPlugin = ({ props, value }) => {

    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        if (props.value && props.value !== value) {

            const initialEditorState = editor.parseEditorState(props.value)
            editor.setEditorState(initialEditorState);
        }
    }, [props.value]);

    return null;
}

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default (props: Props & InputBaseProps<{}>) => {

    let {
        // Decoration
        required, size, title, className = '',
        // State
        inputRef, errors,
        // Actions
        onPressEnter
    } = props;

    /*----------------------------------
    - INIT
    ----------------------------------*/

    const [{ value }, setValue] = useInput(props, EMPTY_STATE, true);

    // Trigger onchange oly when finished typing
    const refCommit = React.useRef<NodeJS.Timeout | null>(null);

    className += ' input rte';

    /*----------------------------------
    - ACTIONS
    ----------------------------------*/

    const onChange = (editorState: EditorState) => {
        editorState.read(() => {

            const stateJson = editorState.toJSON();

            if (refCommit.current !== null)
                clearTimeout(refCommit.current);
    
            refCommit.current = setTimeout(() => {
                setValue(stateJson);
            }, 100);
        });
    };

    /*----------------------------------
    - RENDER
    ----------------------------------*/
    return (
        <InputWrapper {...props}>
            <div class={className}>

                {typeof window !== 'undefined' && (
                    <LexicalComposer initialConfig={{
                        namespace: 'React.js Demo',
                        editorState: value || EMPTY_STATE,
                        nodes: editorNodes,
                        // Handling of errors during update
                        onError(error: Error) { throw error; },
                        // The editor theme
                        theme: ExampleTheme,
                    }}>
                        <div className="editor-container">
                            <ToolbarPlugin />
                            <div className="editor-inner">
                                <RichTextPlugin
                                    contentEditable={
                                        <ContentEditable
                                            className="editor-input"
                                            aria-placeholder={title}
                                            placeholder={
                                                <div className="editor-placeholder">{title}</div>
                                            }
                                        />
                                    }
                                    ErrorBoundary={LexicalErrorBoundary}
                                />
                                <HistoryPlugin />
                                <AutoFocusPlugin />
                                <OnChangePlugin onChange={onChange} />
                                <ValueControlPlugin props={props} value={value} />
                            </div>
                        </div>
                    </LexicalComposer>   
                )}

                {/* <Tag {...fieldProps}

                    placeholder={props.title}

                    // @ts-ignore: Property 'ref' does not exist on type 'IntrinsicAttributes'
                    ref={refInput}
                    value={value}
                    onFocus={() => setState({ focus: true })}
                    onBlur={() => setState({ focus: false })}
                    onChange={(e) => updateValue(e.target.value)}
                    onKeyDown={(e: KeyboardEvent) => {

                        if (onPressEnter && e.key === 'Enter' && value !== undefined) {
                            commitValue();
                            onPressEnter(value)
                        }
                    }}
                /> */}

                {errors?.length && (
                    <div class="bubble bg error bottom">
                        {errors.join('. ')}
                    </div>
                )}
            </div>
        </InputWrapper>
    )
}
