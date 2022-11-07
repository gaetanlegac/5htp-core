/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

// Core
import Button from '@client/components/button';
import Dropdown, { TDialogControls, Props as DropdownProps } from '@client/components/dropdown';

/*----------------------------------
- CONST
----------------------------------*/

/*----------------------------------
- TYPES
----------------------------------*/

type Choices = string[]

type SearchResultsFunction = (keywords: string) => Choices

export type Props = DropdownProps & {
    title: string,
    choices: Choices,
    value?: string,
    onChange: (value: string) => void,
    search?: true | SearchResultsFunction
}

/*----------------------------------
- COMONENT
----------------------------------*/

export default ({ title, choices, value, onChange, ...dropDownProps }: Props) => {
    const refModal = React.useRef<TDialogControls>(null);
    return (
        <Dropdown {...dropDownProps} content={(
            <ul class="card col menu">
                {choices.map( jt => (
                    <li>
                        <Button active={jt === value} onClick={() => {
                            onChange(jt);
                            refModal.current?.close();
                        }}>
                            {jt}
                        </Button>
                    </li>
                ))}
            </ul>
        )} iconR="chevron-down" refModal={refModal}>

            {value || title}

        </Dropdown>
    )
}