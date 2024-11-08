/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import { createHeadlessEditor } from '@lexical/headless';
import { $generateNodesFromDOM, $generateHtmlFromNodes } from '@lexical/html';
import { $getRoot, SerializedEditorState } from 'lexical';
import { JSDOM } from 'jsdom';

// Core
import editorNodes from '@common/data/rte/nodes';
import ExampleTheme from '@client/components/inputv3/Rte/themes/PlaygroundEditorTheme';

/*----------------------------------
- FUNCTIONS
----------------------------------*/
export const htmlToJson = async (htmlString: string): Promise<SerializedEditorState> => {

    const editor = createHeadlessEditor({
        nodes: editorNodes,
        theme: ExampleTheme,
    });

    await editor.update(() => {

        const root = $getRoot();

        const dom = new JSDOM(htmlString);

        // Once you have the DOM instance it's easy to generate LexicalNodes.
        const lexicalNodes = $generateNodesFromDOM(editor, dom ? dom.window.document : window.document);

        lexicalNodes.forEach((node) => root.append(node));
    });

    const state = editor.getEditorState();
    return state.toJSON();
};

export const jsonToHtml = async (jsonString: string) => {

    // Server side: simulate DOM environment
    const dom = new JSDOM(`<!DOCTYPE html><body></body>`);
    global.window = dom.window;
    global.document = dom.window.document;
    global.DOMParser = dom.window.DOMParser;
    global.MutationObserver = dom.window.MutationObserver;

    // Create a headless Lexical editor instance
    const editor = createHeadlessEditor({
        namespace: 'headless',
        editable: false,
        nodes: editorNodes,
        theme: ExampleTheme,
    });

    // Set the editor state from JSON
    const state = editor.parseEditorState(jsonString);
    if (state.isEmpty())
        return null;

    editor.setEditorState(state);

    // Generate HTML from the Lexical nodes
    const html = await editor.getEditorState().read(() => {
        return $generateHtmlFromNodes(editor);
    });

        // Clean up global variables set for JSDOM to avoid memory leaks
    delete global.window;
    delete global.document;
    delete global.DOMParser;
    delete global.MutationObserver;

    return html;
}