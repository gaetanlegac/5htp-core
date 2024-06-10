/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { ComponentChild } from 'preact';

// Libs
import { timeSince, TDateInfo } from '@common/data/dates';

/*----------------------------------
- TYPES
----------------------------------*/
export type { TDateInfo } from '@common/data/dates';

export const interval = {
    day: 24 * 60 * 60,
    hour: 60 * 60,
    minute: 60,
    second: 1
}

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default ({ since, render }: {
    since: Parameters<typeof timeSince>[0],
    render?: (dateInfo: TDateInfo) => ComponentChild
}) => {

    const [time, setTime] = React.useState<TDateInfo | null>( timeSince(since) );

    React.useEffect(() => {

        const textUpdate = setInterval(() => setTime(timeSince(since)), 10000);
        return () => clearInterval(textUpdate);

    }, []);

    return <>{time === null ? "?" : render ? render(time) : time.text}</>;

}