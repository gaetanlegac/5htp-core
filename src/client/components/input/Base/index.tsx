/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { ComponentChild, ComponentProps } from 'preact';
//import { RefObject } from 'preact';

// Composants généaux
import Bouton, { Props as TPropsBouton } from '@client/components/button';

/*----------------------------------
- TYPES PROPS
----------------------------------*/

// Egalement utilisé pour les infos des schémas de formulaire
export type TOptsChamp<TValeur> = {

    titre?: ComponentChild,
    label?: boolean, // false pour masquer le label
    suffixeLabel?: ComponentChild,
    aide?: string,

    icone?: TIcons,
    prefixe?: ComponentChild,
    suffixe?: ComponentChild,

    // Attributs
    attrsChamp?: { [cle: string]: any },
    attrsContChamp?: ComponentProps<"div">,

    // Traitement valeur
    opt?: true,
    as?: string[], // Mapping personnalisé
    // Executé après le validateur propre au type
    valider?: (val: TValeur, formData?: unknown) => Promise<TValeur>,
}

export type TBasePropsChamp<TValeur, TValeurDefaut, TValeurOut> = TOptsChamp<TValeur> & {

    // onChange est async car les validateurs le sont aussi
    onChange?: (valeur: TValeurOut) => Promise<void>,
    valeur: TValeur | TValeurDefaut,
    readOnly?: boolean,
    // Si on doit afficher un indicateur de chargement à chaque modif de valeur 
    //  ex: lorsque le onOhange lance une requete api, comme c'est le cas pour les switch de status
    async?: boolean,

    // Présentation
    pur?: boolean,
    autoFocus?: boolean,
    size?: TComponentSize,
    className?: string,

    pied?: ComponentChild,
    boutons?: TPropsBouton[] | false, // False = on désactive même les boutons par défaut (ex: <Number />)
    erreurs?: string[], // sera converti en status
    status?: ComponentChild | false,
    vide?: string, // Erreur quand vide et requis

    // A implémenter ?
    /*refChamp?: RefObject<HTMLInputElement>,
    disabled?: boolean,*/
}

/*----------------------------------
- AUTRES TYPES
----------------------------------*/

export const propsDefautChampForm = {
    label: true
}

type TBaseState<TValeur> = {
    valeur: TValeur,
    erreurs: string[],
    focus: boolean,
    chargement: boolean
}

type TOptsRendu = {
    ecraser?: true | 'corpsChamp'
}

type TFuncRendu<TBasePropsChamp> = (composant: ComponentChild, propsRendu: Partial<TBasePropsChamp> & TOptsRendu) => React.JSX.Element

/*----------------------------------
- COMPOSANT
----------------------------------*/
// NOTE: Certaines configurations ont été retirées, car elles sont maitnenant déterminées automatiquement
// TValeur est déterminé via TPropsChamp
// config.valeurDefaut est déterminé via le state initial du champ
export default <TPropsChamp extends { valeur: unknown }, TValeurDefaut, TValeurOut>(
    type: string,
    config: {
        saisieManuelle?: boolean,
        valeurDefaut: TValeur,
        transformer?: {
            in: (val: TValeurOut) => TValeur,
            out: (val: TValeur) => TValeurOut
        },
    },
    // Met à disposition, au sein du composant du champ, les outils nécessaires au rendu du champ
    build: (
        props: TPropsChamp & TBasePropsChamp<TPropsChamp["valeur"], TValeurDefaut, TValeurOut>,
        { valeur, state, setState }: {
            valeur: TPropsChamp["valeur"],
            state: TBaseState,
            setState: (state: TBaseState) => void
        },
        rendre: TFuncRendu<TBasePropsChamp<TPropsChamp["valeur"], TValeurDefaut, TValeurOut>>
    ) => React.JSX.Element
) => (
    // Props initiales passées à l'instanciation du composant du champ
    propsInit: TPropsChamp & TBasePropsChamp<TPropsChamp["valeur"], TValeurDefaut, TValeurOut>
) => {

    // Empêche problèmes de référence
    // Exemple: doublons className quand changement state
    const { ...props } = propsInit;

    const refChamp = React.useRef<HTMLInputElement>(null);
    //const onglet = React.useContext(ContexteOnglets);

    type TValeur = TPropsChamp["valeur"];
    type TPropsCompletes = TPropsChamp & TBasePropsChamp<TPropsChamp["valeur"], TValeurDefaut, TValeurOut>

    /*----------------------------------
    - COMPLETION ATTRIBUTS
    ----------------------------------*/

    // -------- Conteneur Champ --------
    if (props.attrsContChamp === undefined) props.attrsContChamp = {}
    const classeContChamp: string[] = ['contChamp col'];

    if (props.attrsContChamp.className !== undefined)
        classeContChamp.push(props.attrsContChamp.className);

    if (props.className !== undefined)
        classeContChamp.push(props.className);

    // Indicateurs d'état
    classeContChamp.push(type);

    if (props.size !== undefined)
        classeContChamp.push(props.size);

    if (props.opt === true)
        classeContChamp.push('opt');
    if (props.erreurs !== undefined && props.erreurs.length !== 0)
        classeContChamp.push('erreur');

    // ------------- Champ -------------
    if (props.attrsChamp === undefined) props.attrsChamp = {}
    const classeChamp: string[] = ['champ'];

    if (props.attrsChamp.className !== undefined)
        classeChamp.push(props.attrsChamp.className);

    if (props.pur === true)
        classeChamp.push('pur');

    // Placeholder
    if (!props.attrsChamp.placeholder) {
        if (props.aide && typeof props.aide === 'string')
            props.attrsChamp.placeholder = props.aide;
        else if (props.titre && typeof props.titre === 'string')
            props.attrsChamp.placeholder = props.titre;
    }

    /*----------------------------------
    - ETAT
    ----------------------------------*/
    // - Initialise le state
    // - Complète les props selon le state
    // - Ajoute les events

    // Le type de la valeur est spécifié via TBasePropsChamp["valeur"]
    type TState = {
        valeur: TValeur,
        erreurs: string[],
        focus: boolean,
        chargement: boolean // Lorsque onChange est async
    };

    const valeurInit = ('valeur' in props)
        ? (config.transformer ? config.transformer.in(props.valeur) : props.valeur)
        : config.valeurDefaut

    const lastCommitedValue = React.useRef(valeurInit);
    
    const [state, setWholeState] = React.useState<TState>({
        erreurs: [],
        focus: false,
        chargement: false,

        // Valeur initiale = via props si disponible, sinon valeur par défaut
        valeur: valeurInit
    });

    // Propagation valeur controlée => state
    React.useEffect(() => {

        if (props.valeur !== state.valeur)
            setState({ valeur: props.valeur });

    }, [props.valeur]);

    const setState = async (newState: Partial<TState> | ((sA: TState) => Partial<TState>), commitNow: boolean = false) => {

        // Via fonction
        if (typeof newState === 'function')
            newState = newState(state);

        // Màj valeur
        if ('valeur' in newState) {

            // Transformation en entrée
            if (config.transformer !== undefined)
                newState.valeur = config.transformer.in(newState.valeur);

            // Pas de saisie manuelle = validation immédiate
            if (commitNow || config.saisieManuelle !== true) {

                // Etat de chargement pour la validation
                if (props.async)
                    setWholeState((stateA) => ({ ...stateA, chargement: true }))

                newState = {
                    ...newState,
                    ...(await commitValue(newState.valeur))
                }

                newState.chargement = false;
            }

        }

        // Màj state
        setWholeState((stateA) => ({
            ...stateA,
            ...newState
        }))
    };

    // Champ indépendant = valeur reposant sur le state
    const valeurControlee = 'valeur' in props;
    if (!valeurControlee) {

        props.erreurs = [
            ...(state.erreurs || []),
            ...(props.erreurs || [])
        ]
    } 

    // Actions lorsque la aisie est terminée
    // - Validation & correction
    // - Onchange (ex: màj données form)
    async function commitValue(valeur: TValeur): Promise<Partial<TState>> {

        if (valeur === lastCommitedValue.current) {
            console.log('[form][commit] Inchangé');
            return {};
        }

        let erreurs: string[] = []

        console.log('[form] Commit changes');

        // Validation si des validateurs son spécifiés et qu'on demande leur execution
        // ATTTENTION: Lorsque le champ appartient à un form, valider = undefined et sa validation a lieue VIA LE FORM
        if (props.valider !== undefined) {
            try {
                valeur = await props.valider(valeur);
            } catch (error) {
                erreurs.push(error.message)
            }
        }

        // onChange spécifique au composant
        // Ex: passage des données au form
        if (props.onChange !== undefined)
            try {
                const valeurSortie = config.transformer ? config.transformer.out(valeur) : valeur;
                // Si valeur saisie au clavier on ne valide pas à chaque frappe (performances + correction frustrante)
                await props.onChange(valeurSortie);
            } catch (e) {
                erreurs.push(e.message)
                console.error("Erreur via onChange", e.message);
            }

        lastCommitedValue.current = valeur;

        return { erreurs, valeur }
    }

    /*----------------------------------
    - COMPLETION ATTRIBUTS
    ----------------------------------*/
    /*if (state.focus === true)
        classeContChamp.push('focus');*/

    props.attrsChamp.ref = refChamp;

    const commitCurrentValue = async () => {

        // Si on ne valide & corrige pas après chaque onchange, on le fait uniquement après onBlur
        const newState = await commitValue(state.valeur);
        setWholeState((stateA) => ({
            ...stateA,
            ...newState
        }))

        return newState.valeur;

    }

    // Events
    /*if (config.saisieManuelle === true)
        props.attrsChamp.onBlur = commitCurrentValue*/

    /*----------------------------------
   - PREPARATION RENDU
   ----------------------------------*/

    // Finalisation classnames
    props.attrsContChamp.className = classeContChamp.join(' ');
    props.attrsChamp.className = classeChamp.join(' ');

    if (props.autoFocus) {
        props.attrsChamp.autoFocus = true;
    }

    /*----------------------------------
    - RENDU FINAL
    ----------------------------------*/
    const rendre: TFuncRendu<TPropsCompletes> = (rendu, propsRendu) => {

        let { 
            ecraser, pur, readOnly,
            erreurs, status, vide,
            aide, suffixe, icone, prefixe, boutons, pied,
            suffixeLabel, label, titre, attrsContChamp
        } = { ...props, ...propsRendu }

        if (pur)
            return rendu;

        if (erreurs !== undefined && erreurs.length !== 0 && status !== false)
            // En cas d'erreur, on ecrase le message de status actuel
            status = (
                <div className="card bg error flat s">
                    {erreurs}
                </div>
            )

        if (aide) {

            if (!suffixe)
                suffixe = [];
            else if (!Array.isArray(suffixe))
                suffixe = [suffixe];

            suffixe.push(<i src="solid/question" title={aide} className="s" />);
        }

        if (icone !== undefined)
            prefixe = <i src={icone} />

        if (boutons) {

            props.attrsContChamp.className += ' avecBoutons';

            pied = (
                <div className="boutons">
                    {boutons.map((propsBouton) => (
                        <Bouton size="s" {...propsBouton} />
                    ))}
                </div>
            )
        }

        return (
            <div {...attrsContChamp}>

                {ecraser === true ? rendu : <>

                    {(label && titre) && (
                        <div className="contLabel">
                            <label>{titre}</label>
                            {suffixeLabel && (
                                <div className="suffixeLabel">{suffixeLabel}</div>
                            )}
                        </div>
                    )}

                    {ecraser === 'corpsChamp' ? rendu : (
                        <div className={"corpsChamp"} onClick={() => {
                            const elemChamp = refChamp.current;
                            if (elemChamp) {
                                if (type === 'select') {
                                    const bouton = elemChamp.querySelector('.bouton');
                                    if (bouton)
                                        bouton.click();
                                } else if (elemChamp.focus)
                                    elemChamp.focus();
                            }
                        }}>

                            {prefixe}

                            {rendu}

                            {suffixe}

                        </div>
                    )}
                    
                </>}

                {pied}

                {status}

            </div>
        )
    }

    return build(props, { valeur: state.valeur, state, setState, commitCurrentValue }, rendre);

}