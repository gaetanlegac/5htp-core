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

export type Props = DropdownProps & SelectorProps & {
    dropdown: boolean,
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
    onChange, 
    multiple, 
    dropdown,
    ...otherProps
}: Props) => {

    /*----------------------------------
    - INIT
    ----------------------------------*/

    const popoverState = React.useState(false);

    const choicesViaFunc = typeof initChoices === 'function';
    if (choicesViaFunc && enableSearch === undefined)
        enableSearch = true;

    const refInputSearch = React.useRef<HTMLInputElement | null>(null);

    let className: string = 'input select txt-left';

    const [search, setSearch] = React.useState<{
        keywords: string,
        loading: boolean,
        focused: boolean
    }>({
        keywords: '',
        loading: choicesViaFunc,
        focused: true
    });

    const [choices, setChoices] = React.useState<Choice[]>( choicesViaFunc 
        ? [] 
        : initChoices 
    );

    const displayChoices = (
        enableSearch 
        && 
        choices.length !== 0 
        && 
        search.keywords.length !== 0
        &&
        search.focused
    )

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
        if (choicesViaFunc && (search.keywords || !enableSearch)) {
            initChoices(search.keywords).then((searchResults) => {
                setSearch(s => ({ ...s, loading: false }))
                setChoices(searchResults);
            })
        }
    }, [
        search.keywords,
        // When initChoices is a function, React considers it's always different
        // It avoids the choices are fetched everytimle the parent component is re-rendered
        typeof initChoices === 'function' ? true : initChoices
    ]);

    /*----------------------------------
    - RENDER
    ----------------------------------*/

    const SelectedItems = ( enableSearch ? currentList : choices ).map( choice => (
        <ChoiceElement choice={choice} 
            currentList={currentList}
            onChange={onChange}
            multiple={multiple}
            includeCurrent 
        />
    ))

    const Search = enableSearch && (
        <Input  
            placeholder="Type your search here"
            value={search.keywords} 
            onChange={keywords => setSearch(s => ({ ...s, loading: true, keywords }))} 
            inputRef={refInputSearch}
        />
    )

    const SearchResults = displayChoices && (
        <ul class="row al-left wrap sp-05" style={{
            maxHeight: '30vh',
            overflowY: 'auto'
        }}>
            {choices.map( choice => (
                <ChoiceElement choice={choice} 
                    currentList={currentList}
                    onChange={onChange}
                    multiple={multiple}
                />
            ))}
        </ul>
    )

    return dropdown ? (
        <Popover content={(
            <div class="card col" style={{ width: '300px' }}>

                <div class="col">

                    {SelectedItems.length !== 0 && (
                        <div class="row wrap">
                            {SelectedItems}
                        </div>
                    )}

                    {Search} 
                </div>   

                {SearchResults}
            </div>
        )} state={popoverState}>
            <Button icon={icon} iconR="chevron-down" {...otherProps}>
                {title} {(multiple && currentList.length > 0) 
                    ? <span class="badge s bg accent">{currentList.length}</span> 
                    : null
                }
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
                            {SelectedItems} 

                            {Search}  
                        </div>
                    </div>

                </div>

                {SearchResults && (
                    <div class="pd-1">

                        {SearchResults}

                    </div>
                )}
                
            </div>
            {errors?.length && (
                <div class="fg error txt-left">
                    {errors.join('. ')}
                </div>
            )}
        </div>
    )
}