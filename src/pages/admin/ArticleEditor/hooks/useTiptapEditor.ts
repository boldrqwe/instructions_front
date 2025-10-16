import { useEffect, useMemo, useRef } from 'react';
import { useEditor, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import {Table} from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { createLowlight, common } from 'lowlight';

type UseTiptapParams = {
    onUpdate: (editor: Editor) => void;
    onFiles: (editor: Editor, files: File[]) => void;
    editorClassName: string;
    ariaLabel?: string;
};

/**
 * Хук-обёртка над `useEditor` из Tiptap с преднастроенными расширениями и обработкой изображений.
 *
 * @param onUpdate Колбэк, вызываемый при каждом обновлении содержимого редактора.
 * @param onFiles Обработчик вставки/перетаскивания изображений.
 * @param editorClassName CSS-класс, навешиваемый на область редактирования.
 * @param ariaLabel ARIA-метка для доступности редактора.
 * @returns Экземпляр редактора Tiptap или `null`, пока он не инициализирован.
 */
export function useTiptapEditor({
                                    onUpdate,
                                    onFiles,
                                    editorClassName,
                                    ariaLabel = 'Редактор содержимого',
                                }: UseTiptapParams) {
    const lowlight = useMemo(() => createLowlight(common), []);

    const extensions = useMemo(
        () => [
            StarterKit.configure({
                heading: { levels: [1, 2, 3, 4] },
                codeBlock: false,
            }),
            Link.configure({ openOnClick: false }),
            Image.configure({ inline: false, allowBase64: true }),
            Underline,
            TaskList,
            TaskItem.configure({ nested: true }),
            CodeBlockLowlight.configure({ lowlight }),
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
        ],
        [lowlight],
    );

    const onUpdateRef = useRef(onUpdate);
    const onFilesRef = useRef(onFiles);
    onUpdateRef.current = onUpdate;
    onFilesRef.current = onFiles;

    const editor = useEditor(
        {
            extensions,
            autofocus: false,
            editorProps: {
                attributes: {
                    class: editorClassName,
                    'aria-label': ariaLabel,
                },
                handleDrop: (_view, event) => {
                    const files = Array.from(event.dataTransfer?.files ?? []).filter(f =>
                        f.type.startsWith('image/'),
                    );
                    if (!files.length) return false;
                    event.preventDefault();
                    onFilesRef.current(editor!, files);
                    return true;
                },
                handlePaste: (_view, event) => {
                    const files = Array.from(event.clipboardData?.files ?? []).filter(f =>
                        f.type.startsWith('image/'),
                    );
                    if (!files.length) return false;
                    event.preventDefault();
                    onFilesRef.current(editor!, files);
                    return true;
                },
            },
            onUpdate({ editor }) {
                onUpdateRef.current(editor);
            },
        },
        [],
    );

    // cleanup — безопасная альтернатива onDestroy
    useEffect(() => {
        if (!editor) return;
        return () => {
            // здесь мог бы быть вызов editor.off(), если были подписки
        };
    }, [editor]);

    return editor;
}
