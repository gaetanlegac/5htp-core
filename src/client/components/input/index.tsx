/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { ComponentChild, JSX } from 'preact';
import TextareaAutosize from 'react-textarea-autosize';

// Core libs
import { useInput, InputBaseProps } from './BaseV2';

/*----------------------------------
- TYPES
----------------------------------*/
export type Props = {

    type?: 'email' | 'password',
    multiline?: boolean, // true = textarea
    onPressEnter?: (value: string) => void,

    // Decoration
    icon?: string,
    prefix?: ComponentChild,
    suffix?: ComponentChild,
    iconR?: string,

    inputRef?: React.Ref<HTMLInputElement>
    
}

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default ({ 
    type, 
    icon, prefix, suffix, iconR,
    multiline, 
    onPressEnter,
    inputRef,
    ...props 
}: Props & InputBaseProps<string> & Omit<JSX.HTMLAttributes<HTMLInputElement>, 'onChange'>) => {

    /*----------------------------------
    - STATE
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
    - RENDER
    ----------------------------------*/

    // Auto prefix
    if (prefix === undefined) {
        if (icon !== undefined)
            prefix = <i src={icon} />
        else if (type === 'password')
            prefix = <i src="key" />;
        else if (type === 'email')
            prefix = <i src="at" />;
    }

    // Auto suffix
    if (suffix === undefined) {
        if (iconR !== undefined)
            suffix = <i src={iconR} />
    }

    let className: string = 'input text';

    // When no value, show the lable as a placeholder
    if (value === '')
        className += ' empty';
    if (focus)
        className += ' focus';

    if (props.className !== undefined)
        className += ' ' + props.className;

    const Tag = multiline ? TextareaAutosize : 'input';

    return (
        <div class={className} onClick={() => refInput.current?.focus()}>

            {prefix}

            <div class="contValue">

                <Tag {...fieldProps}
                    ref={refInput}
                    type={type}
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
