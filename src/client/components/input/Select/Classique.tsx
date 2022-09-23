/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
//import { FixedSizeList as List } from 'react-window';

// Composants généraux
import Popover from '@client/components/containers/Popover';
import Bouton from '@client/components/button';

// Composant de base
import Select, { Props as PropsSelect } from './base';

/*----------------------------------
- TYPES
----------------------------------*/

export type Props = PropsSelect

export type { Choix } from '../Base/Choix';

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default (props: Props) => {
    
    
    return Select('classique', ({ nom, taille, icone, labelActuel, attrsPop, attrsChamp, elems }, { state, setState, rendre }) => {

        const nbElements = elems.length;

        return rendre((
            <Popover
                nom={nom}
                afficher={state.affPopover}
                fermer={() => setState({ affPopover: false })}
                // https://codesandbox.io/s/github/bvaughn/react-window/tree/master/website/sandboxes/fixed-size-list-vertical?file=/index.js
                content={nbElements !== 0 ? (/*nbElements >= 100 ? (
                    <List
                        height={150}
                        itemCount={nbElements}
                        itemSize={35}
                    >
                        {elems}
                    </List>
                ) : */(
                    <ul className="menu v">
                        {elems}
                    </ul>
                )) : (
                    <div className="placeholder-vide">
                        <i src="solid/empty-set" />
                        <span className="label">Aucun résultat</span>
                    </div>
                )}
                interactions={true}
                {...(attrsPop || {})}
                className={'champ' + (attrsPop && attrsPop.className ? ' ' + attrsPop.className : '')}
                onVisibleChange={(afficher: boolean) => {
                    if (!afficher)
                        setState({ rechercher: '' })
                }}
            >
                <Bouton
                    {...attrsChamp}
                    onClick={() => setState({ affPopover: !state.affPopover })}
                    iconeDroite="solid/chevron-down"
                    icone={labelActuel.icone}
                    taille={taille}
                    className="al-left"
                >
                    {labelActuel.label}
                </Bouton>
            </Popover>
        ), { ecraser: 'corpsChamp' });

    })(props)
}
