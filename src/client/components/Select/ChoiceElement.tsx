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
export default ({ choice, currentList, onChange, multiple, includeCurrent, format = 'badge' }: {
    choice: Choice,
    currentList: Choice[],
    includeCurrent?: boolean,
    format?: 'list' | 'badge'
} & Pick<Props, 'onChange'|'multiple'>) => {

    const isCurrent = currentList.some(c => c.value === choice.value);
    if (isCurrent && !includeCurrent) return null;

    const showRemoveButton = multiple;

    return format === 'list' ? (
        <li>
            <Button icon={isCurrent ? 'check-circle' : undefined} onClick={() => onChange( current => multiple 
                ? (isCurrent 
                    ? currentList.filter(item => item.value !== choice.value) 
                    : [...(current || []), choice]
                )
                : isCurrent ? undefined : choice
            )}>
                {choice.label} 
            </Button>
        </li>
    ) : isCurrent ? (
        <li class={"badge bg primary"+  (showRemoveButton ? ' pdr-05' : '')}>
            {choice.label}

            {showRemoveButton && (
                <span class="badge xs clickable" onClick={(e) => {
                    e.stopPropagation();
                    onChange( current => current.filter( c => c.value !== choice.value))
                    return false;
                }}>
                    x
                </span>
            )}
        </li>
    ) : (
        <li class={"badge clickable"} onClick={() => {
            onChange( current => multiple 
                ? [...(current || []), choice] 
                : choice
            );
        }}>
            {/*search.keywords ? (
                <span>
                
                    <strong>{search.keywords}</strong>{choice.label.slice( search.keywords.length )}

                </span>
            ) : */choice.label}
        </li>
    )
}