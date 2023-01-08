/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { ComponentChild } from 'preact';

// Core libs
import { useState } from '@client/hooks';

/*----------------------------------
- TYPES
----------------------------------*/

export type InputBaseProps<TValue> = {
    value: TValue,
    title: string, // Now mandatory
    onChange?: (newValue: TValue) => void,
}

export type TInputState<TValue> = {
    value: TValue,
    fieldProps: {[key: string]: any},
    valueSource: 'internal'|'external',
    focus: boolean,
}

/*----------------------------------
- HOOKS
----------------------------------*/
export function useInput<TValue>(
    { value: externalValue, onChange }: InputBaseProps<TValue>, 
    defaultValue: TValue,
): [
    state: TInputState<TValue>,
    setValue: (value: TValue) => void,
    commitValue: () => void,
    setState: (state: Partial<TInputState<TValue>>) => void,
] {

    const [state, setState] = useState<TInputState<TValue>>({
        value: externalValue !== undefined ? externalValue : defaultValue,
        valueSource: 'external',
        fieldProps: {},
        focus: false
    });

    const setValue = (value: TValue) => setState({ value, valueSource: 'internal' });

    const commitValue = () => {
        console.log(`[input] Commit value:`, state.value);
        if (onChange !== undefined)
            onChange(state.value);
    }

    // External value change
    React.useEffect(() => {

        if (externalValue !== undefined && externalValue !== state.value) {
            console.log("External value change", externalValue);
            setState({ value: externalValue, valueSource: 'external' })
        }
        
    }, [externalValue]);

    return [state, setValue, commitValue, setState]
}

/*----------------------------------
- COMPONENT
----------------------------------*/
import './index.less';