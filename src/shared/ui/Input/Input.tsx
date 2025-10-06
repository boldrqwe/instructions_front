import type { InputHTMLAttributes, ReactNode } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label?: ReactNode;
  readonly hint?: ReactNode;
}

export function Input({ label, hint, className, ...props }: InputProps) {
  const inputElement = <input className={[styles.input, className ?? ''].filter(Boolean).join(' ')} {...props} />;

  if (!label) {
    return inputElement;
  }

  return (
    <label className={styles.label}>
      <span>{label}</span>
      {inputElement}
      {hint ? <span className={styles.hint}>{hint}</span> : null}
    </label>
  );
}
