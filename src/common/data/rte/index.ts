import { createHeadlessEditor } from '@lexical/headless';
import { $generateNodesFromDOM, $generateHtmlFromNodes } from '@lexical/html'; 
import { $getRoot } from 'lexical';

import { JSDOM } from 'jsdom';

import editorNodes from './nodes';

export const htmlToJson = async (htmlString: string) => {

    const editor = createHeadlessEditor({ 
        nodes: editorNodes 
    });
    
    await editor.update(() => {

        const root = $getRoot();

        // In a headless environment you can use a package such as JSDom to parse the HTML string.
        const dom = new JSDOM(htmlString);

        // Once you have the DOM instance it's easy to generate LexicalNodes.
        const lexicalNodes = $generateNodesFromDOM(editor, dom.window.document);

        lexicalNodes.forEach((node) => root.append(node));
    });

    const state = editor.getEditorState();
    return state.toJSON();
};

export const jsonToHtml = async (jsonString: string) => {
    

    const dom = new JSDOM(`<!DOCTYPE html><body></body>`);
    global.window = dom.window;
    global.document = dom.window.document;
    global.DOMParser = dom.window.DOMParser;
    global.MutationObserver = dom.window.MutationObserver;
    
    // Create a headless Lexical editor instance
    const editor = createHeadlessEditor({
        namespace: 'headless',
        editable: false,
    });

    // Set the editor state from JSON
    const state = editor.parseEditorState(jsonString);
    if (state.isEmpty())
        return null;

    editor.setEditorState( state );

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