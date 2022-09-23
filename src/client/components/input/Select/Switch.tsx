/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

// Composant de base
import Select, { Props as PropsSelect } from './base';

/*----------------------------------
- TYPES
----------------------------------*/

export type Props = PropsSelect & {
    vertical?: boolean
}

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default ({ vertical, ...props }: Props) => {

    if (!vertical)
        props.elements = {
            forme: 'cube'
        }

    return Select('switch', ({ elems, label, options, selectionner, multiple, element, taille, attrsChamp }, { valeur, state, setState, rendre }) => {
        return rendre(multiple ? (
            <div className="flex">
                <ul className="liste h">
                    {options.filter((option) =>
                        option.value === valeur
                    ).map((option) => element ? element(option, selectionner) : (
                        <li className="badge">
                            {option.label}
                        </li>
                    ))}
                </ul>

                {/* <Popover {...propsPopover}>
                    <Bouton
                        {...propsBtnSelect}
                        taille="s"
                        title="Ajouter une valeur"
                        icone="solid/ellipsis-h"
                    />
                </Popover> */}
            </div>
        ) : (
            <ul className={vertical === true ? 'menu v' : "row fill"}>
                {elems}
            </ul>
        ), { ecraser: 'corpsChamp', attrsChamp });
    })(props)
}
