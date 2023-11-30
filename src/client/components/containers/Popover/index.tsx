/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { JSX, ComponentChild } from 'preact';
import type { StateUpdater } from 'preact/hooks';

// Libs
import getPosition, { TSide, TPosition } from './getPosition';
import { blurable, deepContains, focusContent } from '@client/utils/dom';
import useContexte from '@/client/context';

/*----------------------------------
- TYPES
----------------------------------*/

export type Props = JSX.HTMLAttributes<HTMLDivElement> & {
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

    /*----------------------------------
    - INIT
    ----------------------------------*/
    
    let {
        id,

        content, state, width, disable,

        frame, side,

        children, tag,

        ...autresProps
    } = props;

    const [position, setPosition] = React.useState<TPosition | undefined>(undefined);
    const refCont = React.useRef<HTMLElement>(null);
    const refContent = React.useRef<HTMLElement>(null);

    const [shown, show] = state;

    // Màj visibilite
    React.useEffect(() => {
        if (shown === true && refContent.current !== null && refCont.current !== null) {

            // Positionnement si affichage
            setPosition(
                getPosition(
                    refCont.current, 
                    refContent.current, 
                    false, 
                    side, 
                    /*frame || document.getElementById('page') || */undefined
                )
            );

            // Autofocus elements
            focusContent( refContent.current );

            // Close when the user clicks elsewere tha the popover
            return blurable([ refCont.current, () => show(false) ])
        }

    }, [shown]);

    /*----------------------------------
    - ATTRIBUTES
    ----------------------------------*/
    if (!autresProps.className)
        autresProps.className = '';

    autresProps.className += ' contPopover';

    const active = shown && !disable;
    if (active) {
        autresProps.className += ' active';
    }

    const Tag = tag || 'div';

    let renderedContent: ComponentChild;
    if (active) {
        //content = typeof content === 'function' ? React.createElement(content) : content;
        renderedContent = React.cloneElement( 
            content, 
            {
                className: 'card popover pd-1' 
                    + (position ? ' pos_' + position.cote : '')
                    + ' ' + (content.props.className || ''),

                ref: (ref: any) => {
                    if (ref !== null)
                        refContent.current = ref
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
            }
        )
    }

    /*----------------------------------
    - RENDER
    ----------------------------------*/
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

            {renderedContent}
        </Tag>
    )
}
