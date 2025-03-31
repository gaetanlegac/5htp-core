import { createEditor, LexicalEditor } from 'lexical';
import { $generateHtmlFromNodes } from '@lexical/html';
import editorNodes from '@common/data/rte/nodes';
import ExampleTheme from '@client/components/Rte/themes/PlaygroundEditorTheme';

class RichEditorUtils {

    public active: {
        title: string,
        close: () => void
    } | null = null;

    private virtualEditor: LexicalEditor | null = null;

    public async jsonToHtml( value: {} ): Promise<string | null> {

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

}

export default new RichEditorUtils();