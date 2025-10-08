import { useCallback, useId, useState } from 'react';
import type { KeyboardEvent, ChangeEvent } from 'react';
import styles from './TagInput.module.css';

interface TagInputProps {
  readonly value: string[];
  readonly onChange: (next: string[]) => void;
  readonly label?: string;
  readonly placeholder?: string;
  readonly disabled?: boolean;
}

export function TagInput({
  value,
  onChange,
  label,
  placeholder = 'Добавьте теги через Enter или запятую',
  disabled,
}: TagInputProps) {
  const [draft, setDraft] = useState('');
  const inputId = useId();

  const emitChange = useCallback(
    (next: string[]) => {
      const unique = Array.from(new Set(next.map(tag => tag.trim()).filter(Boolean)));
      onChange(unique);
    },
    [onChange],
  );

  const tryAddTag = useCallback(
    (raw: string) => {
      const normalized = raw.trim();
      if (!normalized) return;
      emitChange([...value, normalized]);
      setDraft('');
    },
    [emitChange, value],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        tryAddTag(draft);
      } else if (event.key === 'Backspace' && !draft && value.length > 0) {
        event.preventDefault();
        emitChange(value.slice(0, -1));
      }
    },
    [draft, emitChange, tryAddTag, value],
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value;
      if (next.includes(',')) {
        const parts = next.split(',');
        const last = parts.pop() ?? '';
        parts.forEach(segment => {
          if (segment.trim()) {
            tryAddTag(segment);
          }
        });
        setDraft(last);
      } else {
        setDraft(next);
      }
    },
    [tryAddTag],
  );

  const removeTag = useCallback(
    (tag: string) => {
      emitChange(value.filter(item => item !== tag));
    },
    [emitChange, value],
  );

  return (
    <div className={styles.wrapper}>
      {label ? (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <div className={styles.control}>
        {value.map(tag => (
          <span key={tag} className={styles.tag}>
            <span>{tag}</span>
            <button
              type="button"
              className={styles.remove}
              onClick={() => removeTag(tag)}
              aria-label={`Удалить тег ${tag}`}
              disabled={disabled}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={inputId}
          className={styles.input}
          value={draft}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          placeholder={value.length === 0 ? placeholder : undefined}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
