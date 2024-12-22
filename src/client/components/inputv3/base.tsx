/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import type { ComponentChild }  from 'preact';
import type { StateUpdater } from 'preact/hooks';

// Core libs
import { useState } from '@client/hooks';

/*----------------------------------
- TYPES
----------------------------------*/

export type InputBaseProps<TValue> = {

    title: string, // Now mandatory
    hint?: ComponentChild,
    required?: boolean,
    errors?: string[],
    size?: TComponentSize,
    className?: string,

    wrapper?: boolean,

    value: TValue,
    onChange?: (value: TValue) => void,
}

export type TInputState<TValue> = {
    value: TValue,
    fieldProps: {[key: string]: any},
    valueSource: 'internal'|'external',
    focus: boolean,
    changed: boolean,
}

/*----------------------------------
- HOOKS
----------------------------------*/
export function useInput<TValue>(
    { value: externalValue, onChange, className, ...otherProps }: InputBaseProps<TValue>, 
    defaultValue: TValue,
    autoCommit: boolean = false
): [
    state: TInputState<TValue>,
    setValue: (value: TValue) => void,
    commitValue: () => void,
    setState: (state: Partial<TInputState<TValue>>) => void,
] {

    const [state, setState] = useState<TInputState<TValue>>({
        value: externalValue !== undefined ? externalValue : defaultValue,
        valueSource: 'external',
        fieldProps: otherProps,
        focus: false,
        changed: false
    });

    const setValue = (value: TValue) => {
        setState({ value, valueSource: 'internal', changed: true });
    };

    const commitValue = () => {

        // Avoid to change parent component state at first render
        if (state.changed === false)
            return;

        console.log(`[input] Commit value:`, state.value, externalValue);
        if (onChange !== undefined)
            onChange(state.value);
    }

    // External value change
    React.useEffect(() => {

        if (externalValue !== undefined && externalValue !== state.value) {
            console.log("External value change", externalValue);
            setState({ value: externalValue, valueSource: 'external', changed: true })
        }
        
    }, [externalValue]);

    React.useEffect(() => {
        if (state.valueSource === 'internal' && autoCommit) {
            commitValue();
        } 
    }, [state.value]);

    return [state, setValue, commitValue, setState]
}

/*----------------------------------
- COMPONENT
----------------------------------*/
export const InputWrapper = ({ children, wrapper = true, title, hint, required, errors, className = '' }: InputBaseProps<unknown> & {
    children: ComponentChild
}) => {

    /*----------------------------------
    - INIT
    ----------------------------------*/

    /*----------------------------------
    - ACTIONS
    ----------------------------------*/

    /*----------------------------------
    - RENDER
    ----------------------------------*/
    return wrapper === false ? <>{children}</> : (
        <div className={'inputWrapper ' + className}>

            {title && (
                <label>{title}{required && (
                    <span class="fg error">&nbsp;*</span>
                )}</label>
            )}

            {hint && <p class="hint">{hint}</p>}

            {children}

            {errors?.length && (
                <div class="bubble bg error bottom">
                    {errors.join('. ')}
                </div>
            )}
            
        </div>
    )
}

import './base.less';