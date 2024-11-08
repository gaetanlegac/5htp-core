/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { ComponentChild, RefObject } from 'preact';

// Core
import Button, { Props as ButtonProps } from '../button';
import Popover, { Props as PopoverProps } from '../containers/Popover';

/*----------------------------------
- TYPES
----------------------------------*/

export type Props = ButtonProps & {
    label?: ComponentChild,
    refDropdown?: RefObject<TDropdownControl>,
    popover?: Partial<PopoverProps>
}

export type TDropdownControl = {
    close: () => void
}

/*----------------------------------
- CONTROLEUR
----------------------------------*/
export default (props: Props) => {

    let {
        children,
        label,
        refDropdown,
        popover,
        ...buttonProps
    } = props;

    const popoverState = React.useState(false);

    const refButton = React.useRef<HTMLElement>(null);

    if (refDropdown)
        refDropdown.current = {
            close: () => popoverState[1]( false )
        }

    return (
        <Popover content={(
            <div class="bg white col menu">
                {children}
            </div>
        )} state={popoverState} {...(popover || {})}>

            <Button {...buttonProps} iconR={<i src="chevron-down" class="s" />} 
                refElem={refButton} children={label} />
                
        </Popover>
    )
}