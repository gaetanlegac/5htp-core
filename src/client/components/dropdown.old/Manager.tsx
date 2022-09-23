/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { ComponentChild, JSX } from 'preact';

// Libs
import useContexte from '@client/context';
import getPosition, { TSide, TPosition } from './getPosition';
import { blurable, deepContains } from '@client/utils/dom';

/*----------------------------------
- TYPES: IMPORTATIONS
----------------------------------*/

/*----------------------------------
- TYPES: DECLARATIONS
----------------------------------*/

export type PopoverProps = {

    origin: HTMLElement,
    content: JSX.Element,
    interactions?: boolean
    position?: TSide,
    frame?: React.Ref<HTMLDivElement>,

    onVisibilityChange?: (visible: boolean) => void,
    close: () => void,
    initialPosition: TPosition,

    immutable?: boolean, // If true, don't add classes, nor childrens
}

export type TPopover = PopoverProps & {
    id: number,
    close: () => void,
    visible: boolean,
    onVisibilityChange?: (visible: boolean) => void,
}

const Popover = ({ id, origin, content, interactions, position: side, frame, close, initialPosition, onVisibilityChange }: TPopover) => {

    const [position, setPosition] = React.useState<TPosition>(initialPosition);
    const refElement = React.createRef<HTMLElement>();

    React.useEffect(() => {

        if (!refElement.current)
            return console.warn("Unable to get the popover dom origin to compute the correct position");

        // Now the popover is shown and we know his dipensions, 
        //   we can set the correct position
        setPosition(
            getPosition(
                origin,
                refElement.current,
                side,
                frame?.current || (document.getElementById('#layout') as HTMLElement)
            )
        ); 

    }, [id]);
    
    return React.cloneElement(content, {
        className: (content.props.className || '') + ' popover' + (position ? ' pos_' + position.cote : ''),
        onClick: () => {
            if (!interactions) {
                close();
            }
        },
        ref: refElement,
        style: {
            ...(content.props.style || {}),
            ...(position ? {
                top: position.css.top,
                left: position.css.left,
                right: position.css.right,
                bottom: position.css.bottom,
            } : {}),
        }
    });

}

/*----------------------------------
- COMPOSANT
----------------------------------*/
let curId: number = 0;
export default ({ }: {

}) => {

    const ctx = useContexte();

    const [popover, setPopover] = React.useState<TPopover | null>(null);

    ctx.popover = (props: PopoverProps): TPopover => {

        const id = curId++;
        const close = () => {
            setPopover(p => p && p.id === id ? null : p);
            if (props.onVisibilityChange)
                props.onVisibilityChange(false);
        }

        const popover = { 
            ...props,
            
            id, 
            visible: true, 
            close
        };

        if (props.onVisibilityChange)
            props.onVisibilityChange(true);

        setPopover(existing => {

            if (existing !== null && existing.onVisibilityChange)
                existing.onVisibilityChange(false);

            return popover;

        });

        return popover;
    }

    if (popover === null)
        return null;

    React.useEffect(() => {
        const blur = (e: MouseEvent) => {

            const clickedOnPopover = deepContains([".popover", '.btn.dropdown'], e.target);
            if (clickedOnPopover)
                return;

            if (popover.onVisibilityChange)
                popover.onVisibilityChange(false);

            setPopover(null);
        };
        document.addEventListener('mousedown', blur);
        return () => document.removeEventListener('mousedown', blur);
    });

    const initialPosition = getPosition(
        popover.origin,
        [200 /* = min-width .popover */, 100],
        popover.position,
        popover.frame?.current || (document.getElementById('#layout') as HTMLElement)
    )

    return (
        <div id="popover">
            <Popover {...popover} initialPosition={initialPosition} />
        </div>
    )

}