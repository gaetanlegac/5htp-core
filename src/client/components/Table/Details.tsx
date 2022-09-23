/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Libs
import React from 'react';
import { ComponentChild } from 'preact';

/*----------------------------------
- TYPES
----------------------------------*/

import { TDonneeInconnue, TColonne } from './'

export type { TColonne } from './'

export type Props<TDonnee> = {
    donnees: TDonnee,
    colonnes?: (donnee: TDonnee) => TColonne[];

    vide?: ComponentChild,
    className?: string
}

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default function Details<TDonnee extends TDonneeInconnue>({
    donnees, colonnes, vide, ...props
}: Props<TDonnee>) {

    if (donnees.length === 0)
        return (
            <div className="placeholder-vide">
                {vide || <>
                    <i src="empty-set" />
                    <span className="label">No data to show</span>
                </>}
            </div>
        );

    if (colonnes === undefined)
        colonnes = (donnees: TDonnee) => Object.entries(donnees).map(([ cle, valeur ]) => ({
            label: cle,
            cell: valeur
        }))

    return (
        <table {...props} className={"tableau" + (props.className ? ' ' + props.className : '')}>
            <tbody>
                {colonnes(donnees).map((ligne, iLigne) => {

                    let valeurAff = ligne.cell;
                    if (valeurAff !== null && typeof valeurAff === 'object' && (
                        valeurAff.constructor === Object
                        ||
                        valeurAff.constructor === Array
                    ))
                        valeurAff = JSON.stringify(valeurAff);

                    return (
                        <tr>
                            <th>{ligne.label}</th>
                            <td>
                                {valeurAff}
                            </td>
                        </tr>
                    )
                })}
            </tbody>
        </table>
    )
}