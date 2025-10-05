import type { Toc as TocType } from '../../entities/article/model/types';
import styles from './Toc.module.css';

interface TocProps {
  readonly items: TocType['items'];
  readonly activeId?: string;
  readonly onNavigate: (anchor: string) => void;
  readonly isOpen?: boolean;
  readonly onClose?: () => void;
}

export function Toc({ items, activeId, onNavigate, isOpen = true, onClose }: TocProps) {
  return (
    <aside className={`${styles.root} ${isOpen ? styles.open : styles.closed}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>Оглавление</h2>
        {onClose && (
          <button className={styles.close} type="button" onClick={onClose}>
            Закрыть
          </button>
        )}
      </div>
      <nav aria-label="Оглавление статьи" className={styles.nav}>
        <ul className={styles.list}>
          {items.map((chapter) => (
            <li key={chapter.id} className={styles.chapter}>
              <span className={styles.chapterTitle}>{chapter.title}</span>
              <ul className={styles.sectionList}>
                {chapter.sections.map((section) => {
                  const sluggedAnchor = section.anchor ? `user-content-${section.anchor}` : undefined;
                  const isActive =
                    section.id === activeId ||
                    section.anchor === activeId ||
                    sluggedAnchor === activeId;
                  return (
                    <li key={section.id}>
                      <button
                        type="button"
                        className={`${styles.section} ${isActive ? styles.active : ''}`}
                        aria-current={isActive ? 'location' : undefined}
                        onClick={() => onNavigate(section.anchor)}
                      >
                        {section.title}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
