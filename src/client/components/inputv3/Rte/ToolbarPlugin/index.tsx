/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Core
import Button from '@client/components/button';
import DropDown from '@client/components/dropdown';
import useContext from '@/client/context';

// Local
import ElementFormatDropdown from './ElementFormat';
import BlockFormatDropDown, { blockTypeNames, rootTypeToRootName } from './BlockFormat';

import {
    $isCodeNode,
    CODE_LANGUAGE_FRIENDLY_NAME_MAP,
    CODE_LANGUAGE_MAP,
    getLanguageFriendlyName,
} from '@lexical/code';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import {
    $isListNode,
    ListNode,
} from '@lexical/list';
import { INSERT_EMBED_COMMAND } from '@lexical/react/LexicalAutoEmbedPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isDecoratorBlockNode } from '@lexical/react/LexicalDecoratorBlockNode';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import {
    $isHeadingNode,
    $isQuoteNode,
} from '@lexical/rich-text';
import {
    $getSelectionStyleValueForProperty,
    $isParentElementRTL,
    $patchStyleText,
} from '@lexical/selection';
import { $isTableNode, $isTableSelection } from '@lexical/table';
import {
    $findMatchingParent,
    $getNearestBlockElementAncestorOrThrow,
    $getNearestNodeOfType,
    $isEditorIsNestedEditor,
    mergeRegister,
} from '@lexical/utils';
import {
    $createParagraphNode,
    $getNodeByKey,
    $getRoot,
    $getSelection,
    $isElementNode,
    $isRangeSelection,
    $isRootOrShadowRoot,
    $isTextNode,
    CAN_REDO_COMMAND,
    CAN_UNDO_COMMAND,
    COMMAND_PRIORITY_CRITICAL,
    COMMAND_PRIORITY_NORMAL,
    ElementFormatType,
    FORMAT_ELEMENT_COMMAND,
    FORMAT_TEXT_COMMAND,
    INDENT_CONTENT_COMMAND,
    KEY_MODIFIER_COMMAND,
    LexicalEditor,
    NodeKey,
    OUTDENT_CONTENT_COMMAND,
    REDO_COMMAND,
    SELECTION_CHANGE_COMMAND,
    UNDO_COMMAND,
} from 'lexical';
import { Dispatch, useCallback, useEffect, useState } from 'react';
import * as React from 'react';
import { IS_APPLE } from '../shared/environment';

import { $createStickyNode } from '../nodes/StickyNode';
//import DropdownColorPicker from '../../ui/DropdownColorPicker';
import { getSelectedNode } from '../utils/getSelectedNode';
import { sanitizeUrl } from '../utils/url';

import { EmbedConfigs } from '../plugins/AutoEmbedPlugin';
import { INSERT_COLLAPSIBLE_COMMAND } from '../plugins/CollapsiblePlugin';
import {
    INSERT_IMAGE_COMMAND,
    InsertImageDialog,
    InsertImagePayload,
} from '../plugins/ImagesPlugin';
import { InsertInlineImageDialog } from '../plugins/InlineImagePlugin';
import InsertLayoutDialog from '../plugins/LayoutPlugin/InsertLayoutDialog';
import { INSERT_PAGE_BREAK } from '../plugins/PageBreakPlugin';
import { InsertPollDialog } from '../plugins/PollPlugin';
import { InsertTableDialog } from '../plugins/TablePlugin';

function getCodeLanguageOptions(): [string, string][] {
    const options: [string, string][] = [];

    for (const [lang, friendlyName] of Object.entries(
        CODE_LANGUAGE_FRIENDLY_NAME_MAP,
    )) {
        options.push([lang, friendlyName]);
    }

    return options;
}

const CODE_LANGUAGE_OPTIONS = getCodeLanguageOptions();

function dropDownActiveClass(active: boolean) {
    if (active) {
        return 'active dropdown-item-active';
    } else {
        return '';
    }
}



function Divider(): React.JSX.Element {
    return <div className="divider" />;
}

export default function ToolbarPlugin({
    setIsLinkEditMode,
}: {
    setIsLinkEditMode: Dispatch<boolean>;
}): React.JSX.Element {

    const { modal } = useContext();

    const [editor] = useLexicalComposerContext();
    const [activeEditor, setActiveEditor] = useState(editor);
    const [blockType, setBlockType] =
        useState<typeof blockTypeNames[number]>('paragraph');
    const [rootType, setRootType] =
        useState<keyof typeof rootTypeToRootName>('root');
    const [selectedElementKey, setSelectedElementKey] = useState<NodeKey | null>(
        null,
    );
    const [fontSize, setFontSize] = useState<string>('15px');
    const [fontColor, setFontColor] = useState<string>('#000');
    const [bgColor, setBgColor] = useState<string>('#fff');
    const [fontFamily, setFontFamily] = useState<string>('Arial');
    const [elementFormat, setElementFormat] = useState<ElementFormatType>('left');
    const [isLink, setIsLink] = useState(false);
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [isStrikethrough, setIsStrikethrough] = useState(false);
    const [isSubscript, setIsSubscript] = useState(false);
    const [isSuperscript, setIsSuperscript] = useState(false);
    const [isCode, setIsCode] = useState(false);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [isRTL, setIsRTL] = useState(false);
    const [codeLanguage, setCodeLanguage] = useState<string>('');
    const [isEditable, setIsEditable] = useState(() => editor.isEditable());
    const [isImageCaption, setIsImageCaption] = useState(false);

    const $updateToolbar = useCallback(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
            if (activeEditor !== editor && $isEditorIsNestedEditor(activeEditor)) {
                const rootElement = activeEditor.getRootElement();
                setIsImageCaption(
                    !!rootElement?.parentElement?.classList.contains(
                        'image-caption-container',
                    ),
                );
            } else {
                setIsImageCaption(false);
            }

            const anchorNode = selection.anchor.getNode();
            let element =
                anchorNode.getKey() === 'root'
                    ? anchorNode
                    : $findMatchingParent(anchorNode, (e) => {
                        const parent = e.getParent();
                        return parent !== null && $isRootOrShadowRoot(parent);
                    });

            if (element === null) {
                element = anchorNode.getTopLevelElementOrThrow();
            }

            const elementKey = element.getKey();
            const elementDOM = activeEditor.getElementByKey(elementKey);

            setIsRTL($isParentElementRTL(selection));

            // Update links
            const node = getSelectedNode(selection);
            const parent = node.getParent();
            if ($isLinkNode(parent) || $isLinkNode(node)) {
                setIsLink(true);
            } else {
                setIsLink(false);
            }

            const tableNode = $findMatchingParent(node, $isTableNode);
            if ($isTableNode(tableNode)) {
                setRootType('table');
            } else {
                setRootType('root');
            }

            if (elementDOM !== null) {
                setSelectedElementKey(elementKey);
                if ($isListNode(element)) {
                    const parentList = $getNearestNodeOfType<ListNode>(
                        anchorNode,
                        ListNode,
                    );
                    const type = parentList
                        ? parentList.getListType()
                        : element.getListType();
                    setBlockType(type);
                } else {
                    const type = $isHeadingNode(element)
                        ? element.getTag()
                        : element.getType();
                    if (blockTypeNames.includes(type)) {
                        setBlockType(type as typeof blockTypeNames[number]);
                    }
                    if ($isCodeNode(element)) {
                        const language =
                            element.getLanguage() as keyof typeof CODE_LANGUAGE_MAP;
                        setCodeLanguage(
                            language ? CODE_LANGUAGE_MAP[language] || language : '',
                        );
                        return;
                    }
                }
            }
            // Handle buttons
            setFontColor(
                $getSelectionStyleValueForProperty(selection, 'color', '#000'),
            );
            setBgColor(
                $getSelectionStyleValueForProperty(
                    selection,
                    'background-color',
                    '#fff',
                ),
            );
            setFontFamily(
                $getSelectionStyleValueForProperty(selection, 'font-family', 'Arial'),
            );
            let matchingParent;
            if ($isLinkNode(parent)) {
                // If node is a link, we need to fetch the parent paragraph node to set format
                matchingParent = $findMatchingParent(
                    node,
                    (parentNode) => $isElementNode(parentNode) && !parentNode.isInline(),
                );
            }

            // If matchingParent is a valid node, pass it's format type
            setElementFormat(
                $isElementNode(matchingParent)
                    ? matchingParent.getFormatType()
                    : $isElementNode(node)
                        ? node.getFormatType()
                        : parent?.getFormatType() || 'left',
            );
        }
        if ($isRangeSelection(selection) || $isTableSelection(selection)) {
            // Update text format
            setIsBold(selection.hasFormat('bold'));
            setIsItalic(selection.hasFormat('italic'));
            setIsUnderline(selection.hasFormat('underline'));
            setIsStrikethrough(selection.hasFormat('strikethrough'));
            setIsSubscript(selection.hasFormat('subscript'));
            setIsSuperscript(selection.hasFormat('superscript'));
            setIsCode(selection.hasFormat('code'));

            setFontSize(
                $getSelectionStyleValueForProperty(selection, 'font-size', '15px'),
            );
        }
    }, [activeEditor, editor]);

    useEffect(() => {
        return editor.registerCommand(
            SELECTION_CHANGE_COMMAND,
            (_payload, newEditor) => {
                setActiveEditor(newEditor);
                $updateToolbar();
                return false;
            },
            COMMAND_PRIORITY_CRITICAL,
        );
    }, [editor, $updateToolbar]);

    useEffect(() => {
        activeEditor.getEditorState().read(() => {
            $updateToolbar();
        });
    }, [activeEditor, $updateToolbar]);

    useEffect(() => {
        return mergeRegister(
            editor.registerEditableListener((editable) => {
                setIsEditable(editable);
            }),
            activeEditor.registerUpdateListener(({ editorState }) => {
                editorState.read(() => {
                    $updateToolbar();
                });
            }),
            activeEditor.registerCommand<boolean>(
                CAN_UNDO_COMMAND,
                (payload) => {
                    setCanUndo(payload);
                    return false;
                },
                COMMAND_PRIORITY_CRITICAL,
            ),
            activeEditor.registerCommand<boolean>(
                CAN_REDO_COMMAND,
                (payload) => {
                    setCanRedo(payload);
                    return false;
                },
                COMMAND_PRIORITY_CRITICAL,
            ),
        );
    }, [$updateToolbar, activeEditor, editor]);

    useEffect(() => {
        return activeEditor.registerCommand(
            KEY_MODIFIER_COMMAND,
            (payload) => {
                const event: KeyboardEvent = payload;
                const { code, ctrlKey, metaKey } = event;

                if (code === 'KeyK' && (ctrlKey || metaKey)) {
                    event.preventDefault();
                    let url: string | null;
                    if (!isLink) {
                        setIsLinkEditMode(true);
                        url = sanitizeUrl('https://');
                    } else {
                        setIsLinkEditMode(false);
                        url = null;
                    }
                    return activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
                }
                return false;
            },
            COMMAND_PRIORITY_NORMAL,
        );
    }, [activeEditor, isLink, setIsLinkEditMode]);

    const applyStyleText = useCallback(
        (styles: Record<string, string>, skipHistoryStack?: boolean) => {
            activeEditor.update(
                () => {
                    const selection = $getSelection();
                    if (selection !== null) {
                        $patchStyleText(selection, styles);
                    }
                },
                skipHistoryStack ? { tag: 'historic' } : {},
            );
        },
        [activeEditor],
    );

    const clearFormatting = useCallback(() => {
        activeEditor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection) || $isTableSelection(selection)) {
                const anchor = selection.anchor;
                const focus = selection.focus;
                const nodes = selection.getNodes();
                const extractedNodes = selection.extract();

                if (anchor.key === focus.key && anchor.offset === focus.offset) {
                    return;
                }

                nodes.forEach((node, idx) => {
                    // We split the first and last node by the selection
                    // So that we don't format unselected text inside those nodes
                    if ($isTextNode(node)) {
                        // Use a separate variable to ensure TS does not lose the refinement
                        let textNode = node;
                        if (idx === 0 && anchor.offset !== 0) {
                            textNode = textNode.splitText(anchor.offset)[1] || textNode;
                        }
                        if (idx === nodes.length - 1) {
                            textNode = textNode.splitText(focus.offset)[0] || textNode;
                        }
                        /**
                         * If the selected text has one format applied
                         * selecting a portion of the text, could
                         * clear the format to the wrong portion of the text.
                         *
                         * The cleared text is based on the length of the selected text.
                         */
                        // We need this in case the selected text only has one format
                        const extractedTextNode = extractedNodes[0];
                        if (nodes.length === 1 && $isTextNode(extractedTextNode)) {
                            textNode = extractedTextNode;
                        }

                        if (textNode.__style !== '') {
                            textNode.setStyle('');
                        }
                        if (textNode.__format !== 0) {
                            textNode.setFormat(0);
                            $getNearestBlockElementAncestorOrThrow(textNode).setFormat('');
                        }
                        node = textNode;
                    } else if ($isHeadingNode(node) || $isQuoteNode(node)) {
                        node.replace($createParagraphNode(), true);
                    } else if ($isDecoratorBlockNode(node)) {
                        node.setFormat('');
                    }
                });
            }
        });
    }, [activeEditor]);

    const onFontColorSelect = useCallback(
        (value: string, skipHistoryStack: boolean) => {
            applyStyleText({ color: value }, skipHistoryStack);
        },
        [applyStyleText],
    );

    const onBgColorSelect = useCallback(
        (value: string, skipHistoryStack: boolean) => {
            applyStyleText({ 'background-color': value }, skipHistoryStack);
        },
        [applyStyleText],
    );

    const insertLink = useCallback(() => {
        if (!isLink) {
            setIsLinkEditMode(true);
            activeEditor.dispatchCommand(
                TOGGLE_LINK_COMMAND,
                sanitizeUrl('https://'),
            );
        } else {
            setIsLinkEditMode(false);
            activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
        }
    }, [activeEditor, isLink, setIsLinkEditMode]);

    const onCodeLanguageSelect = useCallback(
        (value: string) => {
            activeEditor.update(() => {
                if (selectedElementKey !== null) {
                    const node = $getNodeByKey(selectedElementKey);
                    if ($isCodeNode(node)) {
                        node.setLanguage(value);
                    }
                }
            });
        },
        [activeEditor, selectedElementKey],
    );
    const insertGifOnClick = (payload: InsertImagePayload) => {
        activeEditor.dispatchCommand(INSERT_IMAGE_COMMAND, payload);
    };

    const canViewerSeeInsertDropdown = !isImageCaption;
    const canViewerSeeInsertCodeButton = !isImageCaption;

    return (
        <div className="row menu al-left" style={{ 
            position: 'sticky', 
            top: 0, 
            background: 'white', 
            'zIndex': 5 
        }}>

            {/* <Button icon="undo" size="s"
                disabled={!canUndo || !isEditable}
                title={IS_APPLE ? 'Undo (⌘Z)' : 'Undo (Ctrl+Z)'} 
                onClick={() => {
                    activeEditor.dispatchCommand(UNDO_COMMAND, undefined);
                }}/>

            <Button icon="redo" size="s"
                disabled={!canRedo || !isEditable}
                title={IS_APPLE ? 'Redo (⇧⌘Z)' : 'Redo (Ctrl+Y)'}
                onClick={() => {
                    activeEditor.dispatchCommand(REDO_COMMAND, undefined);
                }}/>

            <Divider /> */}

            {blockTypeNames.includes(blockType) && activeEditor === editor && (
                <>
                    <BlockFormatDropDown
                        disabled={!isEditable}
                        blockType={blockType}
                        rootType={rootType}
                        editor={activeEditor}
                    />
                    <Divider />
                </>
            )}
            
            {blockType === 'code' ? (
                <DropDown popover={{ tag: 'li' }}
                    disabled={!isEditable}
                    icon="code"
                    content={(
                        <div class="card bg white col menu w-3">
                            {CODE_LANGUAGE_OPTIONS.map(([value, name]) => (
                                <Button size="s"
                                    active={value === codeLanguage}
                                    onClick={() => onCodeLanguageSelect(value)}
                                    key={value}
                                >
                                    {name}
                                </Button>
                            ))}
                        </div>
                    )}
                >
                    {getLanguageFriendlyName(codeLanguage)}
                </DropDown>
            ) : (
                <>
                    <Button icon="bold" size="s"
                        disabled={!isEditable}
                        onClick={() => {
                            activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
                        }}
                        active={isBold}
                        title={IS_APPLE ? 'Bold (⌘B)' : 'Bold (Ctrl+B)'}
                    />
                    <Button icon="italic" size="s"
                        disabled={!isEditable}
                        onClick={() => {
                            activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
                        }}
                        active={isItalic}
                        title={IS_APPLE ? 'Italic (⌘I)' : 'Italic (Ctrl+I)'}
                    />
                    <Button icon="underline" size="s"
                        disabled={!isEditable}
                        onClick={() => {
                            activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
                        }}
                        active={isUnderline}
                        title={IS_APPLE ? 'Underline (⌘U)' : 'Underline (Ctrl+U)'}
                    />

                    {canViewerSeeInsertCodeButton && (
                        <Button icon="code" size="s"
                            disabled={!isEditable}
                            onClick={() => {
                                activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code');
                            }}
                            active={isCode}
                            title="Insert code block"
                        />
                    )}
                    <Button icon="link" size="s"
                        disabled={!isEditable}
                        onClick={insertLink}
                        active={isLink}
                        title="Insert link"
                    />

                    {/* <DropdownColorPicker
                        disabled={!isEditable}
                        buttonClassName="toolbar-item color-picker"
                        buttonAriaLabel="Formatting text color"
                        buttonIconClassName="icon font-color"
                        color={fontColor}
                        onChange={onFontColorSelect}
                        title="text color"
                    />
                    <DropdownColorPicker
                        disabled={!isEditable}
                        buttonClassName="toolbar-item color-picker"
                        buttonAriaLabel="Formatting background color"
                        buttonIconClassName="icon bg-color"
                        color={bgColor}
                        onChange={onBgColorSelect}
                        title="bg color"
                    /> */}

                    <DropDown popover={{ tag: 'li' }} icon="font" size="s"
                        disabled={!isEditable}
                        title="Formatting options for additional text styles"
                    >

                        <Button icon="strikethrough" size="s"
                            onClick={() => {
                                activeEditor.dispatchCommand( FORMAT_TEXT_COMMAND, 'strikethrough');
                            }}
                            active={isStrikethrough}
                            title="Format text with a strikethrough"
                        >
                            Strikethrough
                        </Button>

                        <Button icon="subscript" size="s"
                            onClick={() => {
                                activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'subscript');
                            }}
                            active={isSubscript}
                            title="Format text with a subscript"
                        >
                            Subscript
                        </Button>

                        <Button icon="superscript" size="s"
                            onClick={() => {
                                activeEditor.dispatchCommand(
                                    FORMAT_TEXT_COMMAND,
                                    'superscript',
                                );
                            }}
                            active={isSuperscript}
                            title="Format text with a superscript">
                            Superscript
                        </Button>

                        <Button icon="empty-set" size="s"
                            onClick={clearFormatting}
                            title="Clear all text formatting">
                            Clear Formatting
                        </Button>

                    </DropDown>

                    {canViewerSeeInsertDropdown && (
                        <>
                            <Divider />
                            <DropDown popover={{ tag: 'li' }}
                                disabled={!isEditable}
                                size="s"
                                label="Insert"
                                title="Insert specialized editor node"
                            >

                                <Button icon="horizontal-rule" size="s" onClick={() => {
                                    activeEditor.dispatchCommand( INSERT_HORIZONTAL_RULE_COMMAND, undefined, );
                                }}>
                                    Horizontal Rule
                                </Button>

                                <Button icon="page-break" size="s" onClick={() => {
                                    activeEditor.dispatchCommand(INSERT_PAGE_BREAK, undefined);
                                }}>
                                    Page Break
                                </Button>

                                <Button icon="image" size="s" onClick={() => {
                                    modal.show('Insert Image', InsertImageDialog, { editor: activeEditor });
                                }}>
                                    Image
                                </Button>

                                <Button icon="image" size="s" onClick={() => {
                                    modal.show('Insert Inline Image', InsertInlineImageDialog, { editor: activeEditor });
                                }}>
                                    Inline Image
                                </Button>

                                {/* <Button
                                    onClick={() => {
                                        activeEditor.dispatchCommand(
                                            INSERT_EXCALIDRAW_COMMAND,
                                            undefined,
                                        );
                                    }}
                                    className="item">
                                    <i className="icon diagram-2" />
                                    <span className="text">Excalidraw</span>
                                </Button> */}

                                <Button icon="table" size="s" onClick={() => {
                                    modal.show('Insert Table', InsertTableDialog, { editor: activeEditor });
                                }}>
                                    Table
                                </Button>

                                <Button icon="poll" size="s" onClick={() => {
                                    modal.show('Insert Poll', InsertPollDialog, { editor: activeEditor });
                                }}>
                                   Poll
                                </Button>

                                <Button icon="columns" size="s" onClick={() => {
                                    modal.show('Insert Columns Layout', InsertLayoutDialog, { editor: activeEditor });
                                }} >
                                    Columns Layout
                                </Button>

                                {/* <Button
                                    onClick={() => {
                                        modal.show('Insert Equation', (onClose) => (
                                            <InsertEquationDialog
                                                activeEditor={activeEditor}
                                                onClose={onClose}
                                            />
                                        ));
                                    }}
                                    className="item">
                                    <i className="icon equation" />
                                    <span className="text">Equation</span>
                                </Button> */}

                                <Button icon="sticky-note" size="s" onClick={() => {
                                    editor.update(() => {
                                        const root = $getRoot();
                                        const stickyNode = $createStickyNode(0, 0);
                                        root.append(stickyNode);
                                    });
                                }}>
                                    Sticky Note
                                </Button>

                                <Button icon="caret-right" size="s" onClick={() => {
                                    editor.dispatchCommand(
                                        INSERT_COLLAPSIBLE_COMMAND,
                                        undefined,
                                    );
                                }}>
                                    Collapsible container
                                </Button>

                                {/*EmbedConfigs.map((embedConfig) => (
                                    <Button
                                        key={embedConfig.type}
                                        onClick={() => {
                                            activeEditor.dispatchCommand(
                                                INSERT_EMBED_COMMAND,
                                                embedConfig.type,
                                            );
                                        }}>
                                        {embedConfig.icon}
                                        <span className="text">{embedConfig.contentName}</span>
                                    </Button>
                                ))*/}
                            </DropDown>
                        </>
                    )}
                </>
            )}
            <Divider />
            <ElementFormatDropdown
                disabled={!isEditable}
                value={elementFormat}
                editor={activeEditor}
                isRTL={isRTL}
            />
        </div>
    );
}