import type { Editor } from '@tiptap/react';

/**
 * Заменяет временный src изображения в редакторе на постоянный URL после загрузки.
 *
 * @param ed Экземпляр редактора Tiptap.
 * @param currentSrc Адрес изображения, который нужно заменить (обычно `blob:`-URL).
 * @param nextSrc Новый адрес изображения из API.
 */
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

/**
 * Удаляет изображение из редактора по совпадению src (например, при ошибке загрузки).
 *
 * @param ed Экземпляр редактора Tiptap.
 * @param targetSrc Адрес изображения, которое нужно удалить.
 */
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
