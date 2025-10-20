/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { VNode, JSX } from 'preact';
import { 
    TextInput, TextInputProps, 
    NumberInput, NumberInputProps, 
    Textarea, TextareaProps 
} from '@mantine/core';

// Core libs
import { InputBaseProps, useMantineInput } from './utils';

/*----------------------------------
- TYPES
----------------------------------*/
export type Props = {

    // State
    inputRef?: React.Ref<HTMLInputElement>

    // Actions
    onPressEnter?: (value: string) => void,
    
} & (
    InputBaseProps<string> & Omit<TextInputProps, 'onChange'> & {
        type?: 'email' | 'password'
        validator?: Validator<string>,
    }
    | 
    InputBaseProps<number> & Omit<NumberInputProps, 'onChange'> & {
        type: 'number',
        validator?: ReturnType< SchemaValidators["number"] >,
    }
    | 
    InputBaseProps<string> & Omit<TextareaProps, 'onChange'> & {
        type: 'longtext',
        validator?: ReturnType< SchemaValidators["string"] >,
    }
)

/*----------------------------------
- COMPOSANT
----------------------------------*/

// Adapt the old component to render with mantine text input
// Don't use useInput hook because it's not mantine compatible
export default (initProps: Props) => {

    const [{ value, onChange }, props] = useMantineInput<Props, string|number>(initProps);

    // Select the right component
    let Component: typeof TextInput | typeof NumberInput | typeof Textarea;
    if (props.type === 'number') {
        Component = NumberInput;
        props.min = props.min ?? 0;
    } else if (props.type === 'longtext' && typeof document !== 'undefined') {
        Component = Textarea;
        props.autosize = props.autosize || true;
        props.minRows = props.minRows || 2;
    } else {
        Component = TextInput;
    }

    return (
        <Component 
            {...props}
            value={value}
            onChange={e => {
                if (props.type === 'number') {
                    onChange(e);
                } else {
                    onChange(e.target.value);
                }
            }}
        />
    )
}