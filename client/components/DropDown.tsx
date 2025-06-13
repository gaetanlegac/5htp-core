/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { JSX, ComponentChild } from 'preact';
import { Menu, MenuProps } from '@mantine/core';
import Button, { Props as ButtonProps } from './Button';
import Popover, { Props as PopoverProps } from './containers/Popover';

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
        <Popover content={(
            <div class="card bg white col menu">
                {children}
            </div>
        )}>
            <Button {...btnProps} 
                size={size}
                suffix={<i src="angle-down" />}
            >
                {icon && <i src={icon} />}
                {label}
            </Button>
        </Popover>
    )
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
