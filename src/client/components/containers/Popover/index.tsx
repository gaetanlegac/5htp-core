/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React, { JSX } from 'react';
import { ComponentChild } from 'preact';
import type { StateUpdater } from 'preact/hooks';

// Composants
import Bouton, { Props as PropsBouton } from '@client/components/button';

// Ressouces
//import '@client/components/Donnees/Tooltip/index.less';

// Libs
import getPosition, { TSide, TPosition } from './getPosition';
import { blurable, deepContains } from '@client/utils/dom';
import useContexte from '@/client/context';

/*----------------------------------
- TYPES
----------------------------------*/

export type Props = {
    id?: string,

    // Display
    content?: JSX.Element,
    state: [boolean, StateUpdater<boolean>],
    width?: number | string,
    disable?: boolean
    // Position
    frame?: HTMLElement,
    side?: TSide,
    // Tag
    children: JSX.Element | [JSX.Element],
    tag?: string,
}

/*----------------------------------
- COMPOSANT
----------------------------------*/
import "./popover.less";
export default (props: Props) => {

    const ctx = useContexte();

    let {
        id,

        content, state, width, disable,

        frame, side,

        children, tag,

        ...autresProps
    } = props;

    const [position, setPosition] = React.useState<TPosition>(undefined);
    const refCont = React.useRef<HTMLElement>(null);
    const refPop = React.useRef<HTMLElement>(null);

    const [shown, show] = state;

    // Màj visibilite
    React.useEffect(() => {
        if (shown === true) {
            // Positionnement si affichage
            setPosition(
                getPosition(
                    refCont.current, 
                    refPop.current, 
                    false, 
                    side, 
                    frame || document.getElementById('page')
                )
            );

            return blurable([refCont.current, () => show(false)])
        }

    }, [shown]);

    if (!autresProps.className)
        autresProps.className = '';

    autresProps.className += ' contPopover';

    const active = shown && !disable;
    if (active) {
        autresProps.className += ' active';
    }

    const Tag = tag || 'div';

    return (
        <Tag
            style={{
                position: 'relative',
                ...(shown ? {
                    zIndex: 11
                } : {})
            }}
            ref={(ref: any) => {
                if (ref !== null)
                    refCont.current = ref;
            }}
            {...autresProps}
        >
            {React.cloneElement( children, {
                onClick: (e) => {
                    show(isShown => !isShown);
                }
            })}

            {active && React.cloneElement(content, {
                className: (content.props.className || '') + ' card white popover' + (position ? ' pos_' + position.cote : ''),
                ref: (ref: any) => {
                    if (ref !== null)
                        refPop.current = ref
                },
                style: {
                    ...(content.props.style || {}),
                    ...(position ? {
                        top: position.css.top,
                        left: position.css.left,
                        right: position.css.right,
                        bottom: position.css.bottom,
                    } : {}),
                    ...(width !== undefined ? { width: typeof width === 'number' ? width + 'rem' : width } : {})
                }
            })}
        </Tag>
    )
}
