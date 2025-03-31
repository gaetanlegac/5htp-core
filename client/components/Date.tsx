/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import '@mantine/dates/styles.css';
import { DateTimePicker, DateTimePickerProps } from '@mantine/dates';

// Core

// App

/*----------------------------------
- TYPES
----------------------------------*/

export type Props = DateTimePickerProps;

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default ({ ...props }: Props) => {
    return (
        <DateTimePicker {...props} />
    )
}
