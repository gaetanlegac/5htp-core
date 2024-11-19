
import { HeadingNode, HeadingTagType } from '@lexical/rich-text';

export default class HeadingWithAnchorNode extends HeadingNode {

    public anchor?: string; 
    
    constructor( tag: HeadingTagType, key?: string ) {
        super(tag, key);
    }

    // Adding a static method to register the custom node
    static getType() {
        return 'anchored-heading';
    }

    static clone(node) {
        return new HeadingWithAnchorNode(node.getTag(), node.__key);
    }

    // Add a `anchor` attribute to the serialized JSON
    static importJSON(serializedNode) {
        const node = new HeadingWithAnchorNode(serializedNode.tag);
        node.anchor = serializedNode.anchor;
        return node;
    }

    // Ensure the `anchor` attribute is serialized in JSON
    exportJSON() {
        return {
            ...super.exportJSON(),
            type: HeadingWithAnchorNode.getType(),
            anchor: this.anchor,
        };
    }

    // Override createDOM to set the `anchor` attribute
    createDOM(config) {
        const dom = super.createDOM(config);
        if (this.anchor) {
            dom.setAttribute('id', this.anchor);
        }
        return dom;
    }

    // Update the DOM to reflect changes in the `anchor` attribute
    updateDOM(prevNode, dom) {
        const updated = super.updateDOM(prevNode, dom);
        if (this.anchor !== prevNode.anchor) {
            dom.setAttribute('id', this.anchor);
            return true;
        }
        return updated;
    }
}
