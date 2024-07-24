/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { VNode, RefObject,ComponentChild } from 'preact';

// Core
import { history } from '@client/services/router/request/history';
import useContext from '@/client/context';

/*----------------------------------
- TYPES
----------------------------------*/

export type Props = {

    id?: string,
    refElem?: RefObject<HTMLElement>,

    icon?: TIcons | ComponentChild,
    iconR?: ComponentChild,

    prefix?: ComponentChild,
    children?: ComponentChild,
    suffix?: ComponentChild,
    
    tag?: "a" | "button",
    type?: 'guide' | 'primary' | 'secondary' | 'link',
    shape?: 'default' | 'icon' | 'tile' | 'pill',
    size?: TComponentSize,
    class?: string,

    state?: [string, React.StateUpdater<string>],
    active?: boolean,
    disabled?: boolean,
    loading?: boolean,
    autoFocus?: boolean,
    onClick?: (e: MouseEvent) => any,
    async?: boolean,

    submenu?: ComponentChild,
    nav?: boolean | 'exact'

} & (TButtonProps | TLinkProps)

export type TButtonProps = {
    
}

export type TLinkProps = {
    link: string, // Link
    target?: string,
}

/*----------------------------------
- HELPERS
----------------------------------*/
const trimSlash = (str: string): string => {
    return str.endsWith('/') ? str.slice(0, -1) : str;
}

const isCurrentUrl = (currentUrl: string, url: string, exact?: boolean) => {
    return (
        (exact && (url === currentUrl || trimSlash(url) === currentUrl))
        ||
        (!exact && currentUrl.startsWith(url))
    )
}

/*----------------------------------
- CONTROLEUR
----------------------------------*/
export default ({

    id,

    // Content
    icon, prefix, 
    children, 
    iconR, suffix,
    submenu,
    nav,

    // Style
    class: className,
    shape,
    size,
    type,

    // Interactions
    active,
    state: stateUpdater,
    disabled,
    loading,
    //autoFocus,
    async,

    // HTML attributes
    tag: Tag,
    refElem,
    ...props

}: Props) => {

    const ctx = useContext();
    let [isActive, setIsSelected] = React.useState(false);
    const [isLoading, setLoading] = React.useState(false);

    if (isLoading || loading) {
        icon = <i src="spin" />
        iconR = undefined;
        disabled = true;
    }

    if (stateUpdater && id !== undefined) {
        const [active, setActive] = stateUpdater;
        if (id === active)
            isActive = true;
        props.onClick = () => setActive(id);
    }

    // Shape classes
    className = className === undefined ? 'btn' : 'btn ' + className;

    if (shape !== undefined) {
        if (shape === 'tile')
            className += ' col';
        else
            className += ' ' + shape;
    }

    if (size !== undefined)
        className += ' ' + size;

    if (type === 'secondary')
        className += ' bg white';
    if (type !== undefined)
        className += type === 'link' ? type : (' bg ' + type);

    if (icon) {
        if (children === undefined)
            className += ' icon';
    }

    // state classes
    const [isMouseDown, setMouseDown] = React.useState(false);
    props.onMouseDown = () => setMouseDown(true);
    props.onMouseUp = () => setMouseDown(false);
    props.onMouseLeave = () => setMouseDown(false);
    if (isMouseDown)
        className += ' pressed';

    if (active || isActive === true)
        className += ' active';

    // Icon
    if (prefix === undefined && icon !== undefined)
        prefix = typeof icon === "string" ? <i class={"svg-" + icon} /> : icon;
    if (suffix === undefined && iconR !== undefined)
        suffix = typeof iconR === "string" ? <i class={"svg-" + iconR} /> : iconR;

    // Render
    if ('link' in props || Tag === "a") {

        props.href = props.link;
        
        // External = open in new tab by default
        if (props.href && (props.href[0] !== '/' || props.href.startsWith('//')))
            props.target = '_blank';

        if (props.target === undefined) {

            if (nav) {

                const checkIfCurrentUrl = (url: string) => 
                    isCurrentUrl(url, props.link, nav === 'exact');

                React.useEffect(() => {

                    // Init
                    if (checkIfCurrentUrl(ctx.request.path))
                        setIsSelected(true);

                    // On location change
                    return history?.listen(({ location }) => {

                        setIsSelected( checkIfCurrentUrl(location.pathname) );
    
                    })

                }, []);
            }

        }

        Tag = 'a';

    } else {
        Tag = 'button';

        // Avoid to trigget onclick when presing enter
        if (type !== 'primary')
            props.type = 'button';
        else
            props.type = 'submit';
    }

    let render: VNode = (
        <Tag {...props} id={id} class={className} disabled={disabled} ref={refElem} onClick={(e: MouseEvent) => {

            // annulation si:
            // - Pas clic gauche
            // - Event annulé
            if (e.button !== 0)
                return;

            // Disabled
            if (disabled)
                return false;

            // Link
            let nativeEvent: boolean = false;
            if ('link' in props) {

                // Nouvelle fenetre = event par defaut
                if (props.target === '_blank') {

                    nativeEvent = true;

                // Page change = loading indicator
                } else if (props.target === "_self") {

                    setLoading(true);
                    window.location.href = props.link;

                } else {

                    history?.push(props.link);
                }
            }

            // Custom event
            if (props.onClick !== undefined) {

                const returned = props.onClick(e);
                if (async && returned?.then) {
                    setLoading(true);
                    returned.finally(() => setLoading(false));
                }
            }

            if (!nativeEvent) {
                e.preventDefault();
                return false;
            }       
        }}>
            {prefix}
            {children && (
                <span class={"label"}>
                    {children}
                </span>
            )}
            {suffix}
        </Tag>
    )

    if (Tag === "li" || submenu) {
        render = (
            <li>
                {render}
                {submenu}
            </li>
        )
    }

    return render;
}