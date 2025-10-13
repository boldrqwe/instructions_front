import React from 'react';
import styles from './Toc.module.css';

/**
 * Секция внутри главы ToC.
 */
export type UiTocSection = {
    id: string;
    title: string;
};

/**
 * Глава ToC: заголовок раздела (обычно H2) и плоский список секций (H3–H6).
 */
export type UiTocChapter = {
    id: string;
    title: string;
    sections: UiTocSection[];
};

type TocProps = {
    /** Главы оглавления. Подаём уже подготовленную структуру. */
    items: UiTocChapter[];

    /** id активного заголовка для подсветки. */
    activeId?: string;

    /** Переход к якорю (скролл). */
    onNavigate: (id: string) => void;

    /** Видимость панели (desktop – всегда true, mobile – по кнопке). */
    isOpen: boolean;

    /** Закрытие панели на mobile. */
    onClose?: () => void;
};

/**
 * Панель оглавления (ToC).
 *
 * @remarks
 * - Ожидает структуру глав/секций (`UiTocChapter[]`).
 * - Ничего не рендерит, если элементов нет.
 * - Безопасен к пустым массивам и `undefined` (защиты и дефолты).
 */
export function Toc({
                        items,
                        activeId,
                        onNavigate,
                        isOpen,
                        onClose,
                    }: TocProps) {
    if (!items || items.length === 0) return null;

    const handleClick = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        onNavigate(id);
    };

    return (
        <aside className={`${styles.toc} ${isOpen ? styles.open : ''}`} aria-label="Оглавление">
            {/* Кнопка закрытия видна только если передан onClose (mobile) */}
            {onClose && (
                <button type="button" className={styles.close} onClick={onClose}>
                    Закрыть
                </button>
            )}

            <nav className={styles.nav}>
                <h2 className={styles.heading}>Оглавление</h2>

                <ul className={styles.list}>
                    {(items ?? []).map((ch) => (
                        <li key={ch.id} className={styles.chapter}>
                            {/* Ссылка на H2 */}
                            <a
                                href={`#${ch.id}`}
                                className={`${styles.link} ${activeId === ch.id ? styles.active : ''}`}
                                aria-current={activeId === ch.id ? 'location' : undefined}
                                onClick={(e) => handleClick(e, ch.id)}
                            >
                                {ch.title}
                            </a>

                            {/* Секции H3–H6 */}
                            {(ch.sections ?? []).length > 0 && (
                                <ul className={styles.sections}>
                                    {ch.sections.map((s) => (
                                        <li key={s.id}>
                                            <a
                                                href={`#${s.id}`}
                                                className={`${styles.link} ${activeId === s.id ? styles.active : ''}`}
                                                aria-current={activeId === s.id ? 'location' : undefined}
                                                onClick={(e) => handleClick(e, s.id)}
                                            >
                                                {s.title}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
}

export default Toc;
