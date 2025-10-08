import type { HTMLAttributes } from 'react';
import styles from './Toolbar.module.css';

interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  readonly ariaLabel?: string;
}

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
