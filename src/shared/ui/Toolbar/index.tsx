import type { HTMLAttributes } from 'react';
import styles from './Toolbar.module.css';

/**
 * Пропсы панели инструментов с ARIA-меткой.
 */
interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  readonly ariaLabel?: string;
}

/**
 * Контейнер с ролью `toolbar` для группировки кнопок или действий.
 */
export function Toolbar({ ariaLabel, className = '', ...props }: ToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label={ariaLabel}
      className={`${styles.toolbar} ${className}`.trim()}
      {...props}
    />
  );
}
