
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

    actions?: TAction<TRow>[]
}

export type TColumn = JSX.HTMLAttributes<HTMLElement> & {
    label: ComponentChild,
    cell: ComponentChild,
    raw?: number | string | boolean,
    stick?: string
}

export type TAction<TRow> = Omit<TButtonProps, 'onClick'> & {
    onClick: (row: TRow) => void,
    label: ComponentChild,
    multi?: boolean,
    default?: boolean,
}

/*----------------------------------
- COMPOSANTS
----------------------------------*/
export default function Liste<TRow extends TDonneeInconnue>({
    stickyHeader,
    data: rows, setData, empty,
    columns, actions, ...props
}: Props<TRow>) {

    const { modal } = useContext();

    if (rows.length === 0)
        return empty === false ? null : (
            <div class={"pd-2 col al-center " + (props.className || '')}>
                {empty || <>
                    <i src="meh-rolling-eyes" class="xl" />
                    Uh ... No rows here.
                </>}
            </div>
        );

    const [selection, setSelection] = React.useState<number[]>([]);
    const selectionMultiple = actions && actions.some((action) => action.multi);

    const defaultAction = actions && actions.find((action) => action.default);

    /*----------------------------------
    - RENDU COLONNES / LIGNES
    ----------------------------------*/
    let renduColonnes: ComponentChild[] = [];
    
    const renduLignes = rows.map((row: TRow, iDonnee: number) => (
        <tr {...defaultAction ? {
            onClick: () => defaultAction.onClick(row),
            class: 'clickable'
        } : {}}>
            {selectionMultiple && (
                <td>
                    <Checkbox
                        id={"selectionner" + iDonnee}
                        value={selection.includes(row.id)}
                        onChange={(selectionner: boolean) => {
                            setSelection(current => selectionner
                                // Ajoute
                                ? [...current, row.id]
                                // Retire
                                : current.filter((currentId, i) => currentId !== row.id))
                        }}
                    />
                </td>
            )}

            {columns(row, rows, iDonnee).map(({ label, cell, class: className, raw, stick, ...cellProps }) => {

                let classe = className || '';
                if (typeof raw === 'number')
                    classe += 'txtRight';

                if (stick) {
                    classe += ' stickyColumn';
                    if (cellProps.style === undefined)
                        cellProps.style = {};
                    cellProps.style = {
                        ...cellProps.style,
                        minWidth: stick,
                        width: stick,
                        maxWidth: stick,
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

            {actions !== undefined && (
                <td>
                    <Popover content={(
                        <ul class="col menu card bg white">
                            {actions.map(({ label, onClick, ...props }: TAction<TRow>) => (
                                <li>
                                    <Button {...props}
                                        onClick={() => onClick && onClick(row)}
                                        
                                    >
                                        {label}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}>
                        <Button size="s" icon="solid/ellipsis-h" />
                    </Popover>
                </td>
            )}
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
                        {selectionMultiple && (
                            <th>
                                <Checkbox
                                    value={selection.length >= rows.length}
                                    onChange={(status: boolean) => {
                                        setSelection(status ? rows.map(r => r.id) : []);
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

                        {actions.map(({ label, multi, onClick, ...props }: TAction<TRow>) => {

                            if (!multi)
                                return;

                            const selectedRows = selection.map((index: number) => rows[index]);

                            return (
                                <Button
                                    {...props}
                                    onClick={() => onClick && onClick(selectedRows)}
                                >
                                    {label}
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
