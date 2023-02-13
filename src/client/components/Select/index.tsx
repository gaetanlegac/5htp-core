/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

// Core
import Dropdown, { TDialogControls, Props as DropdownProps } from '@client/components/dropdown';

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

    const refModal = React.useRef<TDialogControls>(null);

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
            <Dropdown {...props} content={(() =>
                <ChoiceSelector {...props} currentList={currentList} />
            )} iconR="chevron-down" refModal={refModal}>

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