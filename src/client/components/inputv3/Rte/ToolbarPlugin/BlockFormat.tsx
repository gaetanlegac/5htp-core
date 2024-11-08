/*----------------------------------
- DEPENDANCES
----------------------------------*/

// npm
import React, { JSX } from 'react';
import {
    $createParagraphNode,
    $getSelection,
    $isRangeSelection,
    LexicalEditor,
} from 'lexical';

import {
    $setBlocksType,
} from '@lexical/selection';

import {
    $createHeadingNode,
    $createQuoteNode,
    HeadingTagType,
} from '@lexical/rich-text';

import {
    INSERT_CHECK_LIST_COMMAND,
    INSERT_ORDERED_LIST_COMMAND,
    INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list';

import {
    $createCodeNode,
} from '@lexical/code';

// Core
import Button from '@client/components/button';
import DropDown from '@client/components/dropdown';

/*----------------------------------
- TYPES
----------------------------------*/

const formatParagraph = (editor: LexicalEditor) => {
    editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createParagraphNode());
        }
    });
};

const formatHeading = (headingSize: HeadingTagType) => (editor: LexicalEditor, blockType: typeof blockTypeNames[number]) => {
    if (blockType !== headingSize) {
        editor.update(() => {
            const selection = $getSelection();
            $setBlocksType(selection, () => $createHeadingNode(headingSize));
        });
    }
};

const formatBulletList = (editor: LexicalEditor, blockType: typeof blockTypeNames[number]) => {
    if (blockType !== 'bullet') {
        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else {
        formatParagraph(editor);
    }
};

const formatCheckList = (editor: LexicalEditor, blockType: typeof blockTypeNames[number]) => {
    if (blockType !== 'check') {
        editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
    } else {
        formatParagraph(editor);
    }
};

const formatNumberedList = (editor: LexicalEditor, blockType: typeof blockTypeNames[number]) => {
    if (blockType !== 'number') {
        editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    } else {
        formatParagraph(editor);
    }
};

const formatQuote = (editor: LexicalEditor, blockType: typeof blockTypeNames[number]) => {
    if (blockType !== 'quote') {
        editor.update(() => {
            const selection = $getSelection();
            $setBlocksType(selection, () => $createQuoteNode());
        });
    }
};

const formatCode = (editor: LexicalEditor, blockType: typeof blockTypeNames[number]) => {
    if (blockType !== 'code') {
        editor.update(() => {
            let selection = $getSelection();

            if (selection !== null) {
                if (selection.isCollapsed()) {
                    $setBlocksType(selection, () => $createCodeNode());
                } else {
                    const textContent = selection.getTextContent();
                    const codeNode = $createCodeNode();
                    selection.insertNodes([codeNode]);
                    selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                        selection.insertRawText(textContent);
                    }
                }
            }
        });
    }
};

const blockTypes: {
    label: string;
    value: string;
    icon: string;
    onClick: (editor: LexicalEditor, blockType: string) => void;   
}[] = [{
    label: 'Bulleted List',
    value: 'bullet',
    icon: /* @icon */'list-ul',
    onClick: formatBulletList,
}, {
    label: 'Check List',
    value: 'check',
    icon: /* @icon */'check-square',
    onClick: formatCheckList,
}, {
    label: 'Code Block',
    value: 'code',
    icon: /* @icon */'code',
    onClick: formatCode,
}, {
    label: 'Heading 1',
    value: 'h1',
    icon: /* @icon */'h1',
    onClick: formatHeading('h1'),
}, {
    label: 'Heading 2',
    value: 'h2',
    icon: /* @icon */'h2',
    onClick: formatHeading('h2'),
}, {
    label: 'Heading 3',
    value: 'h3',
    icon: /* @icon */'h3',
    onClick: formatHeading('h3'),
}, {
    label: 'Heading 4',
    value: 'h4',
    icon: /* @icon */'h4',
    onClick: formatHeading('h4'),
}, {
    label: 'Heading 5',
    value: 'h5',
    icon: /* @icon */'h5',
    onClick: formatHeading('h5'),
}, {
    label: 'Heading 6',
    value: 'h6',
    icon: /* @icon */'h6',
    onClick: formatHeading('h6'),
}, {
    label: 'Numbered List',
    value: 'number',
    icon: /* @icon */'list-ol',
    onClick: formatNumberedList,
    
}, {
    label: 'Normal',
    value: 'paragraph',
    icon: /* @icon */'paragraph',
    onClick: formatParagraph,
}, {
    label: 'Quote',
    value: 'quote',
    icon: /* @icon */'quote-left',
    onClick: formatQuote,
}];

export const blockTypeNames = blockTypes.map((type) => type.value);

export const rootTypeToRootName = {
    root: 'Root',
    table: 'Table',
};

/*----------------------------------
- COMPONENT
----------------------------------*/
export default function BlockFormatDropDown({
    editor,
    blockType,
    rootType,
    disabled = false,
}: {
    blockType: typeof blockTypeNames[number];
    rootType: keyof typeof rootTypeToRootName;
    editor: LexicalEditor;
    disabled?: boolean;
}): JSX.Element {

    const currentBlockType = blockTypes.find((type) => type.value === blockType);

    return (
        <DropDown disabled={disabled} icon={currentBlockType ? currentBlockType.icon : 'question'} size="s"
            label={currentBlockType ? currentBlockType.label : 'Unknown Block Type'}
            popover={{ tag: 'li' }}
        >
            {blockTypes.map((block) => (
                <Button icon={block.icon}
                    onClick={() => block.onClick(editor, blockType)}>
                    {block.label}
                </Button>
            ))}
        </DropDown>
    );
}