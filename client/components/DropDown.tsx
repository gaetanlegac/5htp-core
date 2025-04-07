/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { JSX, ComponentChild } from 'preact';
import { Menu, MenuProps } from '@mantine/core';
import Button, { Props as ButtonProps } from './Button';

// Core libs
import { useMantineInput, InputBaseProps } from './utils';

/*----------------------------------
- TYPES
----------------------------------*/
export type Props = ButtonProps & {
    menuProps?: MenuProps,
  label: ComponentChild,
}

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default ({ 
    label, children, 
    menuProps = {}, size, ...btnProps 
}: Props) => {
    return (
        <Menu {...menuProps} size={size}>
            <Menu.Target>
                <Button {...btnProps} iconR="angle-down">{label}</Button>
            </Menu.Target>
            <Menu.Dropdown>
                {children}
            </Menu.Dropdown>
        </Menu>
    )
}
