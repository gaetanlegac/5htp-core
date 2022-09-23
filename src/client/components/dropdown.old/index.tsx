/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { ComponentChild } from 'preact';

// Core
import Button, { Props as ButtonProps } from '../button';

// Libs
import { TPopoverControls, PopoverProps } from './Manager';
import useContexte from '@client/context';

/*----------------------------------
- TYPES
----------------------------------*/

export type Props = ButtonProps & PopoverProps

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
import "./popover.less";
export default (props: Props) => {

    const ctx = useContexte();

    let {
        
        position,
        frame,
        content,
        interactions,

        ...buttonProps
    } = props;

    const [visible, setVisible] = React.useState(false);

    const toggle = () => {

        if (!refButton.current)
            return console.error("Unable to access to the button element");

        /*if (refPopover.current)
            refPopover.current.toggle();
        else*/
        if (!visible)
            refPopover.current = ctx.popover({
                origin: refButton.current,
                content,
                onVisibilityChange: setVisible,
                position,
                frame,
                interactions
            });
        else
            refPopover.current.close();
    }

    const refButton = React.useRef<HTMLElement>(null);
    const refPopover = React.useRef<TPopoverControls>(null);

    let classe = buttonProps.class === undefined
        ? "dropdown"
        : buttonProps.class + " dropdown";

    if (!props.immutable) {

        if (visible)
            classe += ' selected';

        if (buttonProps.children !== undefined && buttonProps.icon === undefined && buttonProps.iconR === undefined)
            buttonProps.iconR = /* @icon */"chevron-down";

    }

    return (
        <Button {...buttonProps} class={classe} onClick={toggle} refElem={refButton} />
    )
}