/*----------------------------------
- DEPENDANCES
----------------------------------*/
// Npm
import React from 'react';
import { ComponentChild } from 'preact';

// Composants gnéraux
import Bouton, { Props as PropsBouton } from '@client/components/button';
import Tableau, { Props as PropsTableau } from '@client/components/Donnees/Tableau';
import Champ, { BaseProps, BaseState } from '../Base';

import useContexte from '@contexte';

/*----------------------------------
- TYPES
----------------------------------*/

import { TInfosFichier } from '@commun/donnees/forms/validateurs/saisie/presets/fichiers';

type TValeur = TInfosFichier[];

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default ({ children, bouton, tableau, ...propsInit }: BaseProps<TValeur> & {
    children: ComponentChild,
    bouton: PropsBouton,
    tableau: (PropsTableau<TValeur, TValeur[]>)
}) => {

    const ctx = useContexte();

    const { props, rendre, state, onChange } = Champ<TValeur, BaseState<TValeur>>('upload', propsInit);

    return rendre(<>

        <Tableau 
            donnees={props.valeur}
            {...tableau || []}
            actions={[
                ...(tableau?.actions || []),
                {
                    label: 'Remove',
                    onClick: () => onChange(
                        props.valeur.filter((b, iA) => iA !== i)
                    )
                }
            ]}
        />

        <Bouton {...bouton}>

            <input type="file" 
                style={{
                    position: 'absolute',
                    top: '0px', left: '0px', bottom: '0px', right: '0px',
                    cursor: 'pointer',
                    opacity: 0
                }}
                //accept={types.map((t: string) => 'image/' + t)}
                multiple
                onChange={async function (c: any) {
                    const fichiers = c.target.files;
                    const nbFichiers = fichiers.length;
                    if (nbFichiers !== 0) {

                        // ATTENTION aux références: c.target.value = "" va supprimer l'instance de FileList
                        onChange( 
                            [...fichiers].map((f: File) => ({
                                file: f
                            })) as TInfosFichier[]
                        );

                        // Permet de pouvoir re-sélectionner le même fichier que précédemment
                        c.target.value = "";

                    }
                }} 
            />

            {children}
        </Bouton>
    </>, true)
}