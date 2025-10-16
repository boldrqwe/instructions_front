import type { HTMLAttributes } from 'react';
import styles from './Card.module.css';

/**
 * Простая карточка с базовым оформлением для обёртки контента.
 */
export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`${styles.card} ${className}`.trim()} {...props} />;
}
