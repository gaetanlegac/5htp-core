/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Core
import Button from '@client/components/Button';
import Input from '@client/components/Input';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
    $createTableNodeWithDimensions,
    INSERT_TABLE_COMMAND,
    TableNode,
} from '@lexical/table';
import {
    $insertNodes,
    COMMAND_PRIORITY_EDITOR,
    createCommand,
    EditorThemeClasses,
    Klass,
    LexicalCommand,
    LexicalEditor,
    LexicalNode,
} from 'lexical';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as React from 'react';
import invariant from '../shared/invariant';

export type InsertTableCommandPayload = Readonly<{
    columns: string;
    rows: string;
    includeHeaders?: boolean;
}>;

export type CellContextShape = {
    cellEditorConfig: null | CellEditorConfig;
    cellEditorPlugins: null | React.JSX.Element | Array<React.JSX.Element>;
    set: (
        cellEditorConfig: null | CellEditorConfig,
        cellEditorPlugins: null | React.JSX.Element | Array<React.JSX.Element>,
    ) => void;
};

export type CellEditorConfig = Readonly<{
    namespace: string;
    nodes?: ReadonlyArray<Klass<LexicalNode>>;
    onError: (error: Error, editor: LexicalEditor) => void;
    readOnly?: boolean;
    theme?: EditorThemeClasses;
}>;

export const INSERT_NEW_TABLE_COMMAND: LexicalCommand<InsertTableCommandPayload> =
    createCommand('INSERT_NEW_TABLE_COMMAND');

export const CellContext = createContext<CellContextShape>({
    cellEditorConfig: null,
    cellEditorPlugins: null,
    set: () => {
        // Empty
    },
});

export function TableContext({ children }: { children: React.JSX.Element }) {
    const [contextValue, setContextValue] = useState<{
        cellEditorConfig: null | CellEditorConfig;
        cellEditorPlugins: null | React.JSX.Element | Array<React.JSX.Element>;
    }>({
        cellEditorConfig: null,
        cellEditorPlugins: null,
    });
    return (
        <CellContext.Provider
            value={useMemo(
                () => ({
                    cellEditorConfig: contextValue.cellEditorConfig,
                    cellEditorPlugins: contextValue.cellEditorPlugins,
                    set: (cellEditorConfig, cellEditorPlugins) => {
                        setContextValue({ cellEditorConfig, cellEditorPlugins });
                    },
                }),
                [contextValue.cellEditorConfig, contextValue.cellEditorPlugins],
            )}>
            {children}
        </CellContext.Provider>
    );
}

export function InsertTableDialog({
    editor,
    close,
}: {
    editor: LexicalEditor;
    close: () => void;
}): React.JSX.Element {
    const [rows, setRows] = useState('5');
    const [columns, setColumns] = useState('5');
    const [isDisabled, setIsDisabled] = useState(true);

    useEffect(() => {
        const row = Number(rows);
        const column = Number(columns);
        if (row && row > 0 && row <= 500 && column && column > 0 && column <= 50) {
            setIsDisabled(false);
        } else {
            setIsDisabled(true);
        }
    }, [rows, columns]);

    const onClick = () => {
        editor.dispatchCommand(INSERT_TABLE_COMMAND, {
            columns,
            rows,
        });

        close();
    };

    return (
        <>
            <Input
                placeholder={'# of rows (1-500)'}
                title="Rows"
                onChange={setRows}
                value={rows}
                type="number"
            />
            <Input
                placeholder={'# of columns (1-50)'}
                title="Columns"
                onChange={setColumns}
                value={columns}
                type="number"
            />
            <Button type="primary" disabled={isDisabled} onClick={onClick}>
                Confirm
            </Button>
        </>
    );
}

export function TablePlugin({
    cellEditorConfig,
    children,
}: {
    cellEditorConfig: CellEditorConfig;
    children: React.JSX.Element | Array<React.JSX.Element>;
}): React.JSX.Element | null {
    const [editor] = useLexicalComposerContext();
    const cellContext = useContext(CellContext);

    useEffect(() => {
        if (!editor.hasNodes([TableNode])) {
            invariant(false, 'TablePlugin: TableNode is not registered on editor');
        }

        cellContext.set(cellEditorConfig, children);

        return editor.registerCommand<InsertTableCommandPayload>(
            INSERT_NEW_TABLE_COMMAND,
            ({ columns, rows, includeHeaders }) => {
                const tableNode = $createTableNodeWithDimensions(
                    Number(rows),
                    Number(columns),
                    includeHeaders,
                );
                $insertNodes([tableNode]);
                return true;
            },
            COMMAND_PRIORITY_EDITOR,
        );
    }, [cellContext, cellEditorConfig, children, editor]);

    return null;
}
