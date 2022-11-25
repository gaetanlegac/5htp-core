/*----------------------------------
- DEPENDANCES
----------------------------------*/
// Libs
import React from 'react';
import { ComponentChild } from 'preact';

// Composants
import Button, { Props as PropsBouton } from '@client/components/button';
import Dropdown from '@client/components/dropdown.old';
//import Checkbox from '@client/components/Champs/Checkbox';

/*----------------------------------
- TYPES
----------------------------------*/

export type TDonneeInconnue = {[cle: string]: any};

export type Props<TRow> = {
    
    data: TRow[],
    columns: (row: TRow, rows: TRow[], index: number) => TColumn[];

    setData?: (rows: TRow[]) => void,
    vide?: ComponentChild,
    className?: string,

    actions?: TAction<TRow>[]
}

export type TColumn = {
    label: ComponentChild,
    cell: ComponentChild,
    raw?: number | string | boolean,
    class?: string
}

/*----------------------------------
- COMPOSANTS
----------------------------------*/
export default function Liste<TRow extends TDonneeInconnue>({
    data: rows, setData, vide ,
    columns, actions, ...props
}: Props<TRow>) {

    if (rows.length === 0)
        return (
            <div class="card pd-2 col al-center">
                <i src="meh-rolling-eyes" class="xl" />
                Uh ... No rows here.
            </div>
        );

    const [selection, setSelection] = React.useState<number[]>([]);
    const [sort, setSort] = React.useState<{ col: number, dir: 1 | -1 } | null>(null);

    const trier = (colonne: TColumn, iColonne: number) => {

        if (!setData) 
            return console.warn(`[ui][table] Please specify a setData function to enable sorting features.`);

        const ordre = sort && iColonne === sort.col
            ? -1 * sort.dir as (1 | -1) // Inversement ordre
            : 1;
            
        setData([
            ...rows.sort((a: TRow, b: TRow) => {

                const valA = colonne.valeur(a);
                const valB = colonne.valeur(b);

                const typeA = typeof valA;
                const typeB = typeof valB;

                if (typeA === 'number' && typeB === 'number')
                    return ordre === 1 ? (valA as number) - (valB as number) : (valB as number) - (valA as number)
                else if (typeA === 'string' && typeB === 'string')
                    return ordre === 1
                        ? (valA as string).localeCompare(valB as string)
                        : (valB as string).localeCompare(valA as string)
                else
                    throw new Error(`Type de données incompatible entre deux lignes: ${valA}:${typeA} vs ${valB}:${typeB}.`);


            })
        ]);

        setSort({ col: iColonne, dir: ordre });
    }

    const selectionMultiple = actions && actions.some((action) => action.multi);

    /*----------------------------------
    - RENDU COLONNES / LIGNES
    ----------------------------------*/
    let renduColonnes: ComponentChild[] = [];
    
    const renduLignes = rows.map((row: TRow, iDonnee: number) => (
        <tr>
            {/*selectionMultiple && (
                <td>
                    <Checkbox
                        nom={"selectionner" + iDonnee}
                        label={false}
                        valeur={selection.includes(iDonnee)}
                        onChange={(selectionner: boolean) => {
                            setSelection(selectionner
                                // Ajoute
                                ? [...selection, iDonnee]
                                // Retire
                                : selection.filter((e, i) => i !== iDonnee))
                        }}
                    />
                </td>
                    )*/}

            {columns(row, rows, iDonnee).map((colonne, iColonne) => {

                const triable = colonne.raw !== undefined;

                if (iDonnee === 0) renduColonnes.push(
                    <th
                        onClick={triable !== undefined ? () => trier(colonne, iColonne) : undefined}
                        className={triable !== undefined ? 'cliquable' : undefined}
                    >
                        {colonne.label}
                    </th>
                );

                const affichageBrut = ['number', 'string'].includes(typeof colonne.cell) || React.isValidElement(colonne.cell);

                let classe = colonne.class || '';
                if (typeof colonne.raw === 'number')
                    classe += 'txtRight';

                return (
                    <td class={classe}>
                        {affichageBrut ? colonne.cell : JSON.stringify(colonne.cell)}
                    </td>
                )
            })}

            {/*actions !== undefined && (
                <td>
                    <Popover menu={{ actions, rows: row }}>
                        <Button taille="s" icone="solid/ellipsis-h" />
                    </Popover>
                </td>
            )*/}
        </tr>
    ));

    props.className = props.className === undefined
        ? "table"
        : "table " + props.className

    /*----------------------------------
    - RENDU GLOBAL
    ----------------------------------*/
    // div.table permet d'appliquer des marges négatives au tableau (ex: .card > .cover)
    // tout en le forçant à prendre toute la largeur
    return <>
        <div {...props}>
            <table>
                <thead>
                    <tr>
                        {selectionMultiple && (
                            <th>
                                <Checkbox
                                    nom="toutSelectionner"
                                    label={false}
                                    valeur={selection.length >= rows.length}
                                    onChange={(status: boolean) => {
                                        setSelection(status ? Object.keys(rows) : []);
                                    }}
                                />
                            </th>
                        )}

                        {renduColonnes}

                        {actions !== undefined && (
                            <th>Actions</th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {renduLignes}
                </tbody>
            </table>

            {(selection.length !== 0 && actions) && (
                <footer>
                    <div className="card pdv-05 row inline pos_bottom">
                        <strong>{selection.length} selected items</strong>

                        {actions.map((action: TAction<TRow>) => {

                            if (!action.multi)
                                return;

                            const donneesSelection = selection.map((index: number) => rows[index]);

                            return (
                                <Button
                                    {...(action.bouton ? (action.multi
                                        ? action.bouton([row], [iDonnee])
                                        : action.bouton(row, iDonnee)
                                    ) : {})}
                                    icone={action.icone}
                                    onClick={() => action.onClick && action.onClick(donneesSelection, selection)}
                                    lien={action.lien && action.lien(donneesSelection, selection)}
                                >
                                    {action.label}
                                </Button>
                            )
                        })}

                        <Button onClick={() => setSelection([])}>
                            Cancel
                        </Button>
                    </div>
                </footer>
            )}
        </div>
    </>
}
