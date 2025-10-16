import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

/**
 * Дополнительные настройки кнопки: вариант оформления и размер.
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: 'primary' | 'secondary' | 'ghost';
  readonly size?: 'md' | 'sm';
}

/**
 * Универсальная кнопка с поддержкой тем и размеров.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', type = 'button', ...props }, ref) => {
    const classes = [styles.button, styles[variant], styles[size], className]
      .filter(Boolean)
      .join(' ');
    return <button ref={ref} type={type} className={classes} {...props} />;
  },
);

Button.displayName = 'Button';
