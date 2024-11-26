/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { VNode, JSX } from 'preact';
import Slider from 'react-slider';

// Core libs
import { useInput, InputBaseProps } from '../../inputv3/base';

/*----------------------------------
- TYPES
----------------------------------*/
type TValeur = number;
const valeurDefaut = 0 as number;
type TValeurDefaut = typeof valeurDefaut;
type TValeurOut = string;

export type Props = {

    value: TValeur,

    step?: number,
    min?: number,
    max?: number,

    format?: (value: number) => string
}


/*----------------------------------
- COMPOSANT
----------------------------------*/
import './index.less';
export default ({ 
    // Decoration
    icon, prefix, required,
    step, min, max,
    // State
    errors,
    // Behavior
    type,
    ...props 
}: Props & InputBaseProps<number> & Omit<JSX.HTMLAttributes<HTMLInputElement>, 'onChange'>) => {

    /*----------------------------------
    - INIT
    ----------------------------------*/

    const [{ value, focus, fieldProps }, setValue, commitValue, setState] = useInput(props, 0);

    
    /*----------------------------------
    - ATTRIBUTES
    ----------------------------------*/

    let className: string = 'input slider';

   

    /*----------------------------------
    - VALIDATION
    ----------------------------------*/


    /*----------------------------------
    - RENDER
    ----------------------------------*/
    return <>
        <div class={className}>
            <div class="contValue">
                <Slider
                    step={step}
                    min={min} 
                    max={max} 

                    value={value}
                    onChange={(value: number) => {
                        setValue(value)
                    }}

                    className="champ slider"
                    thumbClassName="thumb"
                    trackClassName="track"
                />
            </div>
        </div>
    </>
}
