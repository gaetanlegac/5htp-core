/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import type { ComponentChild } from 'preact';

// Core components
import Button from '@client/components/button';

// Resources
import './index.less';

/*----------------------------------
- TYPE
----------------------------------*/

export type Props = {
    children: ComponentChild,
    elevator?: React.HTMLAttributes<HTMLDivElement>
}

/*----------------------------------
- COMPONENT
----------------------------------*/
export default ({  children, elevator = {} }: Props) => {

    const containerRef = React.useRef<HTMLDivElement>();
    const [containerHeight, setContainerHeight] = React.useState<number>(undefined);
    const [scroll, setScroll] = React.useState({
        pos: 0,
        left: false,
        right: true
    });

    const moveTo = (direction: number) => {

        const container = containerRef.current;
        if (container === null)
            return console.error(`Unable to scroll: container not defined`);

        const row = container.children[0];
        if (!row)
            return console.error(`No row found`);

        const containerWidth = container.getBoundingClientRect().width;
        const rowWidth = row.getBoundingClientRect().width;

        setScroll( curPos => {

            const newPos = {
                pos: curPos.pos + (-1 * direction * containerWidth),
                left: true,
                right: true
            };

            // Scroll Left limit
            const leftPosLim = 0 - rowWidth + containerWidth;
            if (newPos.pos < leftPosLim) {
                newPos.pos = leftPosLim;
                newPos.right = false;
            }

            // Scroll Left limit
            if (newPos.pos > 0) {
                newPos.pos = 0;
                newPos.left = false;
            }

            return newPos;
        });

    }

    React.useEffect(() => {

        // If row oveflow, show horizontal arroxs
        setContainerHeight( containerRef.current.getBoundingClientRect().height );

    }, []);

    return (
        <div class={"scrollable-row" + (scroll.left ? '' : ' stopLeft') + (scroll.right ? '' : ' stopRight')}>

            <Button class="left" shape="pill" icon="arrow-left" onClick={() => moveTo(-1)} />

            <div class="container" ref={containerRef} style={{
                height: containerHeight ? containerHeight + 'px' : undefined
            }}>
                <div {...elevator} class={"row " + (elevator.class || '')} style={{ 
                    left: scroll.pos + 'px', 
                    position: containerHeight === undefined 
                        ? 'relative' 
                        : 'absolute' 
                }}>
                    {children}
                </div>
            </div>

            <Button class="right" shape="pill" icon="arrow-right" onClick={() => moveTo(1)} />

        </div>
    )

}