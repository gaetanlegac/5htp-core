/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { ComponentChild } from 'preact';

// Core
import { useState } from '@/client/context';

/*----------------------------------
- TYPES
----------------------------------*/

/*----------------------------------
- COMPOSANT
----------------------------------*/
import './index.less';
export default ({ liste, class: className = "", interval = 2000 }: { 
    liste: ComponentChild[],
    class?: string,
    interval?: number
}) => {

    if (liste.length === 0)
        return null;

    const timer = React.useRef<NodeJS.Timeout>();
    const txtRefs = React.useRef<HTMLLIElement[]>([]);

    const [{ elemA, posA, txtHeight }, setState] = React.useState<{
        elemA: number,
        posA: number,
        txtHeight: number
    }>({
        elemA: 0,
        posA: 0,
        txtHeight: 0
    });

    React.useEffect(() => {

        if (txtHeight === 0)
            setState((state) => ({ 
                ...state,
                txtHeight: txtRefs.current[0].offsetHeight
            }))

        timer.current = setTimeout(() => {
            if (elemA === liste.length - 1)
                setState({ 
                    elemA: 0, 
                    posA: 0, 
                    txtHeight: txtRefs.current[0].offsetHeight
                })
            else
                setState(({ elemA, posA }) => {
                    return ({ 
                        elemA: elemA + 1, 
                        posA: posA + txtRefs.current[elemA].offsetHeight,
                        txtHeight: txtRefs.current[elemA + 1].offsetHeight
                    })
                });
        }, interval);

        return () => {
            clearTimeout(timer.current);
        }

    }, [elemA]);

    return (
        <div class={"spintxt " + className} style={{
            height: txtHeight + 'px'
        }}>
            <ul style={{ top: '-' + posA + 'px' }}>

                {liste.map((elem, i) => (
                    <li class={i === elemA ? 'current' : ''} 
                        ref={(ref) => txtRefs.current[i] = ref}>

                        {elem}
                    </li>
                ))}

            </ul>
        </div>
    )

}