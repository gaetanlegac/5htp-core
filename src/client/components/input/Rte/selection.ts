// https://github.com/brijeshb42/medium-draft/blob/c5350bb76489fd4f2f90f1dc69db92224138d20a/src/util/index.js

/*
Returns the `boundingClientRect` of the passed selection.
*/
export const getSelectionRect = (selected): DOMRect => {
    const _rect = selected.getRangeAt(0).getBoundingClientRect();
    // selected.getRangeAt(0).getBoundingClientRect()
    let rect = _rect && _rect.top ? _rect : selected.getRangeAt(0).getClientRects()[0];
    if (!rect) {
        if (selected.anchorNode && selected.anchorNode.getBoundingClientRect) {
            rect = selected.anchorNode.getBoundingClientRect();
            rect.isEmptyline = true;
        } else {
            return null;
        }
    }
    return rect;
};

/*
Returns the native selection node.
*/
export const getSelection = (root) => {
    let t = null;
    if (root.getSelection) {
        t = root.getSelection();
    } else if (root.document.getSelection) {
        t = root.document.getSelection();
    } else if (root.document.selection) {
        t = root.document.selection.createRange().text;
    }
    return t;
};
