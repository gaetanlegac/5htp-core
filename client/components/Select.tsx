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
    current: ComboboxItem | ComboboxItem[] | null
): ComboboxItem => {

    // Allready a choice
    if (typeof choice === 'object' && choice.label) {
        return choice;
    }

    // Complete list of the choices
    const allChoices = [...choices];
    if (Array.isArray(current))
        allChoices.push(...current);

    // Find the choice
    const found = allChoices.find( c => c.value === choice);
    if (found)
        return found;

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

    const initRef = React.useRef<boolean>();

    const choicesViaFunc = typeof initChoices === 'function';
    if (choicesViaFunc)
        enableSearch = true;
    else 
        initChoices = initChoices?.map( c => ensureChoice(c, [], current) ) || [];

    if (enableSearch)
        props.searchable = true;

    let [choices, setChoices] = React.useState<ComboboxItem[]>( choicesViaFunc 
        ? (Array.isArray(current) 
            ? current.map( c => ensureChoice(c, [], current) )
            : current 
                ? [ensureChoice(current, [], [])]
                : []
        ) || []
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

    const valueToChoice = (value: string) => choices.find(c => c.value === value);

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

        initRef.current = true;

    }, [
        opened,
        search.keywords,
        // When initChoices is a function, React considers it's always different
        // It avoids the choices are fetched everytimle the parent component is re-rendered
        typeof initChoices === 'function' ? true : initChoices
    ]);

    if (multiple) {
        props.value = current ? current.map( c => ensureChoice(c, choices, current).value ) : [];
        props.onChange = (value: string[]) => {
            onChange( value.map(valueToChoice) )
        };
    } else {
        props.value = current ? [ensureChoice(current, choices, current).value] : [];
        props.onChange = (value: string[]) => onChange( value.length > 0 ? valueToChoice( value[value.length - 1] ) : undefined );
        //props.maxValues = 1;
    }   

    /*----------------------------------
    - RENDER
    ----------------------------------*/
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
    
                data={choices}
                nothingFound={search.loading ? 'Loading...' : props || 'No options found'}
                comboboxProps={{
                    withArrow: false
                }}
    
                clearable={!required}
                required={required}
                allowDeselect={!required}
                checkIconPosition="right"
    
                onDropdownOpen={() => setOpened(true)}
                onDropdownClose={() => setOpened(false)}
                onSearchChange={(keywords) => setSearch(s => ({ ...s, keywords }))}
            />
        )
    }
}