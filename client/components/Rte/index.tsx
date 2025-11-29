/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

// Core libs
import { useInput, InputBaseProps, InputWrapper } from '../utils';
import type { TToolbarDisplay } from './ToolbarPlugin';

// Special componets
import type TEditor from './Editor';

/*----------------------------------
- TYPES
----------------------------------*/

export type Props = {
    preview?: boolean,
    title: string,
    toolbar?: TToolbarDisplay,
    decorateText?: boolean
} 

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default (props: Props & InputBaseProps<string>) => {

    let { className = '' } = props;

    /*----------------------------------
    - INIT
    ----------------------------------*/

    const [Editor, setEditor] = React.useState<{ default: typeof TEditor }>(null);

    const [{ value }, setValue] = useInput(props, undefined, true);

    className += ' input rte';

    /*----------------------------------
    - ACTIONS
    ----------------------------------*/

    React.useEffect(() => {
        if (!Editor) {

            // Load editor component if not alreayd done
            // We lazy load since it's heavy and needs to be loade donly on client side
            import('./Editor').then(setEditor);
        }
    }, []);

    /*----------------------------------
    - RENDER
    ----------------------------------*/
    return (
        <InputWrapper {...props}>
            <div class={className}>

                {Editor === null ? (

                    <div class="col al-center h-2">
                        <i src="spin" />
                    </div>

                ) : (
                    <Editor.default value={value} setValue={setValue} props={props} />
                )}
            </div>
        </InputWrapper>
    )
}
