/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npde
import path from 'path';

// Npm
import md5 from 'md5';
import { fromBuffer } from 'file-type';
import { JSDOM } from 'jsdom';
// Lexical
import { $getRoot, SerializedEditorState, SerializedLexicalNode } from 'lexical';
import { createHeadlessEditor } from '@lexical/headless';
import { $generateNodesFromDOM, $generateHtmlFromNodes } from '@lexical/html';

// Core
import { Anomaly } from '@common/errors';
import editorNodes from '@common/data/rte/nodes';
import ExampleTheme from '@client/components/inputv3/Rte/themes/PlaygroundEditorTheme';
import type Driver from '@server/services/disks/driver';

/*----------------------------------
- TYPES
----------------------------------*/

type SerializedLexicalNodeWithSrc = SerializedLexicalNode & { src: string };

type TAttachmentsOptions = {
    disk: Driver,
    directory: string,
    prevVersion?: string | SerializedEditorState | null,
}

/*----------------------------------
- FUNCTIONS
----------------------------------*/

export class RteUtils {

    public async render( 
        content: string | SerializedEditorState, 
        attachementsOpts?: TAttachmentsOptions 
    ) {

        // Parse content if string
        if (typeof content === 'string') {
            try {
                content = JSON.parse(content) as SerializedEditorState;
            } catch (error) { 
                throw new Anomaly("Invalid JSON format for the given JSON RTE content.");
            }
        }

        // Attachments
        let attachements: string[] = [];
        if (attachementsOpts) {

            // Parse prev version if string
            if (typeof attachementsOpts.prevVersion === 'string') {
                try {
                    attachementsOpts.prevVersion = JSON.parse(attachementsOpts.prevVersion) as SerializedEditorState;
                } catch (error) {
                    throw new Anomaly("Invalid JSON format for the given JSON RTE prev version.");
                }
            }

            // Upload attachments and replace blobs by URLs
            attachements = await this.uploadAttachments(
                content,
                attachementsOpts.disk, attachementsOpts.directory,
                attachementsOpts.prevVersion || undefined
            );
        }

        // Convert content to HTML
        const html = await this.jsonToHtml( content );
        
        return { html, json: content, attachements };
    }

    public async htmlToJson(htmlString: string): Promise<SerializedEditorState> {

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

    public async jsonToHtml(jsonString: string) {

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

    public async uploadAttachments(
        value: SerializedEditorState,
        disk: Driver,
        destination: string,
        oldState?: SerializedEditorState
    ) {

        const usedFilesUrl: string[] = [];

        // Deep check for images / files
        const findFiles = async (
            node: SerializedLexicalNode,
            callback: (node: SerializedLexicalNodeWithSrc) => Promise<void>
        ) => {

            // Attachment
            if (node.type === 'image' || node.type === 'file') {
                if (typeof node.src === 'string') {
                    await callback(node as SerializedLexicalNodeWithSrc);
                }
                // Recursion
            } else if (node.children) {
                for (const child of node.children) {
                    await findFiles(child, callback);
                }
            }
        }

        const uploadFile = async (node: SerializedLexicalNodeWithSrc) => {

            // Already uploaded
            if (!node.src.startsWith('data:')) {
                usedFilesUrl.push(node.src);
                return node.src;
            }

            // Transform into buffer
            node.src = node.src.replace(/^data:\w+\/\w+;base64,/, '');
            const fileData = Buffer.from(node.src, 'base64');

            // Parse file type from buffer
            const fileType = await fromBuffer(fileData);
            if (!fileType)
                throw new Error('Failed to detect file type');

            // Upload file to disk
            const fileName = md5(node.src) + '.' + fileType.ext;
            const filePath = path.join(destination, fileName);
            const upoadedFile = await disk.outputFile('data', filePath, fileData, {
                encoding: 'binary'
            });

            // Replace node.src with url
            node.src = upoadedFile.path;
            usedFilesUrl.push(node.src);
        }

        const deleteUnusedFile = async (node: SerializedLexicalNodeWithSrc) => {

            // Should be a URL
            if (node.src.startsWith('data:') || !node.src.startsWith('http'))
                return;

            // This file is used
            if (usedFilesUrl.includes(node.src))
                return;

            // Extract file name
            const fileName = path.basename(node.src);
            const filePath = path.join(destination, fileName);

            // Delete file from disk
            await disk.delete('data', filePath);
            console.log('Deleted file:', filePath);
        }

        // Find files in the editor state
        for (const child of value.root.children) {
            await findFiles(child, uploadFile);
        }

        // Old state given: remove unused attachments
        if (oldState !== undefined) {
            for (const child of oldState.root.children) {
                await findFiles(child, deleteUnusedFile);
            }
        }

        return usedFilesUrl;
    }
}

export default new RteUtils;