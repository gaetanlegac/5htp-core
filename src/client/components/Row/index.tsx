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
    children: ComponentChild
}

/*----------------------------------
- COMPONENT
----------------------------------*/
export default ({ children }: Props) => {

    const containerRef = React.useRef<HTMLDivElement>();
    const [leftPos, setLeftPos] = React.useState<number>(0);

    const moveTo = (sens: number) => {

        const container = containerRef.current;
        if (container === null)
            return console.error(`Unable to scroll: container not defined`);

        const row = container.children[0];
        if (!row)
            return console.error(`No row found`);

        const containerWidth = container.getBoundingClientRect().width;
        const rowWidth = row.getBoundingClientRect().width;

        console.log({ containerWidth, rowWidth });

    }

    React.useEffect(() => {

        // If row oveflow, show horizontal arroxs
        console.log({ containerRef });


    }, []);

    return (
        <div class="scrollable-row stopLeft">

            <Button class="left" shape="pill" icon="arrow-left" onClick={() => moveTo(-1)} />

            <div class="container" ref={containerRef}>
                <div class="row" style={{ left: leftPos + 'px' }}>
                    {children}
                </div>
            </div>

            <Button class="right" shape="pill" icon="arrow-right" onClick={() => moveTo(1)} />

        </div>
    )

}