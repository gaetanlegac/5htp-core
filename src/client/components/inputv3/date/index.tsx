/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import type { StateUpdater } from 'preact/hooks';
import DateRangePicker from '@wojtekmaj/react-daterange-picker';

// Core

// App

/*----------------------------------
- TYPES
----------------------------------*/

type TValue = [Date, Date]
export type Props = {
    value: TValue,
    onChange: StateUpdater<TValue>,
    placeholder?: string,
    min?: string,
    max?: string
}

/*----------------------------------
- COMPOSANT
----------------------------------*/
import './react-calendar.less';
import './react-daterange-picker.less';
export default ({ value, Props, min, max, onChange }) => {

    const state = React.useState(false);

    /*----------------------------------
    - CONSTRUCTION CHAMP
    ----------------------------------*/
    
    
    /*----------------------------------
    - RENDU DU CHAMP
    ----------------------------------*/
    return (
        <div>
            <DateRangePicker onChange={onChange} value={value || [null, null]} />
        </div>
    )
}
