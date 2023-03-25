/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { ComponentChild, RefObject } from 'preact';

// Core
import Button, { Props as ButtonProps } from '../button';
import Popover from '../containers/Popover';

/*----------------------------------
- TYPES
----------------------------------*/

export type Props = ButtonProps & {
    content: ComponentChild | (() => ComponentChild),
    refDropdown?: RefObject<TDropdownControl>
}

export type TDropdownControl = {
    close: () => void
}

/*----------------------------------
- CONTROLEUR
----------------------------------*/
export default (props: Props) => {

    let {
        content,
        refDropdown,
        ...buttonProps
    } = props;

    const popoverState = React.useState(false);

    const refButton = React.useRef<HTMLElement>(null);

    if (refDropdown)
        refDropdown.current = {
            close: () => popoverState[1]( false )
        }

    return (
        <Popover content={content} state={popoverState}>
            <Button {...buttonProps} refElem={refButton} />
        </Popover>
    )
}