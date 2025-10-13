import type { Editor } from '@tiptap/react';
import { Toolbar } from '../../shared/ui/Toolbar';
import styles from './ArticleEditor.module.css';

type Btn = {
    command: () => void;
    label: string;
    icon: string;
    isActive: () => boolean | undefined;
};

export function EditorToolbar({ editor }: { editor: Editor | null }) {
    if (!editor) return null;

    const buttons: Btn[] = [
        { command: () => editor.chain().focus().toggleBold().run(), label: 'Полужирный', icon: 'B', isActive: () => editor.isActive('bold') },
        { command: () => editor.chain().focus().toggleItalic().run(), label: 'Курсив', icon: 'I', isActive: () => editor.isActive('italic') },
        { command: () => editor.chain().focus().toggleUnderline().run(), label: 'Подчёркивание', icon: 'U', isActive: () => editor.isActive('underline') },
        { command: () => editor.chain().focus().toggleStrike().run(), label: 'Зачёркивание', icon: 'S', isActive: () => editor.isActive('strike') },

        { command: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), label: 'H1', icon: 'H1', isActive: () => editor.isActive('heading', { level: 1 }) },
        { command: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), label: 'H2', icon: 'H2', isActive: () => editor.isActive('heading', { level: 2 }) },
        { command: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), label: 'H3', icon: 'H3', isActive: () => editor.isActive('heading', { level: 3 }) },
        { command: () => editor.chain().focus().toggleHeading({ level: 4 }).run(), label: 'H4', icon: 'H4', isActive: () => editor.isActive('heading', { level: 4 }) },

        { command: () => editor.chain().focus().toggleBulletList().run(), label: 'Маркированный', icon: '•', isActive: () => editor.isActive('bulletList') },
        { command: () => editor.chain().focus().toggleOrderedList().run(), label: 'Нумерованный', icon: '1.', isActive: () => editor.isActive('orderedList') },
        { command: () => editor.chain().focus().toggleTaskList().run(), label: 'Чек-лист', icon: '☑', isActive: () => editor.isActive('taskList') },

        { command: () => editor.chain().focus().toggleBlockquote().run(), label: 'Цитата', icon: '❝', isActive: () => editor.isActive('blockquote') },
        { command: () => editor.chain().focus().toggleCodeBlock().run(), label: 'Код', icon: '</>', isActive: () => editor.isActive('codeBlock') },

        { command: () => editor.chain().focus().setHorizontalRule().run(), label: 'Разделитель', icon: '―', isActive: () => false },
        {
            command: () => {
                const url = window.prompt('Введите ссылку');
                if (!url) return;
                editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
            },
            label: 'Ссылка',
            icon: '🔗',
            isActive: () => editor.isActive('link'),
        },
        { command: () => editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run(), label: 'Таблица', icon: '▦', isActive: () => editor.isActive('table') },
    ];

    return (
        <Toolbar ariaLabel="Инструменты редактора" className={styles.toolbar}>
            {buttons.map(btn => (
                <button
                    key={btn.label}
                    type="button"
                    className={`${styles.toolbarButton} ${btn.isActive() ? styles.toolbarButtonActive : ''}`.trim()}
                    onClick={btn.command}
                    aria-label={btn.label}
                    aria-pressed={Boolean(btn.isActive())}
                >
                    {btn.icon}
                </button>
            ))}
        </Toolbar>
    );
}
