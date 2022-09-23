/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React, { JSX } from 'react';

// Core libs
import Format from '@common/data/number/format';

/*----------------------------------
- TYPES
----------------------------------*/

export type Unit=  'satoshi' | 'bitcoin' | 'dollars' | 'credits'

/*----------------------------------
- COMPONENTS
----------------------------------*/
export default ({ amount, unit, sign, decimals, ...props }: { 
    amount: number, 
    unit: Unit, 
    decimals?: number,
    sign?: '+' | '-'
} & JSX.HTMLAttributes<HTMLDivElement>) => {

    const className = 'number row sp-05 ' + (props.class ? props.class + ' ' : '');//sign === undefined ? 'txtPrimary' : (sign === '+' ? 'txtSuccess' : 'txtError');
    if (unit === 'credits')
        return <strong {...props} class={className}>{sign} {Format.credits(amount, decimals)} Credits</strong>;
    else if (unit === 'dollars')
        return <strong {...props} class={className}>{sign} {Format.dollars(amount, decimals)} $</strong>;
    else if (unit === 'satoshi')
        return <strong {...props} class={className}>{sign} {Format.satoshi(amount)} sat.</strong>;
    else if (unit === 'bitcoin')
        return <strong {...props} class={className}>{sign} {Format.bitcoin(amount)} BTC</strong>;
    else
        return <>-</>
}