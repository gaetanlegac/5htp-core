/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { ComponentChild, JSX } from 'preact';
import TextareaAutosize from 'react-textarea-autosize';

// Core libs
import { useInput, InputBaseProps } from '../base';

/*----------------------------------
- TYPES
----------------------------------*/
export type Props = {

    // Decoration
    icon?: string,
    prefix?: React.VNode,
    suffix?: React.VNode,
    iconR?: string,

    // Behavior
    type?: 'email' | 'password' | 'longtext',
    choice?: string[] | ((input: string) => Promise<string[]>),
    multiple?: boolean,

    // Actions
    onPressEnter?: (value: string) => void,
    inputRef?: React.Ref<HTMLInputElement>
}

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default ({ 
    // Behavoir
    type, 
    icon, prefix, suffix, iconR,
    onPressEnter,
    inputRef,
    ...props 
}: Props & InputBaseProps<string> & Omit<JSX.HTMLAttributes<HTMLInputElement>, 'onChange'>) => {

    /*----------------------------------
    - INIT
    ----------------------------------*/

    const [{ value, focus, fieldProps }, setValue, commitValue, setState] = useInput(props, '');

    // Trigger onchange oly when finished typing
    const refCommit = React.useRef<NodeJS.Timeout | null>(null);
    React.useEffect(() => {

        if (refCommit.current !== null)
            clearTimeout(refCommit.current);

        refCommit.current = setTimeout(commitValue, 500);
        
    }, [value]);

    const refInput = inputRef || React.useRef<HTMLInputElement>();
    
    /*----------------------------------
    - ATTRIBUTES
    ----------------------------------*/

    let className: string = 'input text';

    // Auto prefix
    if (prefix === undefined && icon !== undefined)
        prefix = <i src={icon} />

    // Type
    let Tag = 'input';
    if (type === 'password') {

        prefix = prefix || <i src="key" />;
        fieldProps.type = 'password';

    } else if (type === 'email') {

        prefix = prefix || <i src="at" />;
        fieldProps.type = 'email';

    } else if (type === 'longtext') {

        prefix = prefix || <i src="text" />;
        Tag = TextareaAutosize;

    }

    // Auto suffix
    if (suffix === undefined && iconR !== undefined)
        suffix = <i src={iconR} />

    // When no value, show the lable as a placeholder
    if (value === '')
        className += ' empty';
    if (focus)
        className += ' focus';

    if (props.className !== undefined)
        className += ' ' + props.className;

    /*----------------------------------
    - RENDER
    ----------------------------------*/
    return (
        <div class={className} onClick={() => refInput.current?.focus()}>

            {prefix}

            <div class="contValue">

                <Tag {...fieldProps}
                    // @ts-ignore: Property 'ref' does not exist on type 'IntrinsicAttributes'
                    ref={refInput}
                    value={value}

                    onFocus={() => setState({ focus: true })}
                    onBlur={() => setState({ focus: false })}
                    onChange={(e) => setValue(e.target.value)}

                    onKeyDown={(e) => {
                        if (onPressEnter && e.key === 'Enter' && value !== undefined) {
                            commitValue();
                            onPressEnter(value)
                        }
                    }}
                />

                <label>{props.title}</label>
            </div>

            {suffix}
            
        </div>
    )
}