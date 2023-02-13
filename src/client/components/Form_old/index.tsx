/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { ComponentChild, FunctionComponent } from 'preact';
import dottie from 'dottie';

// Libs
import { TListeErreursSaisie, InputErrorSchema } from '@common/errors';
import { propsDefautChampForm, TBasePropsChamp } from '@client/components/input/Base';
import { TSchema, TRetourValidation, initDonnees, validate as validerSchema, TSchemaChampComplet } from '@common/data/input/validate';
import { simpleDeepCopy, chemin } from '@common/data/objets';
import { ContexteOnglets } from '@client/components/containers/tabs';
import useContext from '@/client/context';

/*----------------------------------
- TYPES ENTREE
----------------------------------*/

export type TComposantChamps<TDonnees> = { [nomChamp in keyof TDonnees]: ComponentChild };

type TPropsHook<TDonnees extends TObjetDonnees> = {

    // Informations générales
    //nom: string,
    donnees?: TDonnees,

    // Présentation & état
    progression?: false | number,
    autosave?: boolean,
    readOnly?: boolean,

    // Actions
    onChange?: (donnees: TDonnees, validation: TRetourValidation<TDonnees> | false) => void,
    afterValidation?: (validation: TRetourValidation<TDonnees>) => void,
    refActions?: (actionsForm: TActionsForm<TDonnees>) => void,
    onSet?: { [nomChamp: string]: (anciennesDonnees: TDonnees, nouvellesDonnees: TDonnees) => TDonnees }

    // Champs
    propsChamps?: { [cle: string]: any }
}


/*----------------------------------
- TYPES SORTIE
----------------------------------*/

type TChamps = {[name: string]: FunctionComponent<TBasePropsChamp<any, any, any>>}

export type TActionsForm<TDonnees extends TObjetDonnees> = {

    envoyer: (e?: any) => Promise<void>,
    set: (valeurs: Partial<TDonnees>) => void,
    get: (champ?: string) => any | TDonnees,

    saisie: Partial<TDonnees>,
    form: TActionsForm<TDonnees>,
    schema: TSchema,
    changes: number
}

/*----------------------------------
- COMPOSANTS
----------------------------------*/

const debug = false;

export const useForm = <TDonnees extends TObjetDonnees>(
    schema: TSchema,
    send: string | ((donnees: TDonnees) => Promise < boolean | undefined | void>),
    props: TPropsHook<TDonnees> = {}
): [TChamps, TActionsForm<TDonnees>, TDonnees] => {

    const refChamps = React.useRef<{ [nomChamp: string]: HTMLElement }>({});

    const { api } = useContext();

    /*----------------------------------
    - INIT
    ----------------------------------*/

    // State
    const [state, setState] = React.useState<{
        donnees: Partial<TDonnees>,
        erreurs: TListeErreursSaisie,
        errorsCount: number,
        progression: false | number,
        changed: Partial<TDonnees> // Nom des champs changés depuis le dernier enregistrement
    }>({
        donnees: props.donnees || {},
        erreurs: {},
        errorsCount: 0,
        progression: false,
        changed: {}
    });

    const donneesExternes = props.donnees !== undefined && props.onChange !== undefined;
    const donneesInit = ((donneesExternes ? props.donnees : state.donnees) || {}) as Partial<TDonnees>
    const donnees = initDonnees(schema, donneesInit, true);

    /*----------------------------------
    - METHODES
    ----------------------------------*/
    function get(champ: string): any;
    function get(): TDonnees;
    function get(champ?: string): any | TDonnees {
        return champ === undefined
            ? donnees
            : donnees[champ];
    }

    async function set<TNomDonnee extends keyof TDonnees>(nom: TNomDonnee, valeur: TDonnees[TNomDonnee]): Promise<void>;
    async function set<TNomDonnee extends keyof TDonnees>(donnees: Partial<TDonnees>): Promise<void>;
    async function set<TNomDonnee extends keyof TDonnees>(...args: 
        [donnees: Partial<TDonnees>] 
        | 
        [nom: TNomDonnee, valeur: TDonnees[TNomDonnee]]
    ): Promise<void> {

        if (args.length === 1)
            await onChange(args[0]);
        else
            await onChange({ [args[0]]: args[1] } as unknown as Partial<TDonnees>);
        
    }

    async function onChange(
        valeursInit: Partial<TDonnees>,
        newState: Partial<typeof state> = {},
    ): Promise<{ erreurs: TListeErreursSaisie, errorsCount: number }> {

        // RAPPEL: donnees = anciennes données

        // TODO: Saisie champ: si saisieManuelle, set state local et appel props.onchange quand onblur, sinon appel props.onchange direct
        //      Le useEffect mettra à jour le state s différence entre state.valeur et props.valeur
        let changees: Partial<TDonnees> = {};
        for (const cle in valeursInit)
            if (valeursInit[cle] !== donnees[cle])
                changees[cle] = valeursInit[cle];

        if (debug) console.log(`[form][saisie] onChange`, changees);

        let errorsCount: number = 0;
        let erreurs: TListeErreursSaisie = {}
        if (Object.keys(changees).length !== 0) {

            // Validation des données changées
            // TODO: conserver erreurs des champs n'ayant pas été changés
            let nouvellesDonnees: Partial<TDonnees>;
            ({
                valeurs: nouvellesDonnees,
                errorsCount,
                erreurs
            } = await valider(valeursInit));

            if (debug && errorsCount !== 0) console.log(`[form][saisie] erreurs`, erreurs);

            newState.erreurs = erreurs;
            newState.errorsCount = errorsCount;

            // Validation & mapping personnalisé
            /*if (props.filtres?.after)
                nouvellesDonnees = props.filtres.after(nouvellesDonnees, donnees);*/

            // Copie + fusion sans références
            const donneesCompletes = simpleDeepCopy(donnees, nouvellesDonnees);
            const changed = { ...state.changed, ...nouvellesDonnees };

            // Màj valeur + erreurs
            // Le passage d'une fonction permet de récupérer le dernier state, ce qui évite à composantChamps de redevenir undefined
            setState((stateA) => ({
                ...stateA,
                donnees: donneesCompletes,
                changed: changed,
                ...newState
            }));

            if (props.onChange && errorsCount === 0)
                props.onChange(donneesCompletes, { valeurs: nouvellesDonnees, errorsCount, erreurs, changed });

            /*if (valider && props.autosave === true) {

                if (props.envoyer === undefined)
                    throw new Error("autosave = true, mais aucune fonction d'enregistrement n'est passée dans props.envoyer");

                await envoyer();


            }*/
        }

        return { erreurs, errorsCount };
    }

    async function valider(
        donneesAvalider: Partial<TDonnees>
    ): Promise<TRetourValidation<TDonnees>> {

        console.log(`[form][saisie] Valider`, donneesAvalider, 'Données complètes =', donnees);

        // Pas de valeur pécifiées = on valide toutes les données du form
        const retour = await validerSchema(schema, donneesAvalider, donnees, undefined, {
            corriger: true
        });

        // Focus sur le premier champ ayant déclenché une erreur
        if (retour.errorsCount !== 0) {

            const cheminChamp = Object.keys(retour.erreurs)[0]
            const champ = chemin.get(schema, cheminChamp);

            // Scroll
            const elemChamp = refChamps.current[cheminChamp];
            elemChamp?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'start' })


        }

        if (props.afterValidation !== undefined)
            props.afterValidation(retour, actions);

        return retour;
    }

    async function envoyer(additionnalData: TObjetDonnees = {}): Promise<boolean> {

        if (props.readOnly)
            return false;

        // Déjà en cours d'envoi
        if (props.progression !== undefined && props.progression !== false)
            return false;

        if (state.errorsCount !== 0)
            return false;

        console.log(`[form][saisie] Envoyer`, donnees);

        // Validation de l'ensemble des champs
        const { erreurs, errorsCount, valeurs } = await valider(donnees);
        if (errorsCount !== 0) {
            setState((stateA) => ({ ...stateA, erreurs, errorsCount }));
            console.error('Erreurs formulaire', erreurs);
            return false;
        }

        console.log("@@@ Envoi formulaire 2", valeurs);

        // Envoi
        if (send !== undefined) {

            if (!('progression' in props))
                setState((stateA) => ({ ...stateA, progression: 0 }));

            if (typeof send === 'string') {
                const url = send;
                send = (donnees: TDonnees) => api.post(url, donnees).run();
            }

            // Ayant été validée, on estime que les données sont complètes
            return await send({ ...donnees, ...additionnalData }).then((envoye: boolean | undefined) => {

                if (envoye !== false) {

                    setState((stateA) => ({
                        ...stateA,
                        progression: ('progression' in props)
                            ? stateA.progression
                            : false,
                        changed: {} // Reset de la liste des données changées
                    }));

                    return true;
                } else
                    return false;

            }).catch((e) => {

                if (debug) console.log("RETOUR ERREURS API", e);

                if (e instanceof InputErrorSchema) {

                    setState((stateA) => ({
                        ...stateA,
                        erreurs: e.erreursSaisie,
                        progression: 'progression' in props ? stateA.progression : false
                    }));

                } else
                    throw e;

                return false;

            });
        }

        return false;
    }

    /*----------------------------------
    - RENDU CHAMPS
    ----------------------------------*/
    function rendreChamp( 
        champ: TSchemaChampComplet | undefined, 
        donneesSchema: TObjetDonnees | undefined,
        chemin: string, 
        propsChamp: TObjetDonnees 
    ) {

        // Inexistant
        if (champ === undefined)
            return 'Champ inexistant: ' + chemin;

        const { rendu, as, activer, ...attrs } = champ;

        // Désactivé
        if (activer !== undefined && activer(donnees) === false)
            return null;

        // N'est pas destiné à être rendu
        if (rendu === undefined)
            return null;

        const schemaPath = chemin.split('.');
        const nomChamp = schemaPath.pop() as string;

        // Correction valeur selon as
        const valeur = donneesSchema === undefined
            ? undefined
            : (as === undefined
                ? donneesSchema[nomChamp]
                // Champ composé de plusieurs valeurs
                : as.map((nomDonnee) => donneesSchema[nomDonnee])
            );

        // Rendu
        return React.createElement( rendu, {
            // Config par défaut pour les champs appartenant au form (ex: label systèmatique)
            ...propsDefautChampForm,

            // Attributs définis via le schema
            ...attrs,
            // Attributs définis via l'appel du composant
            ...propsChamp,

            // Rattachement au form
            ref: (ref: HTMLElement) => refChamps.current[chemin] = ref?.base,
            nom: nomChamp,
            valeur: valeur,
            as: as,
            valider: undefined, // Pas de validation dans le champ. On fait tous les champs em même temps depuis le form
            erreurs: state.erreurs[chemin],
            readOnly: props.readOnly, // Si le form est readonly, alors tous ses champs le sont obligatoirement
            onChange: async (nouvelleValeur: any) => {

                // Mapping données
                let nouvellesDonnees: Partial<TDonnees>;
                if (as !== undefined) {
                    nouvellesDonnees = dottie.transform({
                        [[...schemaPath, as[0]].join('.')]: nouvelleValeur[0],
                        [[...schemaPath, as[1]].join('.')]: nouvelleValeur[1]
                    });
                    // Mapping classique
                } else
                    nouvellesDonnees = dottie.transform({
                        [chemin]: nouvelleValeur
                    });

                // Application des changements
                const { errorsCount } = await onChange(nouvellesDonnees, {});

                // Si aucune erreur, onChange propre au champ + gestion erreurs
                if (propsChamp.onChange !== undefined && errorsCount === 0)
                    await propsChamp.onChange(nouvelleValeur).catch((e) => {
                        setState((stateA) => ({
                            ...stateA,
                            erreurs: {
                                ...stateA.erreurs,
                                [chemin]: [e]
                            }
                        }));
                    })
            },
        });

    }

    /*----------------------------------
    - RETOUR
    ----------------------------------*/

    // Will be transformed by babel
    const Champs = {
        schema,
        data: donnees,
        render: rendreChamp
    } as unknown as TChamps

    const actions = {
        envoyer,
        get,
        set,
        render: rendreChamp,
        schema,
        changes: Object.keys(state.changed).length
    }

    return [Champs, actions, donnees];
}

export default <TDonnees extends TObjetDonnees>({  

    ...props

}: React.JSX.HTMLAttributes<HTMLFormElement> & {}) => {

    const refForm = React.useRef<HTMLFormElement>(null);
    const ctx = useContext();

    // Autofocus
    React.useEffect(() => {

        const firstInput = refForm.current?.querySelector("[autofocus]");
        if (firstInput) {

            //ctx.Application.requestFocus();
            firstInput.focus();
            firstInput.select();
            firstInput.click();

        }

    });

    const submit = (e) => {
        e.preventDefault();
        return false;
    }

    return (
        <form {...props} ref={refForm} onSubmit={submit} />
    );

    /*
        <Chargement progression={'progression' in props ? props.progression : state.progression}>
        </Chargement>
    */
}