/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { ComponentChild, RefObject } from 'preact';

// Core
import Button, { Props as ButtonProps } from '../button';
import { TDialogControls } from '../Dialog/Manager';
import Popover from '../containers/Popover';

/*----------------------------------
- TYPES
----------------------------------*/

export type { TDialogControls } from '../Dialog/Manager';

export type Props = ButtonProps & {
    content: ComponentChild | (() => ComponentChild),
    refModal?: RefObject<TDialogControls>
}

/*----------------------------------
- CONTROLEUR
----------------------------------*/
export default (props: Props) => {

    let {
        content,
        refModal,
        ...buttonProps
    } = props;

    const popoverState = React.useState(false);

    const refButton = React.useRef<HTMLElement>(null);

    return (
        <Popover content={content} state={popoverState}>
            <Button {...buttonProps} refElem={refButton} />
        </Popover>
    )
}