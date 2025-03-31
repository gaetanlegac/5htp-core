
import { HeadingNode, HeadingTagType } from '@lexical/rich-text';
import { AutoLinkNode, LinkNode } from '@lexical/link';

export default class ReferenceLinkNode extends LinkNode {

    public referenceTo?: string; 

    // Adding a static method to register the custom node
    static getType() {
        return 'reference-link';
    }

    static clone(node) {
        return new ReferenceLinkNode(node.__url, {
            rel: node.__rel,
            target: node.__target,
            title: node.__title
          }, node.__key);
    }

    // Add a `referenceTo` attribute to the serialized JSON
    static importJSON(serializedNode) {
        const node = new ReferenceLinkNode(serializedNode.url);
        node.referenceTo = serializedNode.referenceTo;
        return node;
    }

    // Ensure the `referenceTo` attribute is serialized in JSON
    exportJSON() {
        return {
            ...super.exportJSON(),
            type: ReferenceLinkNode.getType(),
            referenceTo: this.referenceTo
        };
    }

    // Override createDOM to set the `referenceTo` attribute
    createDOM(config) {
        const dom = super.createDOM(config);
        if (this.referenceTo) {
            dom.setAttribute('class', this.referenceTo);
        }
        return dom;
    }

    // Update the DOM to reflect changes in the `referenceTo` attribute
    updateDOM(prevNode, dom, config) {
        const updated = super.updateDOM(prevNode, dom, config);
        if (this.referenceTo !== prevNode.referenceTo) {
            dom.setAttribute('class', this.referenceTo);
            return true;
        }
        return updated;
    }
}
