/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { 
    SelectProps, 
    MultiSelect as MantineMultiSelect, 
    ComboboxItem,
    Menu
} from '@mantine/core';
import Input from '@client/components/Input';

// Core
import { useMantineInput, InputBaseProps } from '@client/components/utils';
import Button, { Props as ButtonProps } from '@client/components/Button';
import Popover, { Props as PopoverProps } from '@client/components/containers/Popover';

/*----------------------------------
- TYPES
----------------------------------*/

export type Props = SelectProps & InputBaseProps<ComboboxItem> & {
    popoverProps?: PopoverProps,
    buttonProps?: ButtonProps,
}

export type Choice = ComboboxItem;

const ensureChoice = (
    choice: ComboboxItem | string, 
    choices: ComboboxItem[],
    current: ComboboxItem[]
): ComboboxItem => {

    // Allready a choice
    if (typeof choice === 'object')
        return choice;

    // Ensure current is an array of choices
    const allChoices = [...choices, ...current];

    // Find the choice
    const found = allChoices.find( c => c.value === choice );
    if (found) return found;

    // Create a new choice
    return {
        label: choice as string,
        value: choice as string
    }
}

/*----------------------------------
- COMONENT
----------------------------------*/
// Adapt the old component to render with mantine text input
// Don't use useInput hook because it's not mantine compatible
export default (initProps: Props) => {

    let [{ 
        icon, iconR, minimal,
        onChange, value: current,
        required
    }, {
        multiple, choices: initChoices, enableSearch, popoverProps, buttonProps,
        ...props
    }] = useMantineInput<Props, string|number>(initProps);

    const currentArray = (Array.isArray(current) 
        ? current 
        : current ? [current] : []
    ).map(c => ensureChoice(c, [], []));

    const choicesViaFunc = typeof initChoices === 'function';
    if (choicesViaFunc)
        enableSearch = true;
    else 
        initChoices = initChoices?.map( c => ensureChoice(c, [], currentArray) ) || [];

    let [choices, setChoices] = React.useState<ComboboxItem[]>( choicesViaFunc 
        ? currentArray.map( c => ensureChoice(c, [], currentArray) )
        : initChoices
    );

    const [opened, setOpened] = React.useState(false);
    const [search, setSearch] = React.useState<{
        keywords: string,
        loading: boolean,
    }>({
        keywords: '',
        loading: !!choicesViaFunc,
    });

    /*----------------------------------
    - ACTIONS
    ----------------------------------*/
    
    // Load search results
    React.useEffect(() => {

        if (choicesViaFunc && opened) {

            const keywords = search.keywords === current?.label 
                ? undefined 
                : search.keywords;

            //setSearch(s => ({ ...s, loading: true }));
            initChoices(keywords).then((searchResults) => {
                //setSearch(s => ({ ...s, loading: false }))
                setChoices(searchResults);
            })
        }

    }, [
        opened,
        search.keywords
    ]);

    // When initChoices is not a function and has changed
    React.useEffect(() => {
        if (!choicesViaFunc) {
            setChoices(initChoices);
        }
    }, [initChoices]);

    /*----------------------------------
    - RENDER
    ----------------------------------*/

    if (multiple) {

        props.value = current 
            ? current.map( c => ensureChoice(c, choices, currentArray).value ) 
            : [];

        props.onChange = (value: string[]) => {
            onChange( value.map(value => ensureChoice(value, choices, currentArray)) )
        };

    } else {

        props.value = current 
            ? [ensureChoice(current, choices, currentArray).value] 
            : [];

        props.onChange = (value: string[]) => {

            setOpened(false);

            onChange( value.length > 0 
                ? ensureChoice(value[value.length - 1], choices, currentArray) 
                : undefined 
            )
        };
    }   

    if (minimal) {
        return (
            <Popover {...(popoverProps || {})} state={[opened, setOpened]} content={(
                <div class="card col menu floating">
                    {enableSearch && <>

                        <Input title="Search" value={search.keywords} 
                            wrapper={false} minimal icon="search"
                            onChange={v => setSearch(s => ({ ...s, keywords: v }))} />

                    </>}

                    {choices.map(choice => {

                        const isSelected = current === undefined ? false : multiple 
                            ? props.value.includes(choice.value)
                            : props.value === choice.value;

                        return (
                            <Button key={choice.value} 
                                size="s"
                                suffix={isSelected ? <i src="check" /> : null}
                                onClick={() => onChange( multiple 
                                    ? (isSelected 
                                        ? current.filter(c => c.value !== choice.value)
                                        : [...(current || []), choice]
                                    )
                                    : ((isSelected && !required) 
                                        ? null 
                                        : choice
                                    )
                                )}>
                                    {choice.label}
                            </Button>
                        )
                    })}
                </div>
            )}>
                <Button
                    {...buttonProps}
                    prefix={(
                        (multiple && current?.length) ? (
                            <span class="badge bg info s">
                                {current.length}
                            </span>
                        ) : icon ? <i src={icon} /> : null
                    )} 
                    suffix={iconR ? <i src={iconR} /> : <i src="angle-down" />} 
                    onClick={() => setOpened((o) => !o)}>
                        
                    {props.label || props.placeholder}

                </Button>
            </Popover>
        )

    } else {
        return (
            <MantineMultiSelect 
                {...props} 
    
                data={[
                    {
                        group: 'Search results',
                        // Exclude the choices that are already selected
                        items: choices.filter(c => !props.value.includes(c.value))
                    },
                    {
                        group: 'Selected',
                        items: currentArray
                    }
                ]}
                nothingFound={search.loading ? 'Loading...' : props || 'No options found'}
                comboboxProps={{
                    withArrow: false
                }}
    
                searchable={enableSearch}
                clearable={!required}
                required={required}
                allowDeselect={!required}
                checkIconPosition="right"
    
                dropdownOpened={opened}
                onDropdownOpen={() => setOpened(true)}
                onDropdownClose={() => setOpened(false)}
                onSearchChange={(keywords) => setSearch(s => ({ ...s, keywords }))}
            />
        )
    }
}