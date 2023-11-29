/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

// Core
import { Props as DropdownProps } from '@client/components/dropdown';
import Input from '@client/components/inputv3';

// Specific
import { 
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

export type { Choice } from './ChoiceSelector';

const ChoiceElement = ({ choice, currentList, onChange, multiple, includeCurrent }: {
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
                <span class="badge xs clickable" onClick={() => 
                    onChange( current => current.filter(c => c.value !== choice.value))
                }>
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
    inline, 
    multiple, 
    ...otherProps
}: Props) => {

    /*----------------------------------
    - INIT
    ----------------------------------*/

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

    const [choices, setChoices] = React.useState<Choice[]>( choicesViaFunc ? [] : initChoices );

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
            ? current 
            : [current]
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
    return <>

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

                            {/*!isRequired && (
                                <span class={"badge clickable " + (currentList.length === 0 ? 'bg primary' : '')}
                                    onClick={() => onChange(multiple ? [] : undefined)}>
                                    {noneSelection || 'None'}
                                </span>
                            )*/}

                            {( enableSearch ? currentList : choices ).map( choice => (
                                <ChoiceElement choice={choice} 
                                    currentList={currentList}
                                    onChange={onChange}
                                    multiple={multiple}
                                    includeCurrent 
                                />
                            ))}

                            {enableSearch && (
                                <Input  
                                    placeholder="Type your search here"
                                    value={search.keywords} 
                                    onChange={keywords => setSearch(s => ({ ...s, loading: true, keywords }))} 
                                    inputRef={refInputSearch}
                                />
                            )}    
                        </div>
                    </div>

                </div>

                {displayChoices && (
                    <ul class="row al-left wrap sp-05 pd-1" style={{
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
                )}
                
            </div>
            {errors?.length && (
                <div class="fg error txt-left">
                    {errors.join('. ')}
                </div>
            )}
        </div>

    </>
}