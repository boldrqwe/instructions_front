import type { ChangeEventHandler } from 'react';
import { useState } from 'react';
import styles from './BinaryTrainerPage.module.css';

const MAX_DECIMAL_SAFE = Number.MAX_SAFE_INTEGER;
const MAX_BINARY_LENGTH = MAX_DECIMAL_SAFE.toString(2).length;
const MAX_OCTAL_LENGTH = MAX_DECIMAL_SAFE.toString(8).length;
const MAX_HEX_LENGTH = MAX_DECIMAL_SAFE.toString(16).length;
const SAFE_DECIMAL_STRING = MAX_DECIMAL_SAFE.toLocaleString('ru-RU');

type BaseKey = 'binary' | 'octal' | 'decimal' | 'hex';

type BaseValues = Record<BaseKey, string>;
type BaseErrors = Record<BaseKey, string | null>;

interface BaseConfig {
  radix: number;
  title: string;
  label: string;
  resultLabel: string;
  placeholder: string;
  hint: string;
  normalize: (value: string) => string;
  invalidCharsMessage: string;
  rangeError?: string;
  inputMode?: 'numeric' | 'text';
  prepareInput?: (value: string) => string;
}

const BASE_ORDER: BaseKey[] = ['binary', 'octal', 'decimal', 'hex'];

const BASE_CONFIG: Record<BaseKey, BaseConfig> = {
  binary: {
    radix: 2,
    title: 'Двоичная система',
    label: 'Двоичное число',
    resultLabel: 'Двоичная запись',
    placeholder: 'Например, 101101',
    hint: `Используйте только 0 и 1. Максимум ${MAX_BINARY_LENGTH} бит (${SAFE_DECIMAL_STRING} в десятичном виде).`,
    normalize: (value) => value.replace(/[^01]/g, ''),
    invalidCharsMessage: 'Используйте только цифры 0 и 1.',
    rangeError: `Поддерживаются числа до ${MAX_BINARY_LENGTH} бит (${SAFE_DECIMAL_STRING} в десятичном виде).`,
    inputMode: 'numeric',
  },
  octal: {
    radix: 8,
    title: 'Восьмеричная система',
    label: 'Восьмеричное число',
    resultLabel: 'Восьмеричная запись',
    placeholder: 'Например, 725',
    hint: `Используйте цифры 0–7. Максимум ${MAX_OCTAL_LENGTH} разрядов (${SAFE_DECIMAL_STRING} в десятичном виде).`,
    normalize: (value) => value.replace(/[^0-7]/g, ''),
    invalidCharsMessage: 'Допустимы только цифры от 0 до 7.',
    rangeError: `Введите число до ${SAFE_DECIMAL_STRING}.`,
    inputMode: 'numeric',
  },
  decimal: {
    radix: 10,
    title: 'Десятичная система',
    label: 'Десятичное число',
    resultLabel: 'Десятичное значение',
    placeholder: 'Например, 45',
    hint: `Введите целое число до ${SAFE_DECIMAL_STRING}.`,
    normalize: (value) => value.replace(/[^0-9]/g, ''),
    invalidCharsMessage: 'Используйте только арабские цифры.',
    rangeError: `Введите число до ${SAFE_DECIMAL_STRING}.`,
    inputMode: 'numeric',
  },
  hex: {
    radix: 16,
    title: 'Шестнадцатеричная система',
    label: 'Шестнадцатеричное число',
    resultLabel: 'Шестнадцатеричная запись',
    placeholder: 'Например, FF1A',
    hint: `Используйте цифры 0–9 и буквы A–F. Максимум ${MAX_HEX_LENGTH} символов (${SAFE_DECIMAL_STRING} в десятичном виде).`,
    normalize: (value) => value.replace(/[^0-9a-f]/gi, ''),
    invalidCharsMessage: 'Допустимы цифры 0–9 и буквы A–F.',
    rangeError: `Введите число до ${SAFE_DECIMAL_STRING}.`,
    inputMode: 'text',
    prepareInput: (value) => value.toUpperCase(),
  },
};

const createEmptyValues = (): BaseValues => ({
  binary: '',
  octal: '',
  decimal: '',
  hex: '',
});

const createEmptyErrors = (): BaseErrors => ({
  binary: null,
  octal: null,
  decimal: null,
  hex: null,
});

const convertFromDecimal = (value: number): BaseValues => ({
  binary: value.toString(2),
  octal: value.toString(8),
  decimal: value.toString(10),
  hex: value.toString(16).toUpperCase(),
});

/**
 * Интерактивный тренажер систем счисления для конвертации между 2, 8, 10 и 16 основаниями.
 */
export function BinaryTrainerPage() {
  const [values, setValues] = useState<BaseValues>(() => createEmptyValues());
  const [errors, setErrors] = useState<BaseErrors>(() => createEmptyErrors());

  const handleChange = (baseKey: BaseKey): ChangeEventHandler<HTMLInputElement> => (event) => {
    const rawValue = event.target.value.trim();
    if (rawValue === '') {
      setValues(createEmptyValues());
      setErrors(createEmptyErrors());
      return;
    }

    const config = BASE_CONFIG[baseKey];
    const normalized = config.normalize(rawValue);
    const prepared = config.prepareInput ? config.prepareInput(normalized) : normalized;
    const hasSanitized = normalized !== rawValue;

    if (prepared === '') {
      setValues({ ...createEmptyValues(), [baseKey]: '' });
      setErrors({
        ...createEmptyErrors(),
        [baseKey]: hasSanitized ? config.invalidCharsMessage : null,
      });
      return;
    }

    const parsed = Number.parseInt(prepared, config.radix);

    if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
      setValues({ ...createEmptyValues(), [baseKey]: prepared });
      setErrors({
        ...createEmptyErrors(),
        [baseKey]: hasSanitized ? config.invalidCharsMessage : 'Не удалось преобразовать число.',
      });
      return;
    }

    if (parsed < 0 || !Number.isSafeInteger(parsed) || parsed > MAX_DECIMAL_SAFE) {
      setValues({ ...createEmptyValues(), [baseKey]: prepared });
      setErrors({
        ...createEmptyErrors(),
        [baseKey]: config.rangeError ?? `Введите число до ${SAFE_DECIMAL_STRING}.`,
      });
      return;
    }

    const converted = convertFromDecimal(parsed);
    converted[baseKey] = prepared;

    setValues(converted);
    setErrors({
      ...createEmptyErrors(),
      [baseKey]: hasSanitized ? config.invalidCharsMessage : null,
    });
  };

  return (
    <section className={styles.root} aria-labelledby="binary-trainer-title">
      <header className={styles.header}>
        <h1 id="binary-trainer-title" className={styles.title}>
          Тренажер систем счисления
        </h1>
        <p className={styles.subtitle}>
          Переводите числа между двоичной, восьмеричной, десятичной и шестнадцатеричной системами мгновенно.
        </p>
      </header>

      <div className={styles.cards}>
        {BASE_ORDER.map((baseKey) => {
          const config = BASE_CONFIG[baseKey];
          const inputId = `${baseKey}-input`;
          const errorId = `${baseKey}-error`;
          const errorMessage = errors[baseKey];

          return (
            <div key={baseKey} className={styles.card}>
              <h2 className={styles.cardTitle}>{config.title}</h2>
              <label className={styles.label} htmlFor={inputId}>
                {config.label}
              </label>
              <input
                id={inputId}
                className={styles.input}
                inputMode={config.inputMode}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={values[baseKey]}
                onChange={handleChange(baseKey)}
                placeholder={config.placeholder}
                aria-describedby={errorMessage ? errorId : undefined}
              />
              {errorMessage ? (
                <p id={errorId} className={styles.error} role="alert">
                  {errorMessage}
                </p>
              ) : (
                <p className={styles.hint}>{config.hint}</p>
              )}
              <div className={styles.resultList} role="group" aria-live="polite">
                {BASE_ORDER.filter((targetKey) => targetKey !== baseKey).map((targetKey) => {
                  const targetConfig = BASE_CONFIG[targetKey];
                  return (
                    <div key={targetKey} className={styles.result}>
                      <span className={styles.resultLabel}>{targetConfig.resultLabel}</span>
                      <output className={styles.resultValue}>
                        {values[targetKey] || '—'}
                      </output>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <footer className={styles.footer}>
        <h2 className={styles.footerTitle}>Как работает перевод?</h2>
        <p>
          Каждая позиция в записи — это степень основания системы счисления. Чтобы получить десятичное значение,
          сложите степени основания, соответствующие ненулевым цифрам. Например, шестнадцатеричное FF = 15 · 16 + 15 = 255.
        </p>
      </footer>
    </section>
  );
}

export default BinaryTrainerPage;
