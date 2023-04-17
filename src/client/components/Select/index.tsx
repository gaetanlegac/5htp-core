/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

// Core
import Dropdown, { TDropdownControl, Props as DropdownProps } from '@client/components/dropdown';
import Input from '@client/components/inputv3';

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

const ChoiceElement = ({ choice, currentList, onChange, multiple, includeCurrent }: {
    choice: Choice,
    currentList: Choice[],
    includeCurrent: boolean
} & Pick<Props, 'onChange'|'multiple'>) => {

    const isCurrent = currentList.some(c => c.value === choice.value);
    if (isCurrent && !includeCurrent) return null;

    return (
        <li class={"badge clickable " + (isCurrent ? 'bg primary' : '')} onClick={() => {
            onChange( current => {
                
                return multiple 
                    ? (isCurrent
                        ? current.filter(c => c.value !== choice.value)
                        : [...(current || []), choice] 
                    )
                    : (isCurrent
                        ? undefined
                        : choice
                    )
            });

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

    const isRequired = required || validator?.options.min;

    const [search, setSearch] = React.useState<{
        keywords: string,
        loading: boolean
    }>({
        keywords: '',
        loading: choicesViaFunc
    });

    const [choices, setChoices] = React.useState<Choice[]>( choicesViaFunc ? [] : initChoices );

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
    }, [initChoices, search.keywords]);

    const currentList: Choice[] = current === undefined
        ? []
        : (Array.isArray(current) 
            ? current 
            : [current]
        );

    /*----------------------------------
    - RENDER
    ----------------------------------*/
    return <>

        <div class="col sp-05">
            <div class={className} onClick={() => refInputSearch.current?.focus()}>
                    
                <div class="row al-left wrap pd-1">
                    
                    {icon !== undefined && (
                        <i src={icon} />
                    )}

                    <div class="col al-left sp-05">
                        
                        <label>{title}{required && (
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

                {(enableSearch && choices.length !== 0 && search.keywords.length !== 0) && (
                    <ul class="row al-left wrap sp-05 pd-1">
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