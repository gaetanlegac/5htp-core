/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

import Popover from '@client/components/Conteneurs/Popover';
import Bouton from '@client/components/button';

// Composant de base
import Select, { Props as PropsSelect } from './base';

/*----------------------------------
- TYPES
----------------------------------*/

export type Props = PropsSelect

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default Select('liste', ({ elems, options, nom, multiple, taille, attrsPop, attrsListe, attrsChamp, saisie }, { valeur, state, setState, rendre }) => {

    return rendre((
        multiple ? (
            <div className="contChamps">

                <Popover
                    nom={nom}
                    afficher={state.affPopover}
                    fermer={() => setState({ affPopover: false })}
                    content={elems.length ? (
                        <ul
                            className={"menu v" + (taille ? ' ' + taille : '')}
                            {...(attrsListe || {})}
                        >
                            {elems}
                        </ul>
                    ) : (
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
                    <input
                        type="text"
                        {...attrsChamp}
                        value={state.rechercher}
                        onChange={(e) => setState({ rechercher: e.target.value })}
                        onFocus={(e) => {

                            if (!saisie)
                                setState({ affPopover: true })

                            if (attrsChamp.onFocus)
                                attrsChamp.onFocus(e);
                        }}
                        className="champ texte"
                        onKeyDown={(e: KeyboardEvent) => {
                            if (saisie && e.key === 'Enter' && state.rechercher) {

                                // Verif si valeur pas déjà existante
                                if (!valeur.includes(state.rechercher))
                                    setState({
                                        rechercher: '',
                                        valeur: [...valeur, state.rechercher]
                                    });
                                else
                                    setState({ rechercher: '' });
                            }
                        }}
                    />
                </Popover>

                {valeur.length !== 0 && (
                    <ul className="champ tags">

                        {/*(valeur.length === 0 && !requis) ? (
                            <li className="tag">
                                {txtAucun}
                            </li>
                        ) : */valeur.map((v) => {

                            // Récupère l'option depuis la valeur si elle est existante
                            // Sinon, créé une option via cette valeur
                            const option = options.find((o) => o.value === v) || {
                                label: v,
                                value: v
                            };

                            return (
                                <li className="tag">

                                    {option.icone && (
                                        typeof option.icone === 'string'
                                            ? <i src={option.icone} />
                                            : option.icone
                                    )}
                                    {option.label}

                                    <Bouton icone="solid/times" taille="xs" className="retirer" onClick={
                                        () => setState({
                                            valeur: valeur.filter((v) => v !== option.value)
                                        })
                                    } />
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>
        ) : "Affichage tags seulement compatible avec l'option multiple."
    ), { ecraser: 'corpsChamp' });
});
