/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

// Core
import Dropdown, { TDropdownControl, Props as DropdownProps } from '@client/components/dropdown';

// Specific
import ChoiceSelector, { 
    Props as SelectorProps, 
    Choice,
} from './ChoiceSelector';

/*----------------------------------
- TYPES
----------------------------------*/

export type Props = DropdownProps & SelectorProps & {
    title: string,
    errors?: string[],
}

/*----------------------------------
- COMONENT
----------------------------------*/
export default ({ 
    title, 
    errors,
    ...props 
}: Props) => {

    /*----------------------------------
    - INIT
    ----------------------------------*/

    const refDropdown = React.useRef<TDropdownControl>(null);

    /*----------------------------------
    - ACTIONS
    ----------------------------------*/

    const currentList: Choice[] = props.value === undefined
        ? []
        : (Array.isArray(props.value) 
            ? props.value 
            : [props.value]
        );

    /*----------------------------------
    - RENDER
    ----------------------------------*/
    return <>
        {props.inline ? (
            <ChoiceSelector {...props} currentList={currentList} />
        ) : (
            <Dropdown {...props} content={(
                <ChoiceSelector {...props} currentList={currentList} refDropdown={refDropdown} />
            )} iconR="chevron-down" refDropdown={refDropdown}>

                {currentList.length === 0
                    ? title
                    : currentList.map(
                        choice => (
                            <span class="badge">
                                {choice.label}
                            </span>
                        )
                    )}

            </Dropdown>
        )}

        {errors?.length && (
            <div class="fg error txt-left">
                {errors.join('. ')}
            </div>
        )}
    </>
}