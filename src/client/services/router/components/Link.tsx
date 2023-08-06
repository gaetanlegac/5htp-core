/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import type { ComponentChild } from 'preact';
import { history } from '../request/history';

/*----------------------------------
- COMPONENT
----------------------------------*/
// Simple link
export const Link = ({ to, ...props }: { 
    to: string,
    children?: ComponentChild,
    class?: string,
    className?: string
} & React.HTMLProps<HTMLAnchorElement>) => {

    // External = open in new tab by default
    if (to && (to[0] !== '/' || to.startsWith('//')))
        props.target = '_blank';
    // Otherwise, propagate to the router
    else 
        props.onClick = (e) => {
            history?.push(to);
            e.preventDefault();
            return false
        }

    return (
        <a {...props} href={to} />
    )

}