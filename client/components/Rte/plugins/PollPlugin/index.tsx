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
import { $wrapNodeInElement } from '@lexical/utils';
import {
    $createParagraphNode,
    $insertNodes,
    $isRootOrShadowRoot,
    COMMAND_PRIORITY_EDITOR,
    createCommand,
    LexicalCommand,
    LexicalEditor,
} from 'lexical';
import { useEffect, useState } from 'react';
import * as React from 'react';

import {
    $createPollNode,
    createPollOption,
    PollNode,
} from '../../nodes/PollNode';

export const INSERT_POLL_COMMAND: LexicalCommand<string> = createCommand(
    'INSERT_POLL_COMMAND',
);

export function InsertPollDialog({
    editor,
    close,
}: {
    editor: LexicalEditor;
    close: () => void;
}): React.JSX.Element {
    const [question, setQuestion] = useState('');

    const onClick = () => {
        editor.dispatchCommand(INSERT_POLL_COMMAND, question);
        close();
    };

    return (
        <>
            <Input title="Question" onChange={setQuestion} value={question} />
          
            <Button type="primary" disabled={question.trim() === ''} onClick={onClick}>
                Confirm
            </Button>
        </>
    );
}

export default function PollPlugin(): React.JSX.Element | null {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        if (!editor.hasNodes([PollNode])) {
            throw new Error('PollPlugin: PollNode not registered on editor');
        }

        return editor.registerCommand<string>(
            INSERT_POLL_COMMAND,
            (payload) => {
                const pollNode = $createPollNode(payload, [
                    createPollOption(),
                    createPollOption(),
                ]);
                $insertNodes([pollNode]);
                if ($isRootOrShadowRoot(pollNode.getParentOrThrow())) {
                    $wrapNodeInElement(pollNode, $createParagraphNode).selectEnd();
                }

                return true;
            },
            COMMAND_PRIORITY_EDITOR,
        );
    }, [editor]);
    return null;
}
