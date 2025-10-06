import type { ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps {
  readonly title?: ReactNode;
  readonly meta?: ReactNode;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}

export function Card({ title, meta, actions, children }: CardProps) {
  return (
    <section className={styles.card}>
      {(title || meta || actions) && (
        <header className={styles.header}>
          <div>
            {title ? <div className={styles.title}>{title}</div> : null}
            {meta ? <div className={styles.meta}>{meta}</div> : null}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
