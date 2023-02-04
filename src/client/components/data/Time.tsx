/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

// Libs
import { timeSince } from '@common/data/dates';

/*----------------------------------
- TYPES: IMPORTATIONS
----------------------------------*/



/*----------------------------------
- TYPES: DECLARATIONS
----------------------------------*/

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default ({ since }: {
    since: Parameters<typeof timeSince>[0]
}) => {

    const [text, setDisplay] = React.useState(timeSince(since));

    React.useEffect(() => {

        const textUpdate = setInterval(() => setDisplay(timeSince(since)), 10000);
        return () => clearInterval(textUpdate);

    }, []);

    return <>{text}</>;

}