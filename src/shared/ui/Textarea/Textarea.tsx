import type { TextareaHTMLAttributes } from 'react';
import styles from './Textarea.module.css';

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={[styles.textarea, className ?? ''].filter(Boolean).join(' ')} {...props} />;
}
