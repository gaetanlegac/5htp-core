/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React, { JSX } from 'react';
import { ComponentChild } from 'preact';

// Composants
import Bouton, { Props as PropsBouton } from '@client/components/button';

// Ressouces
//import '@client/components/Donnees/Tooltip/index.less';

// Libs
import getPosition, { TSide } from './getPosition';
import { blurable, deepContains } from '@client/utils/dom';
import useContexte from '@/client/context';

/*----------------------------------
- TYPES
----------------------------------*/

export type Props = {
    id?: string,

    children: JSX.Element | [JSX.Element],
    afficher?: boolean,
    fermer?: (funcFermer: () => void) => void,
    position?: TSide,
    frame?: HTMLElement,

    content?: JSX.Element,
    menu?: { actions: TAction<any>[], data: any },

    tag?: string,
    width?: number | string,
    desactiver?: boolean
}

export type TAction<TDonnee> = {
    icone?: TIcons,
    label: ComponentChild,
    multi?: boolean,

    onClick?: (donnees: TDonnee, index: number) => void,
    lien?: (donnees: TDonnee, index: number) => string,
    bouton?: (donnees: TDonnee, index: number) => PropsBouton
}

export type TActionsPopover = {
    show: () => void,
    hide: () => void,
    toggle: () => void
}

/*----------------------------------
- COMPOSANT
----------------------------------*/
import "./popover.less";
export default (props: Props) => {

    const ctx = useContexte();

    let {
        id,
        children, content, menu, tag, width, onVisibleChange, interactions, desactiver, fermer, frame,
        position, afficher,
        ...autresProps
    } = props;

    const [state, setState] = React.useState({
        aff: false,
        position: undefined
    });

    const refCont = React.useRef<HTMLElement>(null);
    const refPop = React.useRef<HTMLElement>(null);

    const controleViaProps = 'afficher' in props;
    if (!controleViaProps) {
        afficher = state.aff;
        fermer = () => setState((stateA) => ({ ...stateA, aff: false }));
    }

    // L'assignement d'un id à une popover permet de controler l'affichage de ce dernier depuis n'importe quel autre composant
    if (id !== undefined) {
        ctx.popovers[ id ] = {
            show: () => setState(s => ({ ...s, aff: true })),
            hide: () => setState(s => ({ ...s, aff: false })),
            toggle: () => setState(s => ({ ...s, aff: !s.aff })),
        }
    }

    // Màj visibilite
    React.useEffect(() => {
        if (afficher === true) {

            // Positionnement si affichage
            setState((stateA) => ({
                ...stateA,
                position: getPosition(
                    refCont.current, 
                    refPop.current, 
                    false, 
                    position, 
                    frame || document.getElementById('page')
                )
            }));

            const isPageElement = deepContains([document.getElementById('page')], refPop.current);
            if (!isPageElement)
                document.body.classList.add('focus-popup');

        } else {
             
            document.body.classList.remove('focus-popup');

        }

        if (onVisibleChange)
            onVisibleChange(afficher);

        if (afficher === true)
            return blurable([refCont, () => fermer()])

    }, [afficher]);

    if (!autresProps.className)
        autresProps.className = '';

    autresProps.className += ' contPopover';

    const active = afficher && !desactiver;
    if (active) {
        autresProps.className += ' active';
    }

    /*if (props.nom === 'destType')
        console.log('AFFICHER POPOVER', afficher, 'controleViaProps', controleViaProps, 'autresProps.className', autresProps.className);*/

    const Tag = tag || 'div';

    if (!Array.isArray( children ))
        children = [children];

    if (menu !== undefined)
        content = (
            <ul className="menu v">
                {menu.actions.map(({ multi, bouton, lien, label, icone, onClick }: TAction<TDonnee>) => (
                    <li>
                        <Bouton
                            {...(bouton ? (multi
                                ? bouton([menu.data], [menu.index])
                                : bouton(menu.data, menu.index)
                            ) : {})}
                            icone={icone}
                            onClick={onClick && (() => multi 
                                ? onClick([menu.data], [menu.index])
                                : onClick(menu.data, menu.index)
                            )}
                            lien={lien && lien(menu.data, menu.index)}
                            forme="lien"
                        >
                            {label}
                        </Bouton>
                    </li>
                ))}
            </ul>
        )

    return (
        <Tag
            style={{
                position: 'relative',
                ...(afficher ? {
                    zIndex: 11
                } : {})
            }}
            ref={(ref: any) => {
                if (ref !== null)
                    refCont.current = ref;
            }}
            {...autresProps}
        >
            {controleViaProps
                ? children // Les events de clic sont controlés par les props afficher et fermer
                : children.map(child => React.cloneElement(child, {
                    onClick: () => {
                        const nouvEtat = !afficher;

                        setState({ aff: nouvEtat, position: state.position });
                    },
                }))}

            {active && React.cloneElement(content, {
                className: (content.props.className || '') + ' card white popover' + (state.position ? ' pos_' + state.position.cote : ''),
                onClick: () => {
                    if (fermer && !interactions)
                        fermer();
                },
                ref: (ref: any) => {
                    if (ref !== null)
                        refPop.current = ref
                },
                style: {
                    ...(content.props.style || {}),
                    ...(state.position ? {
                        top: state.position.css.top,
                        left: state.position.css.left,
                        right: state.position.css.right,
                        bottom: state.position.css.bottom,
                    } : {}),
                    ...(width !== undefined ? { width: typeof width === 'number' ? width + 'rem' : width } : {})
                }
            })}
        </Tag>
    )
}
