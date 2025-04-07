/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { JSX, ComponentChild } from 'preact';
import { Button, Menu, MenuProps } from '@mantine/core';
import { Props as ButtonProps } from './Button';

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
    menuProps = {}, size, icon, ...btnProps 
}: Props) => {
    return (
        <Menu {...menuProps} size={size}>
            <Menu.Target>
                <Button {...btnProps} 
                    rightSection={<i src="angle-down" />}
                    variant="subtle"
                >
                    {icon && <i src={icon} />}
                    {label}
                </Button>
            </Menu.Target>
            <Menu.Dropdown>
                {children}
            </Menu.Dropdown>
        </Menu>
    )
}
