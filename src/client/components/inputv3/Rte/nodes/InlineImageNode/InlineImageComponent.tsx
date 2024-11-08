/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { Position } from './InlineImageNode';
import type { BaseSelection, LexicalEditor, NodeKey } from 'lexical';

import './InlineImageNode.css';

import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { LexicalNestedComposer } from '@lexical/react/LexicalNestedComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { mergeRegister } from '@lexical/utils';
import {
    $getNodeByKey,
    $getSelection,
    $isNodeSelection,
    $setSelection,
    CLICK_COMMAND,
    COMMAND_PRIORITY_LOW,
    DRAGSTART_COMMAND,
    KEY_BACKSPACE_COMMAND,
    KEY_DELETE_COMMAND,
    KEY_ENTER_COMMAND,
    KEY_ESCAPE_COMMAND,
    SELECTION_CHANGE_COMMAND,
} from 'lexical';
import * as React from 'react';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

// Core
import useContext from '@/client/context';
import Select, { Choice } from '@client/components/Select';
import Button from '@client/components/button';
import Input from '@client/components/inputv3';

import LinkPlugin from '../../plugins/LinkPlugin';
import ContentEditable from '../../ui/ContentEditable';
import { $isInlineImageNode, InlineImageNode } from './InlineImageNode';

const imageCache = new Set();

function useSuspenseImage(src: string) {
    if (!imageCache.has(src)) {
        throw new Promise((resolve) => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                imageCache.add(src);
                resolve(null);
            };
        });
    }
}

function LazyImage({
    altText,
    className,
    imageRef,
    src,
    width,
    height,
    position,
}: {
    altText: string;
    className: string | null;
    height: 'inherit' | number;
    imageRef: { current: null | HTMLImageElement };
    src: string;
    width: 'inherit' | number;
    position: Position;
}): React.JSX.Element {
    useSuspenseImage(src);
    return (
        <img
            className={className || undefined}
            src={src}
            alt={altText}
            ref={imageRef}
            data-position={position}
            style={{
                display: 'block',
                height,
                width,
            }}
            draggable={false}
        />
    );
}

export function UpdateInlineImageDialog({
    activeEditor,
    nodeKey,
    close,
}: {
    activeEditor: LexicalEditor;
    nodeKey: NodeKey;
    close: () => void;
}): React.JSX.Element {
    const editorState = activeEditor.getEditorState();
    const node = editorState.read(
        () => $getNodeByKey(nodeKey) as InlineImageNode,
    );
    const [altText, setAltText] = useState(node.getAltText());
    const [showCaption, setShowCaption] = useState(node.getShowCaption());
    const [position, setPosition] = useState<Position>(node.getPosition());

    const handleShowCaptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setShowCaption(e.target.checked);
    };

    const handlePositionChange = (choice: Choice) => {
        setPosition( choice.value as Position );
    };

    const handleOnConfirm = () => {
        const payload = { altText, position, showCaption };
        if (node) {
            activeEditor.update(() => {
                node.update(payload);
            });
        }
        close();
    };

    return (
        <>
            <Input
                title="Alt Text"
                placeholder="Descriptive alternative text"
                onChange={setAltText}
                value={altText}
            />

            <Select
                style={{ marginBottom: '1em', width: '208px' }}
                value={position}
                title="Position"
                onChange={handlePositionChange} choices={[
                { value: 'left', label: 'Left' },
                { value: 'right', label: 'Right' },
                { value: 'full', label: 'Full Width' },
            ]} />

            <div className="Input__wrapper">
                <input
                    id="caption"
                    type="checkbox"
                    checked={showCaption}
                    onChange={handleShowCaptionChange}
                />
                <label htmlFor="caption">Show Caption</label>
            </div>

            <Button type='primary'
                onClick={() => handleOnConfirm()}>
                Confirm
            </Button>
        </>
    );
}

export default function InlineImageComponent({
    src,
    altText,
    nodeKey,
    width,
    height,
    showCaption,
    caption,
    position,
}: {
    altText: string;
    caption: LexicalEditor;
    height: 'inherit' | number;
    nodeKey: NodeKey;
    showCaption: boolean;
    src: string;
    width: 'inherit' | number;
    position: Position;
}): React.JSX.Element {

    const { modal } = useContext();

    const imageRef = useRef<null | HTMLImageElement>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const [isSelected, setSelected, clearSelection] =
        useLexicalNodeSelection(nodeKey);
    const [editor] = useLexicalComposerContext();
    const [selection, setSelection] = useState<BaseSelection | null>(null);
    const activeEditorRef = useRef<LexicalEditor | null>(null);
    const isEditable = useLexicalEditable();

    const $onDelete = useCallback(
        (payload: KeyboardEvent) => {
            const deleteSelection = $getSelection();
            if (isSelected && $isNodeSelection(deleteSelection)) {
                const event: KeyboardEvent = payload;
                event.preventDefault();
                if (isSelected && $isNodeSelection(deleteSelection)) {
                    editor.update(() => {
                        deleteSelection.getNodes().forEach((node) => {
                            if ($isInlineImageNode(node)) {
                                node.remove();
                            }
                        });
                    });
                }
            }
            return false;
        },
        [editor, isSelected],
    );

    const $onEnter = useCallback(
        (event: KeyboardEvent) => {
            const latestSelection = $getSelection();
            const buttonElem = buttonRef.current;
            if (
                isSelected &&
                $isNodeSelection(latestSelection) &&
                latestSelection.getNodes().length === 1
            ) {
                if (showCaption) {
                    // Move focus into nested editor
                    $setSelection(null);
                    event.preventDefault();
                    caption.focus();
                    return true;
                } else if (
                    buttonElem !== null &&
                    buttonElem !== document.activeElement
                ) {
                    event.preventDefault();
                    buttonElem.focus();
                    return true;
                }
            }
            return false;
        },
        [caption, isSelected, showCaption],
    );

    const $onEscape = useCallback(
        (event: KeyboardEvent) => {
            if (
                activeEditorRef.current === caption ||
                buttonRef.current === event.target
            ) {
                $setSelection(null);
                editor.update(() => {
                    setSelected(true);
                    const parentRootElement = editor.getRootElement();
                    if (parentRootElement !== null) {
                        parentRootElement.focus();
                    }
                });
                return true;
            }
            return false;
        },
        [caption, editor, setSelected],
    );

    useEffect(() => {
        let isMounted = true;
        const unregister = mergeRegister(
            editor.registerUpdateListener(({ editorState }) => {
                if (isMounted) {
                    setSelection(editorState.read(() => $getSelection()));
                }
            }),
            editor.registerCommand(
                SELECTION_CHANGE_COMMAND,
                (_, activeEditor) => {
                    activeEditorRef.current = activeEditor;
                    return false;
                },
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand<MouseEvent>(
                CLICK_COMMAND,
                (payload) => {
                    const event = payload;
                    if (event.target === imageRef.current) {
                        if (event.shiftKey) {
                            setSelected(!isSelected);
                        } else {
                            clearSelection();
                            setSelected(true);
                        }
                        return true;
                    }

                    return false;
                },
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(
                DRAGSTART_COMMAND,
                (event) => {
                    if (event.target === imageRef.current) {
                        // TODO This is just a temporary workaround for FF to behave like other browsers.
                        // Ideally, this handles drag & drop too (and all browsers).
                        event.preventDefault();
                        return true;
                    }
                    return false;
                },
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(
                KEY_DELETE_COMMAND,
                $onDelete,
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(
                KEY_BACKSPACE_COMMAND,
                $onDelete,
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(KEY_ENTER_COMMAND, $onEnter, COMMAND_PRIORITY_LOW),
            editor.registerCommand(
                KEY_ESCAPE_COMMAND,
                $onEscape,
                COMMAND_PRIORITY_LOW,
            ),
        );
        return () => {
            isMounted = false;
            unregister();
        };
    }, [
        clearSelection,
        editor,
        isSelected,
        nodeKey,
        $onDelete,
        $onEnter,
        $onEscape,
        setSelected,
    ]);

    const draggable = isSelected && $isNodeSelection(selection);
    const isFocused = isSelected && isEditable;
    return (
        <Suspense fallback={null}>
            <>
                <span draggable={draggable}>
                    {isEditable && (
                        <button
                            className="image-edit-button"
                            ref={buttonRef}
                            onClick={() => {
                                modal.show('Update Inline Image', UpdateInlineImageDialog, { editor, nodeKey });
                            }}>
                            Edit
                        </button>
                    )}
                    <LazyImage
                        className={
                            isFocused
                                ? `focused ${$isNodeSelection(selection) ? 'draggable' : ''}`
                                : null
                        }
                        src={src}
                        altText={altText}
                        imageRef={imageRef}
                        width={width}
                        height={height}
                        position={position}
                    />
                </span>
                {showCaption && (
                    <span className="image-caption-container">
                        <LexicalNestedComposer initialEditor={caption}>
                            <AutoFocusPlugin />
                            <LinkPlugin />
                            <RichTextPlugin
                                contentEditable={
                                    <ContentEditable
                                        placeholder="Enter a caption..."
                                        placeholderClassName="InlineImageNode__placeholder"
                                        className="InlineImageNode__contentEditable"
                                    />
                                }
                                ErrorBoundary={LexicalErrorBoundary}
                            />
                        </LexicalNestedComposer>
                    </span>
                )}
            </>
        </Suspense>
    );
}
