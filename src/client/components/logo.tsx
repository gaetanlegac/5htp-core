/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

/*----------------------------------
- TYPES
----------------------------------*/
import { ComponentChild } from 'preact';

export type TProps = {
    src?: string,
    size?: TComponentSize,
    children?: ComponentChild,
    contain?: boolean,
} & React.JSX.HTMLAttributes<HTMLDivElement>

/*----------------------------------
- COMPOSANT 
----------------------------------*/
export default ({ src, className = '', size, contain, ...props }: TProps) => {

    className = 'logo ' + (className === undefined ? '' : ' ' + className)

    const taillePx = 64;//taillesComposant[size || 'm'].size;

    if (size !== undefined)
        className += ' ' + size;

    if (contain === true)
        className += ' contain';

    return (
        <i
            className={className}
            style={src === undefined ? {} : {
                backgroundImage: 'url(' + src /*+ '?s=' + taillePx*/ + ')'
            }}
            {...props}
        />
    )
}
