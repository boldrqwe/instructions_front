import type { TocItem } from '../../../shared/lib/useHtmlToc';
import type { UiTocChapter } from '../Toc';

/**
 * Преобразует плоский список заголовков в структуру глав/секций,
 * которую ожидает компонент <Toc />.
 *
 * Правила группировки соответствуют странице статьи:
 * - h1 пропускаем (заголовок страницы).
 * - h2 создаёт новую главу.
 * - h3–h6 добавляются как секции к последней главе.
 *
 * Если до появления секции ещё не было главы, создаётся вспомогательная глава
 * «Раздел», чтобы не терять элементы.
 */
export function buildChaptersFromTocItems(items: TocItem[]): UiTocChapter[] {
    const chapters: UiTocChapter[] = [];

    for (const heading of items) {
        if (heading.level <= 1) {
            continue;
        }

        if (heading.level === 2) {
            chapters.push({ id: heading.id, title: heading.text, sections: [] });
            continue;
        }

        if (chapters.length === 0) {
            chapters.push({ id: 'misc', title: 'Раздел', sections: [] });
        }

        chapters[chapters.length - 1].sections.push({ id: heading.id, title: heading.text });
    }

    return chapters;
}
