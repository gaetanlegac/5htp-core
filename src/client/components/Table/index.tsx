
/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Libs
import React from 'react';
import { JSX, ComponentChild } from 'preact';

// Composants
import useContext from '@/client/context';
import Button, { Props as TButtonProps } from '@client/components/button';
import Popover from '../containers/Popover';
import Checkbox from '../inputv3/Checkbox';

/*----------------------------------
- TYPES
----------------------------------*/

export type TDonneeInconnue = { id: any } &  {[cle: string]: any};

export type Props<TRow> = {
    
    data: TRow[],
    columns: (row: TRow, rows: TRow[], index: number) => TColumn[];
    stickyHeader?: boolean,

    setData?: (rows: TRow[]) => void,
    empty?: ComponentChild | false,
    className?: string,

    selection?: [TRow[], React.SetStateAction<TRow[]>],
    maxSelection?: number,
}

export type TColumn = JSX.HTMLAttributes<HTMLElement> & {
    label: ComponentChild,
    cell: ComponentChild,
    raw?: number | string | boolean,
    stick?: boolean,
}

/*----------------------------------
- COMPOSANTS
----------------------------------*/
export default function Liste<TRow extends TDonneeInconnue>({
    stickyHeader,
    data: rows, setData, empty,
    selection: selectionState, maxSelection,
    columns, ...props
}: Props<TRow>) {

    const { modal } = useContext();

    // Selection
    const selection = selectionState ? {
        current: selectionState[0],
        set: selectionState[1],
        isMultiple: maxSelection === undefined || maxSelection > 1
    } : undefined;

    // Empty data
    if (rows.length === 0)
        return empty === false ? null : (
            <div class={"pd-2 col al-center " + (props.className || '')}>
                {empty || <>
                    <i src="meh-rolling-eyes" class="xl" />
                    Uh ... No rows here.
                </>}
            </div>
        );

    /*----------------------------------
    - RENDU COLONNES / LIGNES
    ----------------------------------*/
    let renduColonnes: ComponentChild[] = [];
    
    const renduLignes = rows.map((row: TRow, iDonnee: number) => (
        <tr {...(maxSelection === 1 && selection) ? {
            onClick: () => selection.set([row]),
            class: 'clickable'
        } : {}}>

            {selection?.isMultiple && (
                <td>
                    <Checkbox
                        id={"selectionner" + iDonnee}
                        value={selection.current.some(s => s.id === row.id)}
                        onChange={(isSelected: boolean) => {
                            selection.set(current => isSelected
                                // Ajoute
                                ? [...current, row]
                                // Retire
                                : current.filter((currentElem) => currentElem.id !== row.id))
                        }}
                    />
                </td>
            )}

            {columns(row, rows, iDonnee).map(({ 
                label, cell, class: className, raw, 
                stick, width, ...cellProps 
            }) => {

                let classe = className || '';
                if (typeof raw === 'number')
                    classe += 'txtRight';

                if (stick) {
                    classe += ' stickyColumn';
                }

                if (width) {

                    if (cellProps.style === undefined)
                        cellProps.style = {};

                    cellProps.style = {
                        ...cellProps.style,
                        minWidth: width,
                        width: width,
                        maxWidth: width,
                    }
                }

                if (iDonnee === 0) renduColonnes.push(
                    <th class={classe} {...cellProps}>
                        {label}
                    </th>
                );

                let render: ComponentChild;
                if (Array.isArray(cell)) {

                    classe += ' extendable';

                    render = (
                        <div class="row sp-05">
                            {cell.map((item, i) => (
                                <span class={"badge bg light" + ((i % 7) + 1)}>
                                    {item}
                                </span>
                            ))}
                        </div>
                    )

                    // Extension
                    cellProps.onClick = () => modal.show(() => (
                        <div class="card col tableCellExtended">
                            <h3>{label}</h3>
                            {render}
                        </div>
                    ));
                    
                } else if (['number', 'string'].includes(typeof cell) || React.isValidElement(cell)) {
                    render = cell;
                } else 
                    render = JSON.stringify(cell);

                return (
                    <td class={classe} {...cellProps}>
                        {render}
                    </td>
                )
            })}
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
                <thead className={stickyHeader ? 'stickyHeader' : undefined}>
                    <tr>
                        {selection?.isMultiple && (
                            <th>
                                <Checkbox
                                    value={selection.current.length >= rows.length}
                                    onChange={(status: boolean) => {
                                        selection.set(status ? rows : []);
                                    }}
                                />
                            </th>
                        )}

                        {renduColonnes}
                    </tr>
                </thead>
                <tbody>
                    {renduLignes}
                </tbody>
            </table>
        </div>
    </>
}
