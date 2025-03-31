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
    menuProps = {}, ...btnProps 
}: Props) => {
    return (
        <Menu {...menuProps}>
            <Menu.Target>
                <Button {...btnProps}>{label}</Button>
            </Menu.Target>
            <Menu.Dropdown>
                {children}
            </Menu.Dropdown>
        </Menu>
    )
}
