import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import styles from './Input.module.css';

/**
 * Дополнительные свойства поля ввода, поддерживающие подписи, подсказки и ошибки.
 */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label?: ReactNode;
  readonly hint?: ReactNode;
  readonly error?: ReactNode;
}

/**
 * Универсальный компонент `<input>` с подписью и отображением ошибок.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className = '', id, ...props }, ref) => {
    const inputId = id ?? props.name ?? undefined;
    return (
      <label className={`${styles.wrapper} ${className}`.trim()} htmlFor={inputId}>
        {label && (
          <span className={styles.label}>
            {label}
            {props.required ? <span className={styles.required}>*</span> : null}
          </span>
        )}
        <input ref={ref} id={inputId} className={styles.input} {...props} />
        {hint && !error ? <span className={styles.hint}>{hint}</span> : null}
        {error ? <span className={styles.error}>{error}</span> : null}
      </label>
    );
  },
);

Input.displayName = 'Input';
