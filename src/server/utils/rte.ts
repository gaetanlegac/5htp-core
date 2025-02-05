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
import { $getRoot } from 'lexical';
import { createHeadlessEditor } from '@lexical/headless';
import { $generateNodesFromDOM, $generateHtmlFromNodes } from '@lexical/html';

// Core
import { Anomaly } from '@common/errors';
import editorNodes from '@common/data/rte/nodes';
import ExampleTheme from '@client/components/inputv3/Rte/themes/PlaygroundEditorTheme';
import type Driver from '@server/services/disks/driver';
import Slug from '@server/utils/slug';

/*----------------------------------
- TYPES
----------------------------------*/

type LexicalState = {
    root: LexicalNode
}

export type LexicalNode = {
    version: number,
    type: string,
    children?: LexicalNode[],
    // Attachement
    src?: string;
    // Headhing
    text?: string;
    anchor?: string;
    tag?: string;
}

type TRenderOptions = {

    transform?: RteUtils["transformNode"],

    render?: (
        node: LexicalNode, 
        parent: LexicalNode | null, 
        options: TRenderOptions
    ) => Promise<LexicalNode>,

    attachements?: {
        disk: Driver,
        directory: string,
        prevVersion?: string | LexicalState | null,
    }
}

type TSkeleton = { 
    id: string,
    title: string, 
    level: number, 
    childrens: TSkeleton 
}[];

type TContentAssets = {
    attachements: string[],
    skeleton: TSkeleton
}

/*----------------------------------
- FUNCTIONS
----------------------------------*/

export class RteUtils {

    public async render( 
        content: string | LexicalState, 
        options: TRenderOptions = {}
    ): Promise<TContentAssets & {
        html: string,
        json: string | LexicalState,
    }> {

        // Transform content
        const assets: TContentAssets = {
            attachements: [],
            skeleton: []
        }

        // Parse content if string
        let json: LexicalState;
        if (typeof content === 'string' && content.trim().startsWith('{')) {
            try {
                json = JSON.parse(content) as LexicalState;
            } catch (error) { 
                throw new Anomaly("Invalid JSON format for the given JSON RTE content.");
            }
        } else if (content && typeof content === 'object' && content.root)
            json = content;
        else
            return { html: '', json: content, ...assets };

        // Parse prev version if string
        if (typeof options?.attachements?.prevVersion === 'string') {
            try {
                options.attachements.prevVersion = JSON.parse(options.attachements.prevVersion) as LexicalState;
            } catch (error) {
                throw new Anomaly("Invalid JSON format for the given JSON RTE prev version.");
            }
        }

        const root = await this.processContent(json.root, null, async (node, parent) => {
            return await this.transformNode(node, parent, assets, options);
        });

        json = { ...json, root };

        // Delete unused attachements
        const attachementOptions = options?.attachements;
        if (attachementOptions && attachementOptions.prevVersion !== undefined) {

            await this.processContent(root, null, async (node) => {
                return await this.deleteUnusedFile(node, assets, attachementOptions);
            });
        }

        // Convert json to HTML
        const html = await this.jsonToHtml( json, options );

        return { html, json: content, ...assets };
    }

    private async processContent( 
        node: LexicalNode, 
        parent: LexicalNode | null,
        callback: (node: LexicalNode, parent: LexicalNode | null) => Promise<LexicalNode>
    ) {

        node = await callback(node, parent);

        // Recursion
        if (node.children) {
            for (let i = 0; i < node.children.length; i++) {

                node.children[ i ] = await this.processContent( node.children[ i ], node, callback );

            }
        }

        return node;
    }

    private async transformNode(
        node: LexicalNode, 
        parent: LexicalNode | null, 
        assets: TContentAssets, 
        options: TRenderOptions
    ): Promise<LexicalNode> {

        // Images and files
        if (node.type === 'image' || node.type === 'file') {

            // Upload images and files and replace blobs by URLs
            await this.processAttachement(
                node as With<LexicalNode, 'src'>,
                assets,
                options,
            );

        // Headings
        } else if (node.type === 'anchored-heading') {

            // Create skeleton
            await this.processHeading(node, assets);

        }

        if (options.transform)
            node = await options.transform(node, parent, assets, options);

        return node;
    }

    public async processAttachement(
        node: LexicalNode,
        assets: TContentAssets,
        options: TRenderOptions
    ) {

        const attachementOptions = options?.attachements;
        if (typeof node.src !== 'string' || !attachementOptions)
            return;

        // Already uploaded
        if (!node.src.startsWith('data:')) {
            assets.attachements.push(node.src);
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
        const filePath = path.join(attachementOptions.directory, fileName);
        const upoadedFile = await attachementOptions.disk.outputFile('data', filePath, fileData, {
            encoding: 'binary'
        });

        // Replace node.src with url
        node.src = upoadedFile.path;
        assets.attachements.push(node.src);
    }

    private async processHeading( node: LexicalNode, assets: TContentAssets ) {

        const title = this.jsonToText(node);
        const titleLevel = parseInt(node.tag?.substring(1) || '1');
        const titleSlug = await Slug.generate(title);
        node.anchor = titleSlug;

        const findParentContainer = (skeleton: TSkeleton): TSkeleton => {
            for (let i = skeleton.length - 1; i >= 0; i--) {
                const child = skeleton[i];

                if (child.level === titleLevel - 1) {
                    return child.childrens;
                } else if (child.level < titleLevel) {
                    return findParentContainer(child.childrens);
                }
            }

            return skeleton;
        }

        const parentContainer = (assets.skeleton.length === 0 || titleLevel === 1)
            ? assets.skeleton
            : findParentContainer(assets.skeleton);

        parentContainer.push({
            title,
            id: titleSlug,
            level: titleLevel,
            childrens: []
        });
    }

    private async deleteUnusedFile( 
        node: LexicalNode, 
        assets: TContentAssets,
        options: NonNullable<TRenderOptions["attachements"]>
    ) {

        if (!node.src)
            return node;

        // Should be a URL
        if (node.src.startsWith('data:') || !node.src.startsWith('http'))
            return node;

        // This file is used
        if (assets.attachements.includes(node.src))
            return node;

        // Extract file name
        const fileName = path.basename(node.src);
        const filePath = path.join(options.directory, fileName);

        // Delete file from disk
        await options.disk.delete('data', filePath);
        console.log('Deleted file:', filePath);

        return node;
    }

    public async jsonToHtml( json: LexicalState, options: TRenderOptions = {} ) {

        // Transform before rendering
        const renderTransform = options.render;
        if (renderTransform)
            json = {
                ...json,
                root: await this.processContent(json.root, null, async (node, parent) => {
                    return await renderTransform(node, parent, options);
                })
            }

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
        const state = editor.parseEditorState(json);
        if (state.isEmpty())
            return '';

        editor.setEditorState(state);

        // Generate HTML from the Lexical nodes
        const html = await editor.getEditorState().read(() => {
            return $generateHtmlFromNodes(editor);
        });

        // Clean up global variables set for JSDOM to avoid memory leaks
        // @ts-ignore
        delete global.window;
        // @ts-ignore
        delete global.document;
        // @ts-ignore
        delete global.DOMParser;
        // @ts-ignore
        delete global.MutationObserver;

        return html;
    }

    private jsonToText( node: LexicalNode ) {

        let text = '';

        // Check if the node has text content
        if (node.type === 'text' && node.text) {
            text += node.text;
        }

        // Recursively process children nodes
        if (node.children && Array.isArray(node.children)) {
            node.children.forEach(childNode => {
                text += this.jsonToText(childNode);
            });
        }

        return text;
    }

    public async htmlToJson(htmlString: string): Promise<LexicalState> {

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
}

export default new RteUtils;