/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

// Specific
import type { 
    Choice,
} from './ChoiceSelector';

import type { Props } from '.';

/*----------------------------------
- TYPE
----------------------------------*/

/*----------------------------------
- COMPONENT
----------------------------------*/
export default ({ choice, currentList, onChange, multiple, includeCurrent }: {
    choice: Choice,
    currentList: Choice[],
    includeCurrent: boolean
} & Pick<Props, 'onChange'|'multiple'>) => {

    const isCurrent = currentList.some(c => c.value === choice.value);
    if (isCurrent && !includeCurrent) return null;

    const showRemoveButton = multiple;

    return isCurrent ? (
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