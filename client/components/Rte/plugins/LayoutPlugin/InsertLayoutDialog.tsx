/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { LexicalEditor } from 'lexical';
import * as React from 'react';
import { useState } from 'react';

import DropDown, { DropDownItem } from '../../ui/DropDown';
import { INSERT_LAYOUT_COMMAND } from './LayoutPlugin';

// Core
import Button from '@client/components/Button';

const LAYOUTS = [
    { label: '2 columns (equal width)', value: '1fr 1fr' },
    { label: '2 columns (25% - 75%)', value: '1fr 3fr' },
    { label: '3 columns (equal width)', value: '1fr 1fr 1fr' },
    { label: '3 columns (25% - 50% - 25%)', value: '1fr 2fr 1fr' },
    { label: '4 columns (equal width)', value: '1fr 1fr 1fr 1fr' },
];

export default function InsertLayoutDialog({
    editor,
    close,
}: {
    editor: LexicalEditor;
    close: () => void;
}): React.JSX.Element {
    const [layout, setLayout] = useState(LAYOUTS[0].value);
    const buttonLabel = LAYOUTS.find((item) => item.value === layout)?.label;

    const onClick = () => {
        editor.dispatchCommand(INSERT_LAYOUT_COMMAND, layout);
        close();
    };

    return (
        <>
            <DropDown
                buttonClassName="toolbar-item dialog-dropdown"
                buttonLabel={buttonLabel}>
                {LAYOUTS.map(({ label, value }) => (
                    <DropDownItem
                        key={value}
                        className="item"
                        onClick={() => setLayout(value)}>
                        <span className="text">{label}</span>
                    </DropDownItem>
                ))}
            </DropDown>
            <Button type="primary" onClick={onClick}>Insert</Button>
        </>
    );
}
