/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import type { ComponentChild, VNode }  from 'preact';
import type { StateUpdater } from 'preact/hooks';
import { __BaseInputProps, InputWrapper as InputWrapperMantine } from '@mantine/core';

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

    // Decoration
    icon?: string,
    prefix?: VNode,
    suffix?: VNode,
    iconR?: string,
    minimal?: boolean,
    wrapper?: boolean,

    value: TValue,
    onChange: (value: TValue) => void,
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

const sizeAdapter = {
    xs: 'xs',
    s: 'sm',
    m: 'md',
    l: 'lg',
    xl: 'xl',
}

export function useMantineInput<TProps extends __BaseInputProps & InputBaseProps<any>, TValue>({
    title, wrapper, hint, errors, icon, iconR, minimal, onChange, value, ...props
}: InputBaseProps<TValue> & TProps): [
    InputBaseProps<any>,
    TProps
] {

    // Adapt size
    if (props.size !== undefined)
        props.size = sizeAdapter[props.size];

    // Wrapper
    props.placeholder = props.placeholder || title;
    if (wrapper !== false) {
        props.label = title;
        props.description = hint;
    } 
    // Prefix
    if (props.leftSection === undefined && icon !== undefined)
        props.leftSection = <i src={icon} />;
    // Suffix
    if (props.rightSection === undefined && iconR !== undefined)
        props.rightSection = <i src={iconR} />;
    
    // Errors
    if (errors?.length)
        props.error = errors.join(', ');

    // Minimal
    props.className = props.className || '';
    if (minimal)
        props.className += ' minimal';

    return [{
        title,  
        wrapper,    
        hint,   
        errors,
        icon,
        iconR,
        minimal,
        onChange,
        value
    }, props];
}

export function useInput<TValue>(
    { value: externalValue, onChange, className, hint, ...otherProps }: InputBaseProps<TValue>, 
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
        <InputWrapperMantine
            label={title}
            description={hint}
            error={errors?.join(', ')}
            className={'col ' + className}
            required={required}
        >
            {children}
        </InputWrapperMantine>
    )
}