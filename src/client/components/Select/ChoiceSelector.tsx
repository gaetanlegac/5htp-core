/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import type { ComponentChild, RefObject } from 'preact';
import type { StateUpdater } from 'preact/hooks';

// Core
import Button from '@client/components/button';
import Input from '@client/components/inputv3';

/*----------------------------------
- TYPES
----------------------------------*/

export type Choice = { label: ComponentChild, value: string }

export type Choices = Choice[]

type ChoicesFunc = (search: string) => Promise<Choices>

export type Props = (
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
    required?: boolean,
    noneSelection?: false | string,
    currentList: Choice[],
    refPopover?: RefObject<HTMLElement>
}

/*----------------------------------
- COMPONENT
----------------------------------*/
/*
    We crezte the ChoiceSelector separately from the Selector component because:
    - we don't want the selector to be rendered before the dropdown content is dhown
    - this component is called multiple time
*/
export default ({
    choices: initChoices, 
    validator, 
    required, 
    noneSelection, 
    enableSearch, 
    value: current, 
    onChange, 
    inline, 
    multiple, 
    currentList,
    refPopover
}: Props) => {

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

    const [choices, setChoices] = React.useState<Choices>( choicesViaFunc ? [] : initChoices );

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

    /*----------------------------------
    - RENDER
    ----------------------------------*/
    return (
        <div class={(inline ? '' : 'card ') + "col al-top"} ref={refPopover}>

           {enableSearch && (
               <Input icon="search" 
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
}