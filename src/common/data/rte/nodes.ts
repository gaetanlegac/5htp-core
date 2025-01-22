/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { Klass, LexicalNode } from 'lexical';

import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { HashtagNode } from '@lexical/hashtag';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { MarkNode } from '@lexical/mark';
import { OverflowNode } from '@lexical/overflow';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';

import { CollapsibleContainerNode } from '@client/components/inputv3/Rte/plugins/CollapsiblePlugin/CollapsibleContainerNode';
import { CollapsibleContentNode } from '@client/components/inputv3/Rte/plugins/CollapsiblePlugin/CollapsibleContentNode';
import { CollapsibleTitleNode } from '@client/components/inputv3/Rte/plugins/CollapsiblePlugin/CollapsibleTitleNode';
import { AutocompleteNode } from '@client/components/inputv3/Rte/nodes/AutocompleteNode';
import { EmojiNode } from '@client/components/inputv3/Rte/nodes/EmojiNode';
import { ImageNode } from '@client/components/inputv3/Rte/nodes/ImageNode';
import { InlineImageNode } from '@client/components/inputv3/Rte/nodes/InlineImageNode/InlineImageNode';
import { KeywordNode } from '@client/components/inputv3/Rte/nodes/KeywordNode';
import { LayoutContainerNode } from '@client/components/inputv3/Rte/nodes/LayoutContainerNode';
import { LayoutItemNode } from '@client/components/inputv3/Rte/nodes/LayoutItemNode';
import { MentionNode } from '@client/components/inputv3/Rte/nodes/MentionNode';
import { PageBreakNode } from '@client/components/inputv3/Rte/nodes/PageBreakNode';
import { PollNode } from '@client/components/inputv3/Rte/nodes/PollNode';
import { StickyNode } from '@client/components/inputv3/Rte/nodes/StickyNode';
import { TweetNode } from '@client/components/inputv3/Rte/nodes/TweetNode';
import { YouTubeNode } from '@client/components/inputv3/Rte/nodes/YouTubeNode';

import HeadingWithAnchorNode from '@client/components/inputv3/Rte/nodes/HeadingNode';
import ReferenceLinkNode from '@client/components/inputv3/Rte/nodes/ReferenceLinkNode';

const PlaygroundNodes: Array<Klass<LexicalNode>> = [
    /*HeadingNode, */HeadingWithAnchorNode,
    {
        replace: HeadingNode,
        with: (node) => {
            return new HeadingWithAnchorNode( node.getTag() );
        }
    },
    ListNode,
    ListItemNode,
    QuoteNode,
    CodeNode,
    TableNode,
    TableCellNode,
    TableRowNode,
    HashtagNode,
    CodeHighlightNode,
    AutoLinkNode,
    LinkNode,
    OverflowNode,
    PollNode,
    StickyNode,
    ImageNode, InlineImageNode,
    MentionNode,
    EmojiNode,
    AutocompleteNode,
    KeywordNode,
    HorizontalRuleNode,
    TweetNode,
    YouTubeNode,
    MarkNode,
    CollapsibleContainerNode,
    CollapsibleContentNode,
    CollapsibleTitleNode,
    PageBreakNode,
    LayoutContainerNode,
    LayoutItemNode,

    // Custom
    ReferenceLinkNode
];

export default PlaygroundNodes;
