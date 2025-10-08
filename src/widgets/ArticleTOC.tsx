import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { slugify } from '../shared/lib/slugify';
import styles from './ArticleTOC.module.css';

interface HeadingItem {
  readonly id: string;
  readonly level: number;
  readonly text: string;
}

interface ArticleTOCProps {
  readonly editor: Editor | null;
}

export function ArticleTOC({ editor }: ArticleTOCProps) {
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isMobileOpen, setMobileOpen] = useState(false);

  const recalculateHeadings = useCallback(() => {
    if (!editor?.options.element) {
      setHeadings([]);
      return;
    }

    const container = editor.options.element as HTMLElement;
    const nodes = Array.from(
      container.querySelectorAll('h1, h2, h3, h4'),
    ) as HTMLHeadingElement[];

    const mapped = nodes.map((heading, index) => {
      const text = heading.textContent?.trim() || 'Без названия';
      const level = Number.parseInt(heading.tagName.replace('H', ''), 10) || 1;
      let id = heading.id;
      if (!id) {
        id = `${slugify(text)}-${index}`;
        heading.id = id;
      }
      return { id, level, text } satisfies HeadingItem;
    });

    setHeadings(mapped);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    recalculateHeadings();
    const update = () => recalculateHeadings();
    editor.on('update', update);
    editor.on('create', update);
    return () => {
      editor.off('update', update);
      editor.off('create', update);
    };
  }, [editor, recalculateHeadings]);

  useEffect(() => {
    if (headings.length === 0) {
      setActiveId(null);
      return undefined;
    }

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          setActiveId(visible.target.id);
        }
      },
      { rootMargin: '0px 0px -70% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    headings.forEach(heading => {
      const el = document.getElementById(heading.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  const outline = useMemo(() => {
    return headings.map(item => (
      <button
        key={item.id}
        className={`${styles.item} ${activeId === item.id ? styles.active : ''}`.trim()}
        style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
        type="button"
        onClick={() => {
          document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setMobileOpen(false);
        }}
      >
        {item.text}
      </button>
    ));
  }, [activeId, headings]);

  return (
    <aside className={styles.wrapper} aria-label="Оглавление статьи">
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setMobileOpen(open => !open)}
        aria-expanded={isMobileOpen}
      >
        Оглавление
      </button>
      <div className={`${styles.panel} ${isMobileOpen ? styles.panelOpen : ''}`.trim()}>
        <div className={styles.header}>
          <span className={styles.title}>Оглавление</span>
          <button
            type="button"
            className={styles.close}
            aria-label="Закрыть оглавление"
            onClick={() => setMobileOpen(false)}
          >
            ×
          </button>
        </div>
        <nav className={styles.list}>{outline.length > 0 ? outline : <p className={styles.empty}>Добавьте заголовки, чтобы увидеть оглавление</p>}</nav>
      </div>
      {isMobileOpen ? <div className={styles.backdrop} onClick={() => setMobileOpen(false)} /> : null}
    </aside>
  );
}
