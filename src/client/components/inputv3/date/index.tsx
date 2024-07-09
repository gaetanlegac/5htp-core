/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import DateRangePicker, { DateTimePickerProps } from 'react-datetime-picker';

// Core

// App

/*----------------------------------
- TYPES
----------------------------------*/

type TValue = [Date, Date]
export type Props = DateTimePickerProps & {
    //value: TValue,
    //onChange: StateUpdater<TValue>,
    placeholder?: string,
    min?: string,
    max?: string
}

/*----------------------------------
- COMPOSANT
----------------------------------*/
import './DateTimePicker.css';
import './Calendar.css';
import './Clock.css';
export default ({ value, Props, min, max, onChange, ...otherProps }) => {

    const state = React.useState(false);

    /*----------------------------------
    - CONSTRUCTION CHAMP
    ----------------------------------*/
    
    
    /*----------------------------------
    - RENDU DU CHAMP
    ----------------------------------*/
    return (
        <div>
            <DateRangePicker {...otherProps} onChange={onChange} value={value || [null, null]} />
        </div>
    )
}
