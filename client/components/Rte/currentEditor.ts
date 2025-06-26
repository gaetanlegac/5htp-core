import { createEditor, LexicalEditor } from 'lexical';
import { $generateHtmlFromNodes } from '@lexical/html';
import editorNodes from '@common/data/rte/nodes';
import ExampleTheme from '@client/components/Rte/themes/PlaygroundEditorTheme';

import { 
    default as RteUtils, 
    LexicalNode, 
    LexicalState, 
    TRenderOptions,
    TContentAssets
} from '@common/utils/rte';


class RichEditorUtils extends RteUtils {

    public active: {
        title: string,
        close: () => void
    } | null = null;

    private virtualEditor: LexicalEditor | null = null;

    public async jsonToHtml( value: LexicalState, options: TRenderOptions = {} ): Promise<string | null> {

        if (!this.virtualEditor) {
            // Create a headless Lexical editor instance
            this.virtualEditor = createEditor({
                nodes: editorNodes,
                theme: ExampleTheme,
            });
        }

        // Set the editor state from JSON
        const state = this.virtualEditor.parseEditorState(value);
        if (state.isEmpty())
            return null;

        this.virtualEditor.setEditorState(state);

        // Generate HTML from the Lexical nodes
        const html = await this.virtualEditor.getEditorState().read(() => {
            return $generateHtmlFromNodes(this.virtualEditor);
        });

        return html;
    }

    protected async processContent( 
        node: LexicalNode, 
        parent: LexicalNode | null, 
        callback: (node: LexicalNode, parent: LexicalNode | null) => Promise<LexicalNode>
    ): Promise<LexicalNode> {
        return node;
    }

    protected async transformNode( node: LexicalNode, parent: LexicalNode | null, assets: TContentAssets, options: TRenderOptions ): Promise<LexicalNode> {
        return node;
    }

    protected async deleteUnusedFile( 
        node: LexicalNode, 
        assets: TContentAssets, 
        options: NonNullable<TRenderOptions["attachements"]>
    ): Promise<LexicalNode> {
        return node;
    }

}

export default new RichEditorUtils();