/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

// Core

// Core components
import Button, { Props as ButtonProps } from '@client/components/button';
import useHeader from '@client/pages/useHeader';

/*----------------------------------
- CONTROLEUR
----------------------------------*/
import './index.less';
export default ({ headline, subtitle, cta, preview }: {
    
    headline: string,
    subtitle: string,
    cta: ButtonProps,
    preview: [string, string]

}) => {

    useHeader({
        title: headline,
        subtitle: subtitle,
    });

    /*----------------------------------
    - RENDER
    ----------------------------------*/
    return (
        <div id="landing">

            <header>
                <div class="text card">
                    <h1>{headline}</h1>
                    <p>
                        {subtitle}
                    </p>
                    <Button type="guide" {...cta} />
                </div>

                <figure>        
                    <img class="image" src={preview[0]} />
                    <legend>{preview[1]}</legend>
                </figure>
            </header>
            
        </div>
    )
}