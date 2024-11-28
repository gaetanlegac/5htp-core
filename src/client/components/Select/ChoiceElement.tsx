/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

// Cpre
import { Button } from '@client/components';

// Specific
import type { Choice } from './ChoiceSelector';

import type { Props } from '.';

/*----------------------------------
- TYPE
----------------------------------*/

/*----------------------------------
- COMPONENT
----------------------------------*/
export default ({ choice, currentList, onChange, multiple, required, includeCurrent, format = 'badge' }: {
    choice: Choice,
    currentList: Choice[],
    includeCurrent?: boolean,
    format?: 'list' | 'badge'
} & Pick<Props, 'onChange'|'multiple'>) => {

    const isCurrent = currentList.some(c => c.value === choice.value);
    if (isCurrent && !includeCurrent) return null;

    const canUnselect = !required || currentList.length > 1;

    const onClick = () => {

        if (isCurrent && !canUnselect)
            return;

        onChange( current => multiple 
            ? (isCurrent 
                ? currentList.filter(item => item.value !== choice.value) 
                : [...(current || []), choice]
            )
            : isCurrent ? undefined : choice
        );
    }

    const btnProps = {
        selected: isCurrent,
        onClick,
        icon: choice.color ? (
            <span class="pastille" style={{ background: '#' + choice.color }} />
        ) : choice.icon ? (
            <i src={choice.icon} />
        ) : undefined
    }

    return format === 'list' ? (
        <li>
            <Button {...btnProps}>
                {choice.label} 
            </Button>
        </li>
    ) : (
        <li>
            <Button type="secondary" {...btnProps}>

                {choice.label}

                {(isCurrent && canUnselect) && (
                    <span class="badge xs clickable">
                        x
                    </span>
                )}
            </Button>
        </li>
    )
}