import { useEffect, useMemo, useState } from 'react';
import styles from './ArticleTOC.module.css';

export interface TocHeading {
  readonly id: string;
  readonly text: string;
  readonly level: number;
}

interface ArticleTOCProps {
  readonly headings: TocHeading[];
  readonly onNavigate?: (id: string) => void;
}

export function ArticleTOC({ headings, onNavigate }: ArticleTOCProps) {
  const [activeId, setActiveId] = useState<string>();

  const headingIds = useMemo(() => headings.map((item) => item.id), [headings]);

  useEffect(() => {
    if (!headings.length) {
      setActiveId(undefined);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
          return;
        }

        const closestAbove = entries
          .filter((entry) => entry.boundingClientRect.top < 0)
          .sort((a, b) => b.boundingClientRect.top - a.boundingClientRect.top);

        if (closestAbove.length > 0) {
          setActiveId(closestAbove[0].target.id);
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0.1, 0.25, 0.5] },
    );

    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((el): el is Element => Boolean(el));

    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
      observer.disconnect();
    };
  }, [headings]);

  useEffect(() => {
    if (!headingIds.includes(activeId ?? '')) {
      setActiveId(undefined);
    }
  }, [activeId, headingIds]);

  if (!headings.length) {
    return null;
  }

  return (
    <aside className={styles.toc} aria-label="Оглавление статьи">
      <div className={styles.header}>Оглавление</div>
      <ol className={styles.list}>
        {headings.map((heading) => {
          const levelClass =
            heading.level === 2
              ? styles.level2
              : heading.level === 3
                ? styles.level3
                : heading.level === 4
                  ? styles.level4
                  : undefined;
          const isActive = heading.id === activeId;
          return (
            <li key={heading.id}>
              <button
                type="button"
                className={[styles.item, levelClass ?? '', isActive ? styles.active : '']
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => {
                  document.getElementById(heading.id)?.scrollIntoView({ behavior: 'smooth' });
                  setActiveId(heading.id);
                  onNavigate?.(heading.id);
                }}
                aria-current={isActive ? 'true' : undefined}
              >
                {heading.text}
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
