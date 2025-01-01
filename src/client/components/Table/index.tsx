
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

    // Appearence
    stickyHeader?: boolean,
    className?: string,

    // Data
    data: TRow[],
    setData?: (rows: TRow[]) => void,
    columns: (row: TRow, rows: TRow[], index: number) => TColumn[];
    empty?: ComponentChild | false,

    // Interactions
    sort?: TSortOptions,
    onSort?: (columnId: string | null, order: TSortOptions["order"]) => void,

    selection?: [TRow[], React.SetStateAction<TRow[]>],
    maxSelection?: number,
}

export type TColumn = JSX.HTMLAttributes<HTMLElement> & {
    label: ComponentChild,
    cell: ComponentChild,
    raw?: number | string | boolean,
    stick?: boolean,
    sort?: TSortOptions
}

type TSortOptions = {
    id: string,
    order: 'desc' | 'asc'
}

/*----------------------------------
- COMPOSANTS
----------------------------------*/
export default function Liste<TRow extends TDonneeInconnue>({
    stickyHeader, onSort, sort: sorted,
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
                sort,
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

                const isCurrentlySorted = sort && sorted && sorted.id === sort.id;
                const isSortable = sort && onSort;
                if (isSortable) {
                    classe += ' clickable';
                    cellProps.onClick = () => {
                        if (isCurrentlySorted)
                            onSort(null, sort.order);
                        else
                            onSort(sort.id, sort.order);
                    }
                }

                if (iDonnee === 0) renduColonnes.push(
                    <th class={classe} {...cellProps}>
                        <div class="row sp-btw">
                            
                            {isSortable ? (
                                <a>{label}</a>
                            ) : label}

                            {isCurrentlySorted && (
                                <i src={sort.order === "asc" ? "caret-up" : "caret-down"} />
                            )}
                        </div>
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
