/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { VNode, JSX } from 'preact';
import TextareaAutosize from 'react-textarea-autosize';

// Core libs
import { useInput, InputBaseProps } from './base';
import { default as Validator } from '../../../common/validation/validator';
import type SchemaValidators from '@common/validation/validators';

/*----------------------------------
- TYPES
----------------------------------*/
export type Props = {

    // Decoration
    icon?: string,
    prefix?: VNode,
    suffix?: VNode,
    iconR?: string,

    // State
    inputRef?: React.Ref<HTMLInputElement>

    // Actions
    onPressEnter?: (value: string) => void,
} & ({
    type?: 'email' | 'password' | 'longtext'
    validator?: Validator<string>,

    // Behavior
    choice?: string[] | ((input: string) => Promise<string[]>),
} | {
    type: 'number',
    validator?: ReturnType< SchemaValidators["number"] >,
})

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default ({ 
    // Decoration
    icon, prefix, suffix, iconR, required, size, className = '',
    // State
    inputRef, errors,
    // Behavior
    type, choice, validator,
    // Actions
    onPressEnter,
    ...props 
}: Props & InputBaseProps<string> & Omit<JSX.HTMLAttributes<HTMLInputElement>, 'onChange'>) => {

    /*----------------------------------
    - INIT
    ----------------------------------*/

    const [{ value, focus, fieldProps }, setValue, commitValue, setState] = useInput(props, '' );

    // Trigger onchange oly when finished typing
    const refCommit = React.useRef<NodeJS.Timeout | null>(null);

    const refInput = inputRef || React.useRef<HTMLInputElement>();

    /*----------------------------------
    - ACTIONS
    ----------------------------------*/

    React.useEffect(() => {

        if (refCommit.current !== null)
            clearTimeout(refCommit.current);

        refCommit.current = setTimeout(commitValue, 100);
        
    }, [value]);
    
    React.useEffect(() => {

        if (focus && props.onFocus)
            props.onFocus(null);
        else if (!focus && props.onBlur)
            props.onBlur(null);
        
    }, [focus]);

    const updateValue = v => {
        if (type === 'number') {

            // Fix on Safari: the browser allows to input text in input number
            const numberValue = parseFloat(v);
            if (!Number.isNaN( numberValue ))
                setValue(numberValue);

        } else
            setValue(v);
    }
    
    /*----------------------------------
    - ATTRIBUTES
    ----------------------------------*/

    className += ' input text';

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
        Tag = 'textarea';
        className += ' multiline';

    } else if (type === 'number') {

        fieldProps.type = 'number';

    }

    // Auto suffix
    if (suffix === undefined && iconR !== undefined)
        suffix = <i src={iconR} />

    // When no value, show the lable as a placeholder
    if (value === '' || value === undefined)
        className += ' empty';
    if (focus)
        className += ' focus';
    if (size !== undefined)
        className += ' ' + size;
    if (errors?.length)
        className += ' error';

    /*----------------------------------
    - VALIDATION
    ----------------------------------*/

    // Map vaidation options to input props
    if (validator?.options) {
        if (type === 'number') {
            ({
                min: fieldProps.min,
                max: fieldProps.max,
                steps: fieldProps.steps,
            } = validator.options)  
        }
    }

    /*----------------------------------
    - RENDER
    ----------------------------------*/
    return <>
        <div class={className} onClick={() => refInput.current?.focus()}>

            {prefix}

            <div class="contValue">

                <Tag {...fieldProps}
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
                />

                <label>{props.title}{required && (
                    <span class="fg error">&nbsp;*</span>
                )}</label>
            </div>

            {suffix}
                
            {errors?.length && (
                <div class="bubble bg error bottom">
                    {errors.join('. ')}
                </div>
            )}
            
        </div>
    </>
}
