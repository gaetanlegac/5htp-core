/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { ComponentChild } from 'preact';

// Core
import Button, { Props as ButtonProps } from '../button';

// Libs
import useContexte from '@client/context';

/*----------------------------------
- TYPES
----------------------------------*/

export type Props = ButtonProps & {
    content: ComponentChild
}

export type TAction<TDonnee> = {
    icone?: TIcons,
    label: ComponentChild,
    multi?: boolean,

    onClick?: (donnees: TDonnee, index: number) => void,
    lien?: (donnees: TDonnee, index: number) => string,
    bouton?: (donnees: TDonnee, index: number) => ButtonProps
}

export type TActionsPopover = {
    show: () => void,
    hide: () => void,
    toggle: () => void
}

/*----------------------------------
- CONTROLEUR
----------------------------------*/
export default (props: Props) => {

    const { modal } = useContexte();

    let {
        content,
        immutable,
        ...buttonProps
    } = props;

    const refButton = React.useRef<HTMLElement>(null);

    const open = () => modal.show(() => content);

    return (
        <Button {...buttonProps} onClick={open} refElem={refButton} />
    )
}