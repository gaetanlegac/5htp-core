/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import type { StateUpdater } from 'preact/hooks';

// Core libs
import { useState } from '@client/hooks';

/*----------------------------------
- TYPES
----------------------------------*/

export type InputBaseProps<TValue> = {

    title: string, // Now mandatory
    required?: boolean,
    errors?: string[],
    size?: TComponentSize,

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
    { value: externalValue, onChange, ...otherProps }: InputBaseProps<TValue>, 
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
import './base.less';