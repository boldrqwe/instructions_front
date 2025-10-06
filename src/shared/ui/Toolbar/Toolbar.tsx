import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  readonly children: ReactNode;
}

export function Toolbar({ children }: ToolbarProps) {
  return <div className={styles.toolbar} role="toolbar">{children}</div>;
}

interface ToolbarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly pressed?: boolean;
}

export function ToolbarButton({ pressed, className, ...props }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed ?? undefined}
      className={[styles.button, className ?? ''].filter(Boolean).join(' ')}
      {...props}
    />
  );
}

export function ToolbarSeparator() {
  return <span className={styles.separator} role="separator" aria-hidden="true" />;
}
