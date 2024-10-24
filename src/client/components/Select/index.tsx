/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

// Core
import { Props as DropdownProps } from '@client/components/dropdown';
import { Popover, Button, Input } from '@client/components';

// Specific
import { 
    Props as SelectorProps, 
    Choice,
} from './ChoiceSelector';

import ChoiceElement from './ChoiceElement';

/*----------------------------------
- TYPES
----------------------------------*/

export type Props = SelectorProps & {
    dropdown?: boolean | DropdownProps,
    title: string,
    errors?: string[],
}

export type { Choice } from './ChoiceSelector';

const ensureChoice = (choice: Choice | string, choices: Choice[]): Choice => {

    // Allready a choice
    if (typeof choice === 'object' && choice.label) {
        return choice;
    }

    // Find the choice
    const found = choices.find( c => c.value === choice);
    if (found)
        return found;

    // Create a new choice
    return {
        label: choice,
        value: choice
    }
}

/*----------------------------------
- COMONENT
----------------------------------*/
export default ({ 
    // Input basics
    title, 
    errors,
    icon,
    required,
    validator, 

    // Choice selection
    choices: initChoices, 
    noneSelection, 
    enableSearch, 
    value: current, 
    onChange: onChangeCallback, 
    multiple, 
    dropdown,
    ...otherProps
}: Props) => {

    /*----------------------------------
    - INIT
    ----------------------------------*/

    const popoverState = React.useState(false);

    const choicesViaFunc = typeof initChoices === 'function';
    if (choicesViaFunc)
        enableSearch = true;
    else if (typeof initChoices[0] === 'string')
        initChoices = initChoices.map( c => ({ label: c, value: c }));

    const refInputSearch = React.useRef<HTMLInputElement | null>(null);

    let className: string = 'input select txt-left';

    const [search, setSearch] = React.useState<{
        keywords: string,
        loading: boolean,
        focused: boolean
    }>({
        keywords: '',
        loading: !!choicesViaFunc,
        focused: true
    });

    const [choices, setChoices] = React.useState<Choice[]>( choicesViaFunc 
        ? [] 
        : initChoices 
    );

    const isRequired = required || validator?.options.min;

    const currentList: Choice[] = current === undefined
        ? []
        : (Array.isArray(current) 
            ? current.map( c => ensureChoice(c, choices))
            : [ensureChoice(current, choices)]
        );

    /*----------------------------------
    - ACTIONS
    ----------------------------------*/

    React.useEffect(() => {

        // Fetch choices. If dropdodown, it must be open
        if (choicesViaFunc && (!dropdown || popoverState[0])) {
            initChoices(search.keywords).then((searchResults) => {
                setSearch(s => ({ ...s, loading: false }))
                setChoices(searchResults);
            })
        }

    }, [
        popoverState[0],
        search.keywords,
        // When initChoices is a function, React considers it's always different
        // It avoids the choices are fetched everytimle the parent component is re-rendered
        typeof initChoices === 'function' ? true : initChoices
    ]);

    const onChange = (getValue) => {

        const newValue = getValue(current);
        
        if (onChangeCallback) {
            onChangeCallback(newValue);
        }

        // Close the popover
        if (popoverState[1] && !multiple) {
            popoverState[1](false);
        }
    }

    /*----------------------------------
    - RENDER
    ----------------------------------*/

    const selectedItems = enableSearch ? currentList : []

    const Search = enableSearch && (
        <Input  
            placeholder="Type your search here"
            value={search.keywords} 
            onChange={keywords => setSearch(s => ({ ...s, loading: true, keywords }))} 
            inputRef={refInputSearch}
        />
    )

    return dropdown ? (
        <Popover {...(dropdown === true ? {
            width: '200px'
        } : dropdown)} content={(
            <div class="card bg white col al-top">

                {Search} 

                {selectedItems.length !== 0 && (
                    <ul class="row al-left wrap sp-05">
                        {selectedItems.map( choice => (
                            <ChoiceElement format='badge' choice={choice} 
                                currentList={currentList}
                                onChange={onChange}
                                multiple={multiple}
                                includeCurrent 
                            />
                        ))}
                    </ul>
                )}

                {search.loading ? (
                    <div class="row al-center h-2">
                        <i src="spin" />
                    </div>
                ) : (
                   <ul class="menu col">
                        {choices.map( choice => (
                            <ChoiceElement format='list' choice={choice} 
                                currentList={currentList}
                                onChange={onChange}
                                multiple={multiple}
                                includeCurrent
                            />
                        ))} 
                    </ul>
                )} 
            </div>
        )} state={popoverState}>
            <Button type="secondary" icon={icon} iconR="chevron-down" {...otherProps}>

                {currentList.length === 0 ? <>
                    {title}
                </> : multiple ? <>
                    {title} <span class="badge s bg accent">{currentList.length}</span> 
                </> : <>
                    {currentList[0].label}
                </>}

                {errors?.length && (
                    <div class="bubble bg error bottom">
                        {errors.join('. ')}
                    </div>
                )}

            </Button>
        </Popover>
    ) : (

        <div class="col sp-05">
            <div class={className} onMouseDown={() => refInputSearch.current?.focus()}>
                    
                <div class="row al-left wrap pd-1">
                    
                    {icon !== undefined && (
                        <i src={icon} />
                    )}

                    <div class="col al-left sp-05">
                        
                        <label>{title}{isRequired && (
                            <span class="fg error">&nbsp;*</span>
                        )}</label>

                        <div class="row al-left wrap sp-05">

                            {selectedItems.map( choice => (
                                <ChoiceElement format='badge' choice={choice} 
                                    currentList={currentList}
                                    onChange={onChange}
                                    multiple={multiple}
                                    includeCurrent 
                                />
                            ))} 

                            {Search}  
                        </div>
                    </div>

                </div>

                <div class="pd-1">
                    <ul class="row al-left wrap sp-05" style={{
                        maxHeight: '30vh',
                        overflowY: 'auto'
                    }}>
                        {choices.map( choice => (
                            <ChoiceElement format='badge' choice={choice} 
                                currentList={currentList}
                                onChange={onChange}
                                multiple={multiple}
                                includeCurrent
                            />
                        ))}
                    </ul>
                </div>
                
            </div>
            {errors?.length && (
                <div class="bubble bg error bottom">
                    {errors.join('. ')}
                </div>
            )}
        </div>
    )
}