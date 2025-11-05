import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  MAX_PROGRAM_BYTES,
  MAX_SOURCE_LENGTH,
  compileSource,
  type CompileFailure,
  type CompileResult,
  type CompileSuccess,
} from './compiler';
import styles from './AssemblerCompilerPage.module.css';

type SampleProgram = {
  id: string;
  title: string;
  description: string;
  source: string;
};

const SAMPLE_PROGRAMS: SampleProgram[] = [
  {
    id: 'hello',
    title: 'Стартовая программа',
    description: 'Загружает значения, складывает и сохраняет результат в памяти.',
    source: `; Простая программа: складываем два числа и сохраняем результат
LOAD A, #5
LOAD B, #7
ADD A, B
STORE A, [0x01]
HLT`,
  },
  {
    id: 'loop',
    title: 'Цикл со счётчиком',
    description: 'Суммируем числа от 3 до 1 и сохраняем итог в памяти.',
    source: `; Циклическая программа суммирования
LOAD A, #0      ; аккумулятор
LOAD B, #3      ; счётчик
LOOP: ADD A, B
DEC B
JNZ LOOP
STORE A, [0x02]
HLT`,
  },
  {
    id: 'compare',
    title: 'Сравнение и ветвление',
    description: 'Показывает работу CMP и условных переходов.',
    source: `; Сравниваем два значения и выставляем флаг
LOAD A, #4
LOAD B, #9
CMP A, B
JZ EQUAL
LOAD C, #1
JMP DONE
EQUAL: LOAD C, #0
DONE: HLT`,
  },
];

const DEFAULT_SAMPLE = SAMPLE_PROGRAMS[0]?.id ?? 'custom';
const DEFAULT_SOURCE = SAMPLE_PROGRAMS.find(sample => sample.id === DEFAULT_SAMPLE)?.source ?? 'HLT';

const INSTRUCTION_GUIDE: Array<{ title: string; body: string }> = [
  {
    title: 'LOAD R, #N / LOAD R, [addr]',
    body: 'Загружает в регистр немедленное значение (#N) или байт из памяти по адресу [addr]. Адреса и значения ограничены диапазоном 0..255.',
  },
  {
    title: 'STORE R, [addr]',
    body: 'Сохраняет содержимое регистра в память по адресу. Память — 256 байт, безопасно ограничена в симуляторе.',
  },
  {
    title: 'ADD/SUB/CMP R1, R2',
    body: 'Арифметические и сравнительные инструкции работают только с регистрами A, B, C, D.',
  },
  {
    title: 'INC/DEC R',
    body: 'Увеличивает или уменьшает регистр на единицу. Значения автоматически нормализуются модулю 256.',
  },
  {
    title: 'JMP/JNZ/JZ LABEL',
    body: 'Безопасные переходы внутри программы. Метки автоматически нормализуются в верхний регистр.',
  },
  {
    title: 'HLT',
    body: 'Останавливает виртуальную машину. Всегда завершайте программы этой инструкцией.',
  },
];

function isSuccess(result: CompileResult): result is CompileSuccess {
  return 'bytes' in result;
}

function isFailure(result: CompileResult): result is CompileFailure {
  return 'errors' in result && !('bytes' in result);
}

function formatHexDump(bytes: number[]): string {
  if (bytes.length === 0) {
    return '—';
  }
  const groups: string[] = [];
  for (let index = 0; index < bytes.length; index += 16) {
    const slice = bytes.slice(index, index + 16);
    const hex = slice.map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    groups.push(hex);
  }
  return groups.join('\n');
}

export function AssemblerCompilerPage() {
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [autoCompile, setAutoCompile] = useState(true);
  const [result, setResult] = useState<CompileResult>(() => compileSource(DEFAULT_SOURCE));
  const [lastCompiledAt, setLastCompiledAt] = useState<Date | null>(() => new Date());
  const [selectedSample, setSelectedSample] = useState<string>(DEFAULT_SAMPLE);

  useEffect(() => {
    if (!autoCompile) {
      return;
    }
    const timer = window.setTimeout(() => {
      setResult(compileSource(source));
      setLastCompiledAt(new Date());
    }, 200);
    return () => window.clearTimeout(timer);
  }, [source, autoCompile]);

  const handleCompile = () => {
    setResult(compileSource(source));
    setLastCompiledAt(new Date());
  };

  const handleSampleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextId = event.target.value;
    setSelectedSample(nextId);
    const next = SAMPLE_PROGRAMS.find(sample => sample.id === nextId);
    if (next) {
      setSource(next.source);
    }
  };

  const handleSourceChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setSource(event.target.value.slice(0, MAX_SOURCE_LENGTH));
    setSelectedSample('custom');
  };

  const hexDump = useMemo(() => (isSuccess(result) ? formatHexDump(result.bytes) : ''), [result]);
  const activeSample = useMemo(
    () => SAMPLE_PROGRAMS.find(sample => sample.id === selectedSample) ?? null,
    [selectedSample]
  );
  const bytesLength = isSuccess(result) ? result.bytes.length : 0;
  return (
    <section className={styles.root} aria-labelledby="assembler-compiler-title">
      <header className={styles.header}>
        <p className={styles.subtitle}>Новая утилита</p>
        <h1 id="assembler-compiler-title" className={styles.title}>
          Онлайн-компилятор безопасного ассемблера
        </h1>
        <p className={styles.subtitle}>
          Пишите программы для тренировочного CPU: доступен минимальный набор инструкций, метки и
          статическая проверка. Все преобразования выполняются прямо в браузере без выполнения произвольного кода.
        </p>
        <p className={styles.hint}>
          Код ограничен {MAX_SOURCE_LENGTH.toLocaleString('ru-RU')} символами, результат — {MAX_PROGRAM_BYTES} байт.
        </p>
      </header>

      <div className={styles.content}>
        <div className={styles.editorCard}>
          <div>
            <h2 className={styles.editorTitle}>Исходный код</h2>
            <p className={styles.hint}>
              Доступны регистры A, B, C, D и память на 256 байт. Комментарии начинаются с «;».
            </p>
          </div>

          <div className={styles.controls}>
            <label htmlFor="assembler-sample" className={styles.hint}>
              Готовые примеры
            </label>
            <select
              id="assembler-sample"
              className={styles.select}
              value={selectedSample}
              onChange={handleSampleChange}
            >
              <option value="custom">Своя программа</option>
              {SAMPLE_PROGRAMS.map(sample => (
                <option key={sample.id} value={sample.id}>
                  {sample.title}
                </option>
              ))}
            </select>
            {activeSample ? <p className={styles.hint}>{activeSample.description}</p> : null}
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={autoCompile}
                onChange={event => setAutoCompile(event.target.checked)}
              />
              Автокомпиляция
            </label>
          </div>

          <textarea
            value={source}
            onChange={handleSourceChange}
            spellCheck={false}
            className={styles.textarea}
            maxLength={MAX_SOURCE_LENGTH}
            aria-label="Редактор ассемблера"
          />

          <div className={styles.actions}>
            <button type="button" className={styles.compileButton} onClick={handleCompile}>
              Скомпилировать
            </button>
            <span className={styles.status}>
              {lastCompiledAt
                ? `Обновлено ${lastCompiledAt.toLocaleTimeString('ru-RU')}`
                : 'Ещё не компилировали'}
            </span>
          </div>

          <div className={styles.instructionList} aria-label="Поддерживаемые инструкции">
            {INSTRUCTION_GUIDE.map(item => (
              <article key={item.title} className={styles.instructionItem}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className={styles.resultCard}>
          <div className={styles.resultHeader}>
            <h2 className={styles.resultTitle}>Результат компиляции</h2>
            {isSuccess(result) ? (
              <span className={styles.badgeSuccess}>
                ✅ {bytesLength} байт
              </span>
            ) : (
              <span className={styles.badgeError}>⚠️ Ошибка</span>
            )}
          </div>

          {isFailure(result) ? (
            <div>
              <p className={styles.hint}>
                Проверьте синтаксис: каждая инструкция и операнд проходят строгую проверку.
              </p>
              <ul className={styles.errorList} role="alert">
                {result.errors.map(error => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.warnings.length > 0 ? (
            <div>
              <p className={styles.hint}>Предупреждения</p>
              <ul className={styles.warningList}>
                {result.warnings.map((warning, index) => (
                  <li key={`${warning.message}-${warning.line ?? index}`}>
                    {warning.line ? `Строка ${warning.line}: ` : ''}
                    {warning.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {isSuccess(result) ? (
            <div className={styles.outputGrid}>
              <div className={styles.outputBlock}>
                <span className={styles.outputLabel}>HEX</span>
                <pre className={styles.outputArea}>{hexDump}</pre>
              </div>

              <div className={styles.outputBlock}>
                <span className={styles.outputLabel}>Листинг</span>
                {result.listing.length > 0 ? (
                  <pre className={styles.listing}>{result.listing.join('\n')}</pre>
                ) : (
                  <p className={styles.hint}>Листинг пуст.</p>
                )}
              </div>

              <div className={styles.outputBlock}>
                <span className={styles.outputLabel}>Таблица меток</span>
                {Object.keys(result.symbolTable).length > 0 ? (
                  <table className={styles.symbolTable}>
                    <thead>
                      <tr>
                        <th scope="col">Метка</th>
                        <th scope="col">Адрес</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(result.symbolTable).map(([label, address]) => (
                        <tr key={label}>
                          <td>{label}</td>
                          <td>
                            <code>0x{address.toString(16).padStart(2, '0').toUpperCase()}</code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className={styles.hint}>Метки отсутствуют.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default AssemblerCompilerPage;
