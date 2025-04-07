/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { 
    SelectProps, 
    MultiSelect as MantineMultiSelect, 
    ComboboxItem,

    Menu,
    Button
} from '@mantine/core';
import Input from '@client/components/Input';

// Core
import { useMantineInput, InputBaseProps } from '@client/components/utils';

/*----------------------------------
- TYPES
----------------------------------*/

export type Props = SelectProps & InputBaseProps<ComboboxItem> & {
    
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

    // Find the choice
    const found = [...choices, ...current].find( c => c.value === choice );
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
        multiple, choices: initChoices, enableSearch,
        ...props
    }] = useMantineInput<Props, string|number>(initProps);

    const currentArray = Array.isArray(current) ? current : current ? [current] : [];

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
        search.keywords,
        // When initChoices is a function, React considers it's always different
        // It avoids the choices are fetched everytimle the parent component is re-rendered
        typeof initChoices === 'function' ? true : initChoices
    ]);

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
            <Menu width={300} opened={opened} onChange={setOpened} 
                trapFocus withArrow shadow='lg' 
                closeOnItemClick={!multiple}>
                <Menu.Target>
                    <Button variant="subtle" 
                        leftSection={(
                            (current && multiple) ? (
                                <span class="badge bg info s">
                                    {current.length}
                                </span>
                            ) : null
                        )} 
                        rightSection={<i src="angle-down" />} 
                        onClick={() => setOpened((o) => !o)} >
                            
                        {props.label || props.placeholder}

                    </Button>
                </Menu.Target>
                <Menu.Dropdown>

                    {enableSearch && <>
                        <Input title="Search" value={search.keywords} 
                            wrapper={false} minimal icon="search"
                            onChange={v => setSearch(s => ({ ...s, keywords: v }))} />

                        <Menu.Divider />
                    </>}

                    {choices.map(choice => {

                        const isSelected = current === undefined ? false : multiple 
                            ? props.value.includes(choice.value)
                            : props.value === choice.value;

                        return (
                            <Menu.Item key={choice.value} 
                                rightSection={isSelected ? <i src="check" /> : null}
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
                            </Menu.Item>
                        )
                    })}
                </Menu.Dropdown>
            </Menu>
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