/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

// Lexical
import RichEditorUtils from './currentEditor';

// Core libs
import { useInput, InputBaseProps, InputWrapper } from '../base';

// Special componets
import type TEditor from './Editor';
import './style.less';

/*----------------------------------
- TYPES
----------------------------------*/

export type Props = {
    preview?: boolean,
} 

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default (props: Props & InputBaseProps<string>) => {

    let {
        // Decoration
        required, size, title, className = '',
        // State
        errors,
        // Actions
        preview = true
    } = props;

    /*----------------------------------
    - INIT
    ----------------------------------*/

    const [Editor, setEditor] = React.useState<{ default: typeof TEditor }>(null);
    const [isPreview, setIsPreview] = React.useState(preview);
    const [html, setHTML] = React.useState(null);
    const [{ value }, setValue] = useInput(props, undefined, true);

    className += ' input rte';

    /*----------------------------------
    - ACTIONS
    ----------------------------------*/

    React.useEffect(() => {
        if (isPreview) {
            renderPreview(value).then(setHTML);
        }
    }, [value, isPreview]);

    // When isPreview changes, close the active editor
    React.useEffect(() => {
        if (!isPreview) {

            // Close active editor
            if (RichEditorUtils.active && RichEditorUtils.active?.title !== title)
                RichEditorUtils.active.close();

            // Set active editor
            RichEditorUtils.active = {
                title,
                close: () => setIsPreview(true)
            }

            // Load editor component if not alreayd done
            // We lazy load since it's heavy and needs to be loade donly on client side
            if (!Editor) {
                import('./Editor').then(setEditor);
            }

        }
    }, [isPreview]);

    const renderPreview = async (value: {} | undefined) => {

        if (!value)
            return '';

        if (typeof document === 'undefined')
            throw new Error("HTML preview disabled in server side.");

        const html = await RichEditorUtils.jsonToHtml(value);

        return html;
    }

    /*----------------------------------
    - RENDER
    ----------------------------------*/
    return (
        <InputWrapper {...props}>
            <div class={className}>

                {isPreview ? (

                    html === null ? (
                        <div class="col al-center h-2">
                            <i src="spin" />
                        </div>
                    ) : (
                        <div class="preview reading h-1-4 scrollable col clickable" 
                            onClick={() => setIsPreview(false)}
                            dangerouslySetInnerHTML={{ __html: html }} />
                    )

                ) : Editor !== null && (
                    <Editor.default value={value} setValue={setValue} props={props} />
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
