/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Core
import useContext from '@client/context';

/*----------------------------------
- TYPES
----------------------------------*/
export type Props = {
    id?: string,
    focus?: boolean,
    jail?: boolean,
    error?: boolean,

    title: string,
    subtitle: string,
}

/*----------------------------------
- HOOK
----------------------------------*/
export default ({ id, title, subtitle, focus, jail, error }: Props) => {

    let { page } = useContext();

    // page est supposé ne pas être undefined
    if (!page)
        return;

    const fullTitle = title + ' | ' + subtitle;

    page.bodyId = page.bodyId || id || '';
    page.title = fullTitle;

    if (focus)
        page.bodyClass.add('focus');

    if (jail)
        page.bodyClass.add('jail');
    
}