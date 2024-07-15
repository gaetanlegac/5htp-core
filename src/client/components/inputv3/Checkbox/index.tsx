/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { JSX, ComponentChild } from 'preact';

// Core libs
import { useInput, InputBaseProps } from '../../inputv3/base';

/*----------------------------------
- TYPES
----------------------------------*/
export type Props = {
    id: string,
    label?: ComponentChild,
    // State
    inputRef?: React.Ref<HTMLInputElement>
}

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default ({ 
    id,
    // Decoration
    required,
    label: labelText,
    // State
    inputRef, errors,
    ...props 
}: Props & InputBaseProps<boolean> & Omit<JSX.HTMLAttributes<HTMLInputElement>, 'onChange'>) => {

    /*----------------------------------
    - INIT
    ----------------------------------*/

    const [{ value, focus, fieldProps }, setValue, commitValue, setState] = useInput(props, false, true);

    const refInput = inputRef || React.useRef<HTMLInputElement>();
    
    /*----------------------------------
    - ATTRIBUTES
    ----------------------------------*/

    let className: string = 'input checkbox row';

    if (focus)
        className += ' focus';
    if (errors?.length)
        className += ' error';

    if (props.className !== undefined)
        className += ' ' + props.className;

    /*----------------------------------
    - RENDER
    ----------------------------------*/
    return <>
        <div class={className} onClick={() => refInput.current?.focus()}>

            <input type="checkbox" 
                onChange={() => {
                    setValue( !value );
                }}
                checked={value}
                {...fieldProps}
            />

            {labelText !== undefined && (
                <label htmlFor={id} class="col-1 txt-left">
                    {labelText}
                </label>
            )}
            
        </div>
        
        {errors?.length && (
            <div class="fg error txt-left">
                {errors.join('. ')}
            </div>
        )}
    </>
}
