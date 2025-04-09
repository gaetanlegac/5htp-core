/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { JSX, ComponentChild } from 'preact';
import { Checkbox as CheckboxMantine, CheckboxProps } from '@mantine/core';

// Core libs
import { useMantineInput, InputBaseProps } from './utils';

/*----------------------------------
- TYPES
----------------------------------*/
export type Props = InputBaseProps<boolean> & Omit<CheckboxProps, 'onChange'> & {
  
}

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default (initProps: Props) => {

    /*----------------------------------
    - INIT
    ----------------------------------*/

    const [{ title, onChange }, { errors, required, ...props }] = useMantineInput<Props>(initProps);

    /*----------------------------------
    - RENDER
    ----------------------------------*/
    return (
        <CheckboxMantine 
            label={title}
            error={errors?.join(', ')}
            required={required}
            {...props}
            onChange={e => onChange?.(e.target.checked)}
        />
    )
}
