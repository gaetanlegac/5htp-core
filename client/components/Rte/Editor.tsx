/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

// Lexical
import { EditorState, createEditor } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import RichEditorUtils from './currentEditor';
import { CharacterLimitPlugin } from '@lexical/react/LexicalCharacterLimitPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { ClearEditorPlugin } from '@lexical/react/LexicalClearEditorPlugin';
import { ClickableLinkPlugin } from '@lexical/react/LexicalClickableLinkPlugin';
import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin';
import { HashtagPlugin } from '@lexical/react/LexicalHashtagPlugin';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';

// Lexical plugins
//import { CAN_USE_DOM } from 'shared/canUseDOM';

import { useSettings } from './context/SettingsContext';
import { useSharedHistoryContext } from './context/SharedHistoryContext';
import ActionsPlugin from './plugins/ActionsPlugin';
import AutocompletePlugin from './plugins/AutocompletePlugin';
import AutoEmbedPlugin from './plugins/AutoEmbedPlugin';
import AutoLinkPlugin from './plugins/AutoLinkPlugin';
import CodeActionMenuPlugin from './plugins/CodeActionMenuPlugin';
import CodeHighlightPlugin from './plugins/CodeHighlightPlugin';
import CollapsiblePlugin from './plugins/CollapsiblePlugin';
import ComponentPickerPlugin from './plugins/ComponentPickerPlugin';
import ContextMenuPlugin from './plugins/ContextMenuPlugin';
import DragDropPaste from './plugins/DragDropPastePlugin';
import DraggableBlockPlugin from './plugins/DraggableBlockPlugin';
import EmojiPickerPlugin from './plugins/EmojiPickerPlugin';
import EmojisPlugin from './plugins/EmojisPlugin';
import FloatingLinkEditorPlugin from './plugins/FloatingLinkEditorPlugin';
import FloatingTextFormatToolbarPlugin from './plugins/FloatingTextFormatToolbarPlugin';
import ImagesPlugin from './plugins/ImagesPlugin';
import InlineImagePlugin from './plugins/InlineImagePlugin';
import KeywordsPlugin from './plugins/KeywordsPlugin';
import { LayoutPlugin } from './plugins/LayoutPlugin/LayoutPlugin';
import LinkPlugin from './plugins/LinkPlugin';
import ListMaxIndentLevelPlugin from './plugins/ListMaxIndentLevelPlugin';
import MarkdownShortcutPlugin from './plugins/MarkdownShortcutPlugin';
import { MaxLengthPlugin } from './plugins/MaxLengthPlugin';
import MentionsPlugin from './plugins/MentionsPlugin';
import PageBreakPlugin from './plugins/PageBreakPlugin';
import PollPlugin from './plugins/PollPlugin';
import SpeechToTextPlugin from './plugins/SpeechToTextPlugin';
import TabFocusPlugin from './plugins/TabFocusPlugin';
import TableCellActionMenuPlugin from './plugins/TableActionMenuPlugin';
import TableCellResizer from './plugins/TableCellResizer';
import TableHoverActionsPlugin from './plugins/TableHoverActionsPlugin';
import TableOfContentsPlugin from './plugins/TableOfContentsPlugin';
import TreeViewPlugin from './plugins/TreeViewPlugin';
import TwitterPlugin from './plugins/TwitterPlugin';
import YouTubePlugin from './plugins/YouTubePlugin';

// Core libs
import editorNodes from '@common/data/rte/nodes';
import type { Props as TRteProps } from '.';

// Special componets
import ExampleTheme from './themes/PlaygroundEditorTheme';
import ToolbarPlugin from './ToolbarPlugin';

export const EMPTY_STATE = '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';

/*----------------------------------
- TYPES
----------------------------------*/

const ValueControlPlugin = ({ props, value }) => {

    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        if (props.value && props.value !== value) {

            const initialEditorState = editor.parseEditorState(props.value)
            editor.setEditorState(initialEditorState);
        }
    }, [props.value]);

    return null;
}

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default ({ value, setValue, props }: {
    value: string,
    setValue: (value: string) => void,
    props: TRteProps
}) => {
    
    let {
        // Decoration
        title,
        // Actions
        preview = true
    } = props;

    /*----------------------------------
    - PREVIEW
    ----------------------------------*/

    const [isPreview, setIsPreview] = React.useState(preview);
    const [html, setHTML] = React.useState(null);

    React.useEffect(() => {
        if (isPreview) {
            renderPreview(value).then(setHTML);
        }
    }, [value, isPreview]);

    // When isPreview changes, close the active editor
    React.useEffect(() => {
        if (!isPreview) {

            // Close active editor
            if (RichEditorUtils.active && RichEditorUtils.active?.title !== title)
                RichEditorUtils.active.close();

            // Set active Editor
            RichEditorUtils.active = {
                title,
                close: () => preview ? setIsPreview(true) : null
            }

        }
    }, [isPreview]);

    const renderPreview = async (value: {} | undefined) => {

        if (!value)
            return '';

        if (typeof document === 'undefined')
            throw new Error("HTML preview disabled in server side.");

        const html = await RichEditorUtils.jsonToHtml(value);

        return html;
    }

    if (isPreview)
        return (
            html === null ? (
                <div class="col al-center h-2">
                    <i src="spin" />
                </div>
            ) : (
                <div class="preview reading h-1-4 scrollable col clickable" 
                    onClick={() => setIsPreview(false)}
                    dangerouslySetInnerHTML={{ __html: html }} />
            )
        )

    /*----------------------------------
    - INIT
    ----------------------------------*/

    // Trigger onchange oly when finished typing
    const refCommit = React.useRef<NodeJS.Timeout | null>(null);

    const onRef = (_floatingAnchorElem: HTMLDivElement) => {
        if (_floatingAnchorElem !== null) {
            setFloatingAnchorElem(_floatingAnchorElem);
        }
    };

    const { historyState } = useSharedHistoryContext();
    const {
        settings: {
            isCollab,
            isAutocomplete,
            isMaxLength,
            isCharLimit,
            hasLinkAttributes,
            isCharLimitUtf8,
            isRichText,
            showTreeView,
            showTableOfContents,
            shouldUseLexicalContextMenu,
            shouldPreserveNewLinesInMarkdown,
            tableCellMerge,
            tableCellBackgroundColor,
        },
    } = useSettings();

    const [floatingAnchorElem, setFloatingAnchorElem] = React.useState<HTMLDivElement | null>(null);
    const [isSmallWidthViewport, setIsSmallWidthViewport] = React.useState<boolean>(false);
    const [isLinkEditMode, setIsLinkEditMode] = React.useState<boolean>(false);

    /*----------------------------------
    - ACTIONS
    ----------------------------------*/

    const onChange = (editorState: EditorState) => {
        editorState.read(() => {

            if (refCommit.current !== null)
                clearTimeout(refCommit.current);

            refCommit.current = setTimeout(() => {

                const stateJson = JSON.stringify(editorState.toJSON());

                setValue(stateJson);

            }, 100);
        });
    };

    /*----------------------------------
    - RENDER
    ----------------------------------*/
    return (
        <LexicalComposer initialConfig={{
            editorState: value || EMPTY_STATE,
            nodes: editorNodes,
            // Handling of errors during update
            onError(error: Error) { throw error; },
            // The editor theme
            theme: ExampleTheme,
        }}>
            <div className="editor-container">
                <ToolbarPlugin setIsLinkEditMode={setIsLinkEditMode} />
                <div className="editor-inner">
                    <RichTextPlugin
                        contentEditable={
                            <div className="editor" ref={onRef}>
                                <ContentEditable
                                    className="editor-input reading col"
                                    aria-placeholder={"Type text here ..."}
                                    placeholder={
                                        <div className="editor-placeholder">Type text here ...</div>
                                    }
                                />
                            </div>
                        }
                        ErrorBoundary={LexicalErrorBoundary}
                    />

                    <HistoryPlugin externalHistoryState={historyState} />
                    <AutoFocusPlugin />
                    <OnChangePlugin onChange={onChange} />
                    <ValueControlPlugin props={props} value={value} />

                    {isMaxLength && <MaxLengthPlugin maxLength={30} />}
                    <DragDropPaste />
                    {props.preview && <AutoFocusPlugin />}
                    <ClearEditorPlugin />
                    <ComponentPickerPlugin />
                    <EmojiPickerPlugin />
                    <AutoEmbedPlugin />

                    <MentionsPlugin />
                    <EmojisPlugin />
                    <HashtagPlugin />
                    <KeywordsPlugin />
                    <SpeechToTextPlugin />
                    <AutoLinkPlugin />
                    <CodeHighlightPlugin />
                    <ListPlugin />
                    <CheckListPlugin />
                    <ListMaxIndentLevelPlugin maxDepth={7} />
                    <TablePlugin
                        hasCellMerge={tableCellMerge}
                        hasCellBackgroundColor={tableCellBackgroundColor}
                    />
                    <TableCellResizer />
                    <ImagesPlugin />
                    <InlineImagePlugin />
                    <LinkPlugin hasLinkAttributes={hasLinkAttributes} />
                    <PollPlugin />
                    <TwitterPlugin />
                    <YouTubePlugin />
                    <ClickableLinkPlugin />
                    <HorizontalRulePlugin />
                    {/* <EquationsPlugin /> */}
                    {/* <ExcalidrawPlugin /> */}
                    <TabFocusPlugin />
                    <TabIndentationPlugin />
                    <CollapsiblePlugin />
                    <PageBreakPlugin />
                    <LayoutPlugin />

                    <MarkdownShortcutPlugin />

                    {floatingAnchorElem && !isSmallWidthViewport && (
                        <>
                            <DraggableBlockPlugin anchorElem={floatingAnchorElem} />
                            <CodeActionMenuPlugin anchorElem={floatingAnchorElem} />
                            <FloatingLinkEditorPlugin
                                anchorElem={floatingAnchorElem}
                                isLinkEditMode={isLinkEditMode}
                                setIsLinkEditMode={setIsLinkEditMode}
                            />
                            <TableCellActionMenuPlugin
                                anchorElem={floatingAnchorElem}
                                cellMerge={true}
                            />
                            <TableHoverActionsPlugin anchorElem={floatingAnchorElem} />
                            <FloatingTextFormatToolbarPlugin
                                anchorElem={floatingAnchorElem}
                                setIsLinkEditMode={setIsLinkEditMode}
                            />
                        </>
                    )}

                    {(isCharLimit || isCharLimitUtf8) && (
                        <CharacterLimitPlugin
                            charset={isCharLimit ? 'UTF-16' : 'UTF-8'}
                            maxLength={5}
                        />
                    )}
                    {isAutocomplete && <AutocompletePlugin />}
                </div>
            </div>
        </LexicalComposer>   
    )
}
