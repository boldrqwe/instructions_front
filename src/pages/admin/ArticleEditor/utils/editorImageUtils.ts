import type { Editor } from '@tiptap/react';

export function replaceImageSource(ed: Editor, currentSrc: string, nextSrc: string) {
    const { state, view } = ed;
    state.doc.descendants((node, pos) => {
        if (node.type.name === 'image' && node.attrs.src === currentSrc) {
            const tr = state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: nextSrc });
            view.dispatch(tr);
            return false;
        }
        return true;
    });
}

export function removeImageBySrc(ed: Editor, targetSrc: string) {
    const { state, view } = ed;
    state.doc.descendants((node, pos) => {
        if (node.type.name === 'image' && node.attrs.src === targetSrc) {
            const tr = state.tr.delete(pos, pos + node.nodeSize);
            view.dispatch(tr);
            return false;
        }
        return true;
    });
}
