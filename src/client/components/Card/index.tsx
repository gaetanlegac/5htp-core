/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import type { ComponentChild } from 'preact';

// Core components
import { Logo } from '@client/components';
import { Link } from '@client/services/router';

// Resources
import './index.less';

/*----------------------------------
- TYPE
----------------------------------*/

type TMeta = {
    label: ComponentChild,
    class?: string,
    value: ComponentChild,
}

export type Props = {
    title: string,
    link?: string,
    cover?: {
        color?: string,
        image?: string,
        title?: string,
        logo?: ComponentChild
    },
    metas: TMeta[],
    class?: string,
}

/*----------------------------------
- COMPONENT
----------------------------------*/
export default ({ title, link, cover, metas, class: className = '' }: Props) => {

    if (link)
        className += ' clickable';

    return (

        <article class={"card col " + className}>
    
            {cover && (
                <header class="bg img colorize row al-left cover pdb-1" style={{
                    backgroundColor: '#' + cover.color,
                    backgroundImage: cover.image
                        ? 'url(' + cover.image + ')'
                        : undefined
                }}>
        
                    {typeof cover.logo === 'string' 
                        ? <Logo src={cover.logo} size="xl" /> 
                        : cover.logo}
        
                    {cover.title && (
                        <strong>
                            {cover?.title}
                        </strong>
                    )}
                    
                </header>
            )}
    
            {link ? (
                <Link to={link} class="txt-left super">
                    <h3>{title}</h3>
                </Link>
            ) : (
                <h3>{title}</h3>
            )}
    
            {metas && (
                <ul class="row fill al-top">
                    {metas.map(({ label, value, class: className }) => (
                        <li class={"col al-left txt-left sp-05"}>
                            {label}
                            <strong class={className}>{value}</strong>
                        </li>
                    ))}
                </ul>
            )}
    
        </article>
    )
}