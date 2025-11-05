import type { ChangeEventHandler } from 'react';
import { useState } from 'react';
import styles from './BinaryTrainerPage.module.css';

const MAX_DECIMAL_SAFE = Number.MAX_SAFE_INTEGER;
const MAX_BINARY_LENGTH = MAX_DECIMAL_SAFE.toString(2).length;

function normalizeDecimal(value: string) {
  return value.replace(/[^0-9]/g, '');
}

function normalizeBinary(value: string) {
  return value.replace(/[^01]/g, '');
}

/**
 * Интерактивный тренажер двоичных чисел, позволяющий конвертировать значения
 * между двоичной и десятичной системами счисления.
 */
export function BinaryTrainerPage() {
  const [binaryValue, setBinaryValue] = useState('');
  const [decimalValue, setDecimalValue] = useState('');
  const [binaryError, setBinaryError] = useState<string | null>(null);
  const [decimalError, setDecimalError] = useState<string | null>(null);

  const handleBinaryChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const rawValue = event.target.value.trim();
    if (rawValue === '') {
      setBinaryValue('');
      setDecimalValue('');
      setBinaryError(null);
      setDecimalError(null);
      return;
    }

    const sanitized = normalizeBinary(rawValue);
    if (sanitized !== rawValue) {
      setBinaryError('Используйте только цифры 0 и 1.');
      setBinaryValue(sanitized);
      if (sanitized) {
        const parsed = parseInt(sanitized, 2);
        if (!Number.isNaN(parsed)) {
          setDecimalValue(parsed.toString(10));
        } else {
          setDecimalValue('');
        }
      } else {
        setDecimalValue('');
      }
      return;
    }

    if (sanitized.length > MAX_BINARY_LENGTH) {
      setBinaryError(`Поддерживаются числа до ${MAX_BINARY_LENGTH} бит.`);
      const trimmed = sanitized.slice(0, MAX_BINARY_LENGTH);
      setBinaryValue(trimmed);
      const parsed = parseInt(trimmed, 2);
      setDecimalValue(Number.isNaN(parsed) ? '' : parsed.toString(10));
      return;
    }

    try {
      const parsed = parseInt(sanitized, 2);
      if (Number.isNaN(parsed)) {
        setBinaryError('Не удалось преобразовать число.');
        return;
      }
      setBinaryError(null);
      setDecimalError(null);
      setBinaryValue(sanitized);
      setDecimalValue(parsed.toString(10));
    } catch (error) {
      console.error('[BinaryTrainerPage] parse binary error', error);
      setBinaryError('Что-то пошло не так при преобразовании.');
    }
  };

  const handleDecimalChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const rawValue = event.target.value.trim();
    if (rawValue === '') {
      setDecimalValue('');
      setBinaryValue('');
      setBinaryError(null);
      setDecimalError(null);
      return;
    }

    const sanitized = normalizeDecimal(rawValue);
    if (sanitized !== rawValue) {
      setDecimalError('Используйте только арабские цифры.');
      setDecimalValue(sanitized);
      if (sanitized) {
        const parsed = Number.parseInt(sanitized, 10);
        if (Number.isSafeInteger(parsed)) {
          const binary = parsed.toString(2);
          setBinaryValue(
            binary.length > MAX_BINARY_LENGTH ? binary.slice(0, MAX_BINARY_LENGTH) : binary
          );
        } else {
          setBinaryValue('');
        }
      } else {
        setBinaryValue('');
      }
      return;
    }

    try {
      const parsed = Number.parseInt(sanitized, 10);
      if (!Number.isSafeInteger(parsed)) {
        setDecimalError(`Введите целое число до ${MAX_DECIMAL_SAFE.toLocaleString('ru-RU')}.`);
        return;
      }
      const binary = parsed.toString(2);
      if (binary.length > MAX_BINARY_LENGTH) {
        setDecimalError(`Число слишком большое: более ${MAX_BINARY_LENGTH} бит в двоичной записи.`);
        return;
      }
      setDecimalError(null);
      setBinaryError(null);
      setDecimalValue(sanitized);
      setBinaryValue(binary);
    } catch (error) {
      console.error('[BinaryTrainerPage] parse decimal error', error);
      setDecimalError('Что-то пошло не так при преобразовании.');
    }
  };

  return (
    <section className={styles.root} aria-labelledby="binary-trainer-title">
      <header className={styles.header}>
        <h1 id="binary-trainer-title" className={styles.title}>
          Тренажер двоичных чисел
        </h1>
        <p className={styles.subtitle}>
          Введите число в двоичном или десятичном формате — перевод выполнится мгновенно.
        </p>
      </header>

      <div className={styles.cards}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Двоичное → Десятичное</h2>
          <label className={styles.label} htmlFor="binary-input">
            Двоичное число
          </label>
          <input
            id="binary-input"
            className={styles.input}
            inputMode="numeric"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={binaryValue}
            onChange={handleBinaryChange}
            placeholder="Например, 101101"
            aria-describedby={binaryError ? 'binary-error' : undefined}
          />
          {binaryError ? (
            <p id="binary-error" className={styles.error} role="alert">
              {binaryError}
            </p>
          ) : (
            <p className={styles.hint}>
              Максимум {MAX_BINARY_LENGTH} бит ({MAX_DECIMAL_SAFE.toLocaleString('ru-RU')} в десятичном виде).
            </p>
          )}
          <div className={styles.result}>
            <span className={styles.resultLabel}>Десятичное значение</span>
            <output className={styles.resultValue} aria-live="polite">
              {decimalValue || '—'}
            </output>
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Десятичное → Двоичное</h2>
          <label className={styles.label} htmlFor="decimal-input">
            Десятичное число
          </label>
          <input
            id="decimal-input"
            className={styles.input}
            inputMode="numeric"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={decimalValue}
            onChange={handleDecimalChange}
            placeholder="Например, 45"
            aria-describedby={decimalError ? 'decimal-error' : undefined}
          />
          {decimalError ? (
            <p id="decimal-error" className={styles.error} role="alert">
              {decimalError}
            </p>
          ) : (
            <p className={styles.hint}>Используйте только неотрицательные целые числа.</p>
          )}
          <div className={styles.result}>
            <span className={styles.resultLabel}>Двоичная запись</span>
            <output className={styles.resultValue} aria-live="polite">
              {binaryValue || '—'}
            </output>
          </div>
        </div>
      </div>

      <footer className={styles.footer}>
        <h2 className={styles.footerTitle}>Как работает перевод?</h2>
        <p>
          Каждая позиция в двоичной записи — это степень двойки. Чтобы получить десятичное значение,
          сложите степени двойки, которые соответствуют единицам. Например, число 1011 = 8 + 0 + 2 + 1 = 11.
        </p>
      </footer>
    </section>
  );
}

export default BinaryTrainerPage;
