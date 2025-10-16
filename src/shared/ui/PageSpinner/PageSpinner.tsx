import styles from './PageSpinner.module.css';

/**
 * Полностраничный индикатор загрузки для отображения состояния ожидания.
 */
export function PageSpinner() {
  return (
    <div className={styles.container} role="status" aria-live="polite">
      <div className={styles.spinner} />
      <span className={styles.label}>Загрузка…</span>
    </div>
  );
}
