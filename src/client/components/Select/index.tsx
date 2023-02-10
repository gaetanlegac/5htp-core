/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import type { ComponentChild } from 'preact';
import type { StateUpdater } from 'preact/hooks';

// Core
import Button from '@client/components/button';
import String from '@client/components/inputv3/string';
import Dropdown, { TDialogControls, Props as DropdownProps } from '@client/components/dropdown';

/*----------------------------------
- CONST
----------------------------------*/

/*----------------------------------
- TYPES
----------------------------------*/

export type Choice = { label: ComponentChild, value: string }

export type Choices = Choice[]

type ChoicesFunc = (search: string) => Promise<Choices>

type SelectorProps = (
    {
        multiple: true,
        value?: Choice[],
        onChange: StateUpdater<Choice[]>,
        validator?: ArrayValidator
    }
    |
    {
        multiple?: false,
        value?: Choice,
        onChange: StateUpdater<Choice>,
        validator?: StringValidator
    }
) & {
    choices: Choices | ChoicesFunc,
    enableSearch?: boolean,
    inline?: boolean,
    errors?: string[],
    required?: boolean,
    noneSelection?: false | string
}

export type Props = DropdownProps & SelectorProps & {
    title: string,
}

/*----------------------------------
- COMONENT
----------------------------------*/
export default ({ 
    title, choices: initChoices, errors, validator, required, noneSelection, enableSearch, value: current, 
    onChange, inline, multiple,
    ...props 
}: Props) => {

    const refModal = React.useRef<TDialogControls>(null);

    /*----------------------------------
    - INIT
    ----------------------------------*/

    const choicesViaFunc = typeof initChoices === 'function';
    if (choicesViaFunc && enableSearch === undefined)
        enableSearch = true;

    const [search, setSearch] = React.useState<{
        keywords: string,
        loading: boolean
    }>({
        keywords: '',
        loading: choicesViaFunc
    });

    const [choices, setChoices] = React.useState<Choices>([]);

    /*----------------------------------
    - ACTIONS
    ----------------------------------*/
    React.useEffect(() => {
        if (choicesViaFunc) {
            initChoices(search.keywords).then((searchResults) => {
                setSearch(s => ({ ...s, loading: false }))
                setChoices(searchResults);
            })
        }
    }, [initChoices, search.keywords]);

    const currentList: Choice[] = current === undefined
        ? []
        : (Array.isArray(current) ? current : [current]);

    /*----------------------------------
    - RENDER
    ----------------------------------*/

    const selector = (
         <div class={(inline ? '' : 'card ') + "col"}>

            {enableSearch && (
                <String icon="search" 
                    title="Search"
                    value={search.keywords} 
                    onChange={keywords => setSearch(s => ({ ...s, loading: true, keywords }))} 
                    iconR={'spin'}
                />
            )}

            {currentList.length !== 0 && (
                <ul class="col menu">
                    {currentList.map(choice => (
                        <Button size="s" onClick={() => {
                            onChange( current => multiple 
                                ? current.filter(c => c.value !== choice.value)
                                : undefined
                            );
                        }} suffix={<i src="check" class="fg primary" />}>
                            {choice.label}
                        </Button>
                    ))}
                </ul>
            )}

            {choices === null ? (
                <div class="row h-3 al-center">
                    <i src="spin" />
                </div>
            ) : (
                <ul class="col menu">
                    {choices.map( choice => {

                        const isCurrent = currentList.some(c => c.value === choice.value);

                        return !isCurrent && (
                            <li>
                                <Button size="s" onClick={() => {
                                    onChange( current => {
                                        return multiple 
                                            ? [...(current || []), choice] 
                                            : choice
                                    });
                                }}>
                                    {/*search.keywords ? (
                                        <span>
                                        
                                            <strong>{search.keywords}</strong>{choice.label.slice( search.keywords.length )}
    
                                        </span>
                                    ) : */choice.label}
                                </Button>
                            </li>
                        )
                    })}

                    {((!required || !validator?.options.min) && noneSelection) && (
                        <li>
                             <Button size="s" onClick={() => onChange(multiple ? [] : undefined)}
                                 suffix={(current === undefined || (multiple && current.length === 0)) && <i src="check" class="fg primary" />}>
                                {noneSelection}
                            </Button>
                        </li>
                    )}
                </ul>
            )}
        </div>
    )

    return <>
        {inline ? selector : (
            <Dropdown {...props} content={selector} iconR="chevron-down" refModal={refModal}>

                {currentList.length === 0
                    ? title
                    : currentList.map(choice => choice.label).join(', ')}

            </Dropdown>
        )}

        {errors?.length && (
            <div class="fg error txt-left">
                {errors.join('. ')}
            </div>
        )}
    </>
}