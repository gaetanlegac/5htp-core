/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { ComponentChild } from 'preact';

// Composants généraux
import Champ from '../Base';
import Bouton from '@client/components/button';
import Checkbox from '@client/components/input/Checkbox';

// Libs
import genChoix, { Choix, Option } from '../Base/Choix';

/*----------------------------------
- TYPES: IMPORTATIONS
----------------------------------*/

import { Props as PropsPopover } from '@client/components/containers/Popover';
import { Props as PropsBouton } from '@client/components/button';

/*----------------------------------
- TYPES: DÉFINITIONS
----------------------------------*/
const valeurDefaut = [] as [];
type TValeurDefaut = typeof valeurDefaut;
type TValeurOut = string[];

export type Props = {
    valeur: string[],
    choix?: Choix,

    saisie?: boolean,

    // Afficage
    multiple?: boolean,
    txtAucun?: string,

    // Attributs
    elements?: Partial<PropsBouton>,
    attrsPop?: Partial<PropsPopover>,
    attrsListe?: {[cle: string]: any},
}

type TBuilder = ({ valeur, props, state, setState, rendre }: { elems, label }) => ComponentChild

type TTypeSelect = 'classique' | 'switch'

/*----------------------------------
- COMPOSANT
----------------------------------*/
import './index.less';
export default (type: TTypeSelect, build: TBuilder) => Champ<Props, TValeurDefaut, TValeurOut>('select', {
    saisieManuelle: false, 
    // Converti les valeurs simples en multiples
    transformer: {
        in: (val: TValeur | TValeur[]) => {
            if (val === undefined)
                return []
            else if (typeof val === 'object')
                return val;
            else
                return [val]
        },
        out: (val: TValeur[]) => multiple ? val : val[0]
    },
    valeurDefaut
}, (props, { valeur, state, setState }, rendre) => {

    const {
        // Attributs champs
        opt, titre, icone, readOnly,
        // Attributs select
        choix, saisie, multiple, txtAucun, attrsPop, attrsListe,
        // Attributs élements
        elements
    } = props;

    const [rechercher, setRecherche] = React.useState<string>('');
    const [affPopover, setAffPopover] = React.useState<boolean>(false);

    let options = choix ? genChoix(choix) : [];

    const elemAucun = {
        label: opt !== true ? titre : (txtAucun === undefined ? 'None' : txtAucun),
        icone: icone || /* @icone */'empty-set',
        value: undefined
    }

    if (opt === true)
        options.unshift(elemAucun);

    // Créé le label
    let labelActuel: { icone?: ComponentChild, label: ComponentChild };
    if (valeur.length === 0)
        labelActuel = elemAucun;
    else if (valeur.length === 1) {

        // Recherche informations option si existante
        const elemA = options.find((opt: any) => opt.value === valeur[0]);

        // L'option peut ne pas exister quand // tags et saisie = true
        if (elemA === undefined)
            labelActuel = { label: valeur[0] }
        else
            labelActuel = { icone, ...elemA };

    } else {

        labelActuel = {
            label: valeur.map((val: TValeur) => {
                const optionActuelle = options.find((opt: any) => opt.value === val);
                return optionActuelle ? optionActuelle.label : null;
            }).join(', '),
            icone: icone || /* @icone */'tag'
        }

        /*if (typeof labelActuel.label === 'string' && labelActuel.label.length >= 30)
            labelActuel.label = <>{titre} <span className="badge">{valeur.length}</span></>;*/
    }

    if (readOnly) {
        return rendre(labelActuel.label, {});
    }

    // Gestion du toggle et de la sélection mulltiple
    const selectionner = (nouvelleValeur: TValeur) => {

        //console.log("SELECTIONNER", nom, valeur);

        // valeur = undefined = Aucun
        if (nouvelleValeur === undefined)
            setAffPopover(false);
        // Une valeur unique
        else if (!multiple) {
            setAffPopover(false);
            setState({ valeur: [nouvelleValeur] });
        // Multi: Déselection
        } else if (valeur.includes(nouvelleValeur))
            setState({ valeur: valeur.filter((val: TValeur) => val !== nouvelleValeur) })
        // Multi: Ajout
        else
            setState({ valeur: [...valeur, nouvelleValeur] });
    }

    let elems = [];
    for (const { label, value, ...attrsBouton } of options) {

        // Recherche
        if (rechercher && !label.toLowerCase().startsWith(rechercher.toLowerCase()))
            continue;

        // Actif
        const elemActif = (
            (value === undefined && valeur.length === 0)
            ||
            valeur.includes(value)
        )

        // Rendu
        elems.push((multiple && value !== undefined) ? (
            <li>
                <Checkbox
                    valeur={elemActif}
                    onChange={(active: boolean) => active === true
                        ? setState({ valeur: [...valeur, value] })
                        : setState({ valeur: valeur.filter((val: TValeur) => val !== value) })
                    }
                    {...(elements || {})}
                >
                    {label}
                </Checkbox>
            </li>
        ) : (
            <li>
                <Bouton
                    className={elemActif ? 'active' : ''}
                    onClick={() => selectionner(value)}
                    {...(elements || {})}
                    {...attrsBouton}
                >
                    {label}
                </Bouton>
            </li>
        ));
    }

    return build({ ...props, elems, selectionner, labelActuel, options }, { valeur, props, state, setState, rendre });

});
