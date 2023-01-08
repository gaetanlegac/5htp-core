/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { ComponentChild, RefObject } from 'preact';

// Core
import Button, { Props as ButtonProps } from '../button';
import { TDialogControls } from '../Dialog/Manager';
export type { TDialogControls } from '../Dialog/Manager';

// Libs
import useContexte from '@/client/context';

/*----------------------------------
- TYPES
----------------------------------*/

export type Props = ButtonProps & {
    content: ComponentChild,
    refModal?: RefObject<TDialogControls>
}

/*----------------------------------
- CONTROLEUR
----------------------------------*/
export default (props: Props) => {

    const { modal } = useContexte();

    let {
        content,
        refModal,
        ...buttonProps
    } = props;

    const refButton = React.useRef<HTMLElement>(null);

    const open = () => {
        const modalInstance = modal.show(() => content);
        if (refModal)
            refModal.current = modalInstance;
    }

    return (
        <Button {...buttonProps} onClick={(open)} refElem={refButton} />
    )
}