import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import styles from './CpuTrainerPage.module.css';

type Register = 'A' | 'B' | 'C' | 'D';
type Phase = 'fetch' | 'decode' | 'execute';

type Operation =
  | 'LOAD'
  | 'STORE'
  | 'ADD'
  | 'SUB'
  | 'INC'
  | 'DEC'
  | 'CMP'
  | 'JMP'
  | 'JNZ'
  | 'JZ'
  | 'HLT';

type Operand =
  | { kind: 'register'; value: Register }
  | { kind: 'immediate'; value: number }
  | { kind: 'memory'; address: number }
  | { kind: 'label'; name: string };

interface Instruction {
  op: Operation;
  operands: Operand[];
  line: number;
  raw: string;
}

interface Program {
  instructions: Instruction[];
  labelMap: Record<string, number>;
}

interface ParseResult {
  program: Program | null;
  errors: string[];
}

interface CpuFlags {
  Z: boolean;
  N: boolean;
}

interface CpuState {
  pc: number;
  registers: Record<Register, number>;
  memory: number[];
  flags: CpuFlags;
  halted: boolean;
  cycles: number;
}

interface HistoryEntry {
  cycle: number;
  instruction: Instruction;
  explanation: string;
  snapshot: CpuState;
}

const REGISTER_LIST: Register[] = ['A', 'B', 'C', 'D'];
const MEMORY_SIZE = 16;

const SAMPLE_PROGRAMS = [
  {
    id: 'sum',
    title: 'Сложение и сохранение результата',
    source: `; Складываем два числа и сохраняем сумму в памяти
LOAD A, #5
LOAD B, #7
ADD A, B
STORE A, [0x00]
HLT`,
  },
  {
    id: 'loop',
    title: 'Цикл с суммированием',
    source: `; Суммируем значения счётчика от 3 до 1
LOAD A, #0      ; аккумулятор
LOAD B, #3      ; счётчик
LOOP: ADD A, B
DEC B
JNZ LOOP
STORE A, [0x01]
HLT`,
  },
  {
    id: 'compare',
    title: 'Сравнение и ветвление',
    source: `; Сравниваем два значения и переходим по условию
LOAD A, #4
LOAD B, #9
CMP A, B
JZ EQUAL
LOAD C, #1
JMP DONE
EQUAL: LOAD C, #0
DONE: HLT`,
  },
] as const;

const PHASE_TITLES: Record<Phase, string> = {
  fetch: 'Выборка (Fetch)',
  decode: 'Декодирование (Decode)',
  execute: 'Выполнение (Execute)',
};

function createInitialState(program: Program | null): CpuState {
  return {
    pc: 0,
    registers: REGISTER_LIST.reduce<Record<Register, number>>((acc, register) => {
      acc[register] = 0;
      return acc;
    }, {} as Record<Register, number>),
    memory: Array.from({ length: MEMORY_SIZE }, () => 0),
    flags: { Z: false, N: false },
    halted: !program || program.instructions.length === 0,
    cycles: 0,
  };
}

function parseNumber(token: string): number | null {
  const value = token.trim();
  if (/^[-+]?0x[0-9a-f]+$/i.test(value)) {
    return Number.parseInt(value, 16);
  }
  if (/^[-+]?\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }
  return null;
}

function parseProgram(source: string): ParseResult {
  const lines = source.split(/\r?\n/);
  const instructions: Instruction[] = [];
  const labelMap: Record<string, number> = {};
  const pendingLabelRefs: Array<{ label: string; line: number }> = [];
  const errors: string[] = [];

  lines.forEach((line, lineIndex) => {
    const lineNumber = lineIndex + 1;
    const withoutComment = line.replace(/;.*/, '').trim();
    if (!withoutComment) {
      return;
    }

    let workingLine = withoutComment;
    const labelMatch = workingLine.match(/^([A-Za-z_][\w]*):/);
    if (labelMatch) {
      const labelName = labelMatch[1].toUpperCase();
      if (labelMap[labelName] !== undefined) {
        errors.push(`Строка ${lineNumber}: метка ${labelName} уже определена ранее.`);
      } else {
        labelMap[labelName] = instructions.length;
      }
      workingLine = workingLine.slice(labelMatch[0].length).trim();
      if (!workingLine) {
        return;
      }
    }

    const firstSpace = workingLine.indexOf(' ');
    const opToken = firstSpace === -1 ? workingLine : workingLine.slice(0, firstSpace);
    const operandPart = firstSpace === -1 ? '' : workingLine.slice(firstSpace + 1).trim();
    const op = opToken.toUpperCase() as Operation;

    if (!['LOAD', 'STORE', 'ADD', 'SUB', 'INC', 'DEC', 'CMP', 'JMP', 'JNZ', 'JZ', 'HLT'].includes(op)) {
      errors.push(`Строка ${lineNumber}: неизвестная инструкция ${opToken}.`);
      return;
    }

    const operandTokens = operandPart
      ? operandPart
          .split(',')
          .map(token => token.trim())
          .filter(Boolean)
      : [];

    const operands: Operand[] = [];

    operandTokens.forEach(token => {
      if (/^\[[^\]]+\]$/.test(token)) {
        const addressToken = token.slice(1, -1).trim();
        const address = parseNumber(addressToken);
        if (address === null || address < 0 || address >= MEMORY_SIZE) {
          errors.push(
            `Строка ${lineNumber}: адрес памяти "${addressToken}" вне диапазона 0-${MEMORY_SIZE - 1}.`
          );
        } else {
          operands.push({ kind: 'memory', address });
        }
        return;
      }

      if (/^#[^#]+$/.test(token)) {
        const value = parseNumber(token.slice(1));
        if (value === null) {
          errors.push(`Строка ${lineNumber}: не удалось разобрать число ${token}.`);
        } else {
          operands.push({ kind: 'immediate', value });
        }
        return;
      }

      const upperToken = token.toUpperCase();
      if (REGISTER_LIST.includes(upperToken as Register)) {
        operands.push({ kind: 'register', value: upperToken as Register });
        return;
      }

      if (/^[A-Za-z_][\w]*$/.test(token)) {
        const label = token.toUpperCase();
        operands.push({ kind: 'label', name: label });
        pendingLabelRefs.push({ label, line: lineNumber });
        return;
      }

      errors.push(`Строка ${lineNumber}: не удалось разобрать операнд "${token}".`);
    });

    const expectedOperands: Record<Operation, number[]> = {
      LOAD: [2],
      STORE: [2],
      ADD: [2],
      SUB: [2],
      INC: [1],
      DEC: [1],
      CMP: [2],
      JMP: [1],
      JNZ: [1],
      JZ: [1],
      HLT: [0],
    };

    if (!expectedOperands[op].includes(operands.length)) {
      errors.push(
        `Строка ${lineNumber}: инструкция ${op} ожидает ${expectedOperands[op].join(
          ' или '
        )} операндов, получено ${operands.length}.`
      );
    }

    instructions.push({ op, operands, line: lineNumber, raw: withoutComment });
  });

  pendingLabelRefs.forEach(({ label, line }) => {
    if (labelMap[label] === undefined) {
      errors.push(`Строка ${line}: метка ${label} не найдена. Добавьте определение метки.`);
    }
  });

  if (errors.length > 0) {
    return { program: null, errors };
  }

  return { program: { instructions, labelMap }, errors };
}

function describeOperand(operand: Operand): string {
  switch (operand.kind) {
    case 'register':
      return `регистр ${operand.value}`;
    case 'immediate':
      return `значение ${operand.value}`;
    case 'memory':
      return `ячейку памяти [${operand.address.toString(16).toUpperCase()}h]`;
    case 'label':
      return `метку ${operand.name}`;
    default:
      return '';
  }
}

function cloneState(state: CpuState): CpuState {
  return {
    pc: state.pc,
    registers: { ...state.registers },
    memory: [...state.memory],
    flags: { ...state.flags },
    halted: state.halted,
    cycles: state.cycles,
  };
}

function updateFlagsForValue(state: CpuState, value: number) {
  state.flags = {
    Z: value === 0,
    N: value < 0,
  };
}

function getOperandValue(state: CpuState, operand: Operand, program: Program): number {
  switch (operand.kind) {
    case 'register':
      return state.registers[operand.value];
    case 'immediate':
      return operand.value;
    case 'memory':
      return state.memory[operand.address];
    case 'label':
      return program.labelMap[operand.name] ?? 0;
    default:
      return 0;
  }
}

function executeInstruction(state: CpuState, instruction: Instruction, program: Program): {
  state: CpuState;
  explanation: string;
} {
  const next = cloneState(state);
  next.cycles = state.cycles + 1;
  let explanation = '';
  let advancePc = true;

  const [op1, op2] = instruction.operands;

  switch (instruction.op) {
    case 'HLT': {
      next.halted = true;
      explanation = 'Инструкция HLT останавливает процессор. Выполнение программы завершено.';
      advancePc = false;
      break;
    }
    case 'LOAD': {
      if (!op1 || op1.kind !== 'register') {
        throw new Error('LOAD ожидает регистр в качестве приёмника.');
      }
      const targetRegister = op1.value;
      if (!op2) {
        throw new Error('LOAD ожидает источник.');
      }
      let value: number;
      if (op2.kind === 'register' || op2.kind === 'immediate') {
        value = getOperandValue(next, op2, program);
        explanation = `Загружаем ${describeOperand(op2)} в регистр ${targetRegister}.`;
      } else if (op2.kind === 'memory') {
        value = next.memory[op2.address];
        explanation = `Читаем значение из памяти по адресу ${op2.address} и сохраняем его в регистр ${targetRegister}.`;
      } else {
        const address = program.labelMap[op2.name];
        value = address ?? 0;
        explanation = `Загружаем адрес метки ${op2.name} (${address}) в регистр ${targetRegister}.`;
      }
      next.registers[targetRegister] = value;
      updateFlagsForValue(next, value);
      break;
    }
    case 'STORE': {
      if (!op1 || op1.kind !== 'register' || !op2 || op2.kind !== 'memory') {
        throw new Error('STORE ожидает вид STORE <рег>, [адрес]');
      }
      const value = next.registers[op1.value];
      next.memory[op2.address] = value;
      explanation = `Сохраняем значение ${value} из регистра ${op1.value} в память по адресу ${op2.address}.`;
      break;
    }
    case 'ADD': {
      if (!op1 || op1.kind !== 'register' || !op2) {
        throw new Error('ADD ожидает регистр и второй операнд.');
      }
      const value = next.registers[op1.value] + getOperandValue(next, op2, program);
      next.registers[op1.value] = value;
      updateFlagsForValue(next, value);
      explanation = `Складываем содержимое регистра ${op1.value} с ${describeOperand(op2)}. Результат: ${value}.`;
      break;
    }
    case 'SUB': {
      if (!op1 || op1.kind !== 'register' || !op2) {
        throw new Error('SUB ожидает регистр и второй операнд.');
      }
      const value = next.registers[op1.value] - getOperandValue(next, op2, program);
      next.registers[op1.value] = value;
      updateFlagsForValue(next, value);
      explanation = `Вычитаем ${describeOperand(op2)} из регистра ${op1.value}. Результат: ${value}.`;
      break;
    }
    case 'INC': {
      if (!op1 || op1.kind !== 'register') {
        throw new Error('INC ожидает регистр.');
      }
      const value = next.registers[op1.value] + 1;
      next.registers[op1.value] = value;
      updateFlagsForValue(next, value);
      explanation = `Увеличиваем регистр ${op1.value} на единицу. Теперь в нём ${value}.`;
      break;
    }
    case 'DEC': {
      if (!op1 || op1.kind !== 'register') {
        throw new Error('DEC ожидает регистр.');
      }
      const value = next.registers[op1.value] - 1;
      next.registers[op1.value] = value;
      updateFlagsForValue(next, value);
      explanation = `Уменьшаем регистр ${op1.value} на единицу. Теперь в нём ${value}.`;
      break;
    }
    case 'CMP': {
      if (!op1 || op1.kind !== 'register' || !op2) {
        throw new Error('CMP ожидает регистр и второй операнд.');
      }
      const diff = next.registers[op1.value] - getOperandValue(next, op2, program);
      updateFlagsForValue(next, diff);
      explanation = `Сравниваем регистр ${op1.value} с ${describeOperand(op2)}. Разность ${diff}, установлены флаги.`;
      break;
    }
    case 'JMP': {
      if (!op1 || op1.kind !== 'label') {
        throw new Error('JMP ожидает метку.');
      }
      const target = program.labelMap[op1.name];
      if (target === undefined) {
        next.halted = true;
        advancePc = false;
        explanation = `Метка ${op1.name} не найдена. Выполнение остановлено.`;
      } else {
        next.pc = target;
        advancePc = false;
        explanation = `Безусловный переход на метку ${op1.name} (инструкция ${target}).`;
      }
      break;
    }
    case 'JNZ': {
      if (!op1 || op1.kind !== 'label') {
        throw new Error('JNZ ожидает метку.');
      }
      if (!next.flags.Z) {
        const target = program.labelMap[op1.name];
        if (target === undefined) {
          next.halted = true;
          advancePc = false;
          explanation = `Метка ${op1.name} не найдена. Выполнение остановлено.`;
        } else {
          next.pc = target;
          advancePc = false;
          explanation = `Флаг Z=0, выполняем переход на ${op1.name} (инструкция ${target}).`;
        }
      } else {
        explanation = 'Флаг Z=1, условный переход JNZ пропущен.';
      }
      break;
    }
    case 'JZ': {
      if (!op1 || op1.kind !== 'label') {
        throw new Error('JZ ожидает метку.');
      }
      if (next.flags.Z) {
        const target = program.labelMap[op1.name];
        if (target === undefined) {
          next.halted = true;
          advancePc = false;
          explanation = `Метка ${op1.name} не найдена. Выполнение остановлено.`;
        } else {
          next.pc = target;
          advancePc = false;
          explanation = `Флаг Z=1, переходим на ${op1.name} (инструкция ${target}).`;
        }
      } else {
        explanation = 'Флаг Z=0, команда JZ пропущена.';
      }
      break;
    }
    default:
      break;
  }

  if (advancePc) {
    next.pc = state.pc + 1;
    if (next.pc >= program.instructions.length) {
      next.halted = true;
    }
  }

  return { state: next, explanation };
}

export function CpuTrainerPage() {
  const [programText, setProgramText] = useState(SAMPLE_PROGRAMS[0].source);
  const initialParse = useMemo(() => parseProgram(SAMPLE_PROGRAMS[0].source), []);
  const [program, setProgram] = useState<Program | null>(initialParse.program);
  const [errors, setErrors] = useState<string[]>(initialParse.errors);
  const [cpuState, setCpuState] = useState<CpuState>(() => createInitialState(initialParse.program));
  const [phase, setPhase] = useState<Phase>('fetch');
  const [fetchedInstruction, setFetchedInstruction] = useState<Instruction | null>(null);
  const [explanation, setExplanation] = useState<string>(
    'Нажмите «Шаг», чтобы увидеть цикл выборки-декодирования и выполнения.'
  );
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedSample, setSelectedSample] = useState<string>(SAMPLE_PROGRAMS[0].id);

  const handleProgramChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setProgramText(event.target.value);
  }, []);

  const handleSelectSample = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const sampleId = event.target.value;
    setSelectedSample(sampleId);
    const sample = SAMPLE_PROGRAMS.find(item => item.id === sampleId);
    if (sample) {
      setProgramText(sample.source);
      const result = parseProgram(sample.source);
      setProgram(result.program);
      setErrors(result.errors);
      setCpuState(createInitialState(result.program));
      setPhase('fetch');
      setFetchedInstruction(null);
      setExplanation('Исходный код обновлён. Нажмите «Шаг», чтобы начать симуляцию.');
      setHistory([]);
      setIsRunning(false);
    }
  }, []);

  const handleAssemble = useCallback(() => {
    const result = parseProgram(programText);
    setErrors(result.errors);
    if (result.errors.length === 0) {
      setProgram(result.program);
      setCpuState(createInitialState(result.program));
      setPhase('fetch');
      setFetchedInstruction(null);
      setExplanation('Программа собрана. Нажмите «Шаг», чтобы начать выполнение.');
      setHistory([]);
      setIsRunning(false);
    }
  }, [programText]);

  const handleReset = useCallback(() => {
    setCpuState(prev => createInitialState(program));
    setPhase('fetch');
    setFetchedInstruction(null);
    setExplanation('Состояние процессора сброшено. Нажмите «Шаг» для новой итерации.');
    setHistory([]);
    setIsRunning(false);
  }, [program]);

  const handleStep = useCallback(() => {
    if (!program || cpuState.halted) {
      setIsRunning(false);
      return;
    }

    const currentInstruction = fetchedInstruction ?? program.instructions[cpuState.pc] ?? null;

    if (phase === 'fetch') {
      if (!currentInstruction) {
        setExplanation('Инструкций больше нет — программа завершена.');
        setCpuState(prev => ({ ...prev, halted: true }));
        setIsRunning(false);
        return;
      }
      setFetchedInstruction(currentInstruction);
      setExplanation(
        `Фаза выборки: загружаем инструкцию №${cpuState.pc} «${currentInstruction.raw}» из памяти программы.`
      );
      setPhase('decode');
      return;
    }

    if (phase === 'decode') {
      if (!currentInstruction) {
        setPhase('fetch');
        return;
      }
      const operandsDescription = currentInstruction.operands
        .map(describeOperand)
        .filter(Boolean)
        .join(', ');
      setExplanation(
        operandsDescription
          ? `Фаза декодирования: определяем операцию ${currentInstruction.op} и операнды (${operandsDescription}).`
          : `Фаза декодирования: определяем операцию ${currentInstruction.op} без операндов.`
      );
      setPhase('execute');
      return;
    }

    if (phase === 'execute') {
      if (!currentInstruction) {
        setPhase('fetch');
        return;
      }
      try {
        const result = executeInstruction(cpuState, currentInstruction, program);
        setCpuState(result.state);
        setExplanation(result.explanation);
        setHistory(prev => [
          ...prev,
          {
            cycle: result.state.cycles,
            instruction: currentInstruction,
            explanation: result.explanation,
            snapshot: cloneState(result.state),
          },
        ]);
        setFetchedInstruction(null);
        setPhase('fetch');
        if (result.state.halted) {
          setIsRunning(false);
        }
      } catch (error) {
        console.error('[CpuTrainer] execute error', error);
        setExplanation('При выполнении инструкции произошла ошибка. Подробности в консоли.');
        setIsRunning(false);
        setCpuState(prev => ({ ...prev, halted: true }));
      }
    }
  }, [cpuState, fetchedInstruction, phase, program]);

  const handleToggleRun = useCallback(() => {
    if (cpuState.halted) {
      setIsRunning(false);
      return;
    }
    setIsRunning(prev => !prev);
  }, [cpuState.halted]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }
    if (cpuState.halted) {
      setIsRunning(false);
      return;
    }
    const timer = setTimeout(() => {
      handleStep();
    }, phase === 'execute' ? 150 : 350);
    return () => clearTimeout(timer);
  }, [isRunning, cpuState.halted, phase, handleStep]);

  const currentInstructionIndex = fetchedInstruction ? cpuState.pc : cpuState.pc;

  return (
    <section className={styles.root} aria-labelledby="cpu-trainer-title">
      <header className={styles.header}>
        <h1 id="cpu-trainer-title" className={styles.title}>
          Тренажёр процессора
        </h1>
        <p className={styles.subtitle}>
          Пошагово исследуйте цикл «выборка → декодирование → выполнение», наблюдая за регистрами, памятью и
          флагами процессора. Меняйте программу, запускайте её снова и экспериментируйте с логикой.
        </p>
      </header>

      <div className={styles.layout}>
        <div className={styles.editorCard}>
          <div className={styles.editorHeader}>
            <div className={styles.sampleSelect}>
              <label className={styles.sampleLabel} htmlFor="sample-program">
                Готовые сценарии
              </label>
              <select
                id="sample-program"
                className={styles.select}
                value={selectedSample}
                onChange={handleSelectSample}
              >
                {SAMPLE_PROGRAMS.map(sample => (
                  <option key={sample.id} value={sample.id}>
                    {sample.title}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.toolbar}>
              <button type="button" className={styles.button} onClick={handleAssemble}>
                Собрать программу
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.secondaryButton}`}
                onClick={handleReset}
              >
                Сбросить состояние
              </button>
            </div>
          </div>

          <div className={styles.textareaWrapper}>
            <label className={styles.textareaLabel} htmlFor="cpu-program">
              Ассемблероподобная программа
            </label>
            <textarea
              id="cpu-program"
              className={styles.textarea}
              spellCheck={false}
              value={programText}
              onChange={handleProgramChange}
              aria-invalid={errors.length > 0}
              aria-describedby={errors.length > 0 ? 'cpu-program-errors' : undefined}
            />
          </div>

          {errors.length > 0 && (
            <div id="cpu-program-errors" className={styles.errors} role="alert">
              {errors.map(error => (
                <span key={error}>{error}</span>
              ))}
            </div>
          )}
        </div>

        <div className={styles.panel}>
          <div className={styles.phaseCard}>
            <h2 className={styles.phaseTitle}>Текущая фаза</h2>
            <div className={styles.phaseBadges}>
              {(Object.keys(PHASE_TITLES) as Phase[]).map(key => (
                <span
                  key={key}
                  className={`${styles.phaseBadge} ${key === phase ? styles.phaseBadgeActive : ''}`}
                >
                  {PHASE_TITLES[key]}
                </span>
              ))}
              {cpuState.halted && <span className={`${styles.phaseBadge} ${styles.badgeHalted}`}>Процессор остановлен</span>}
            </div>
            <p className={styles.explanation}>{explanation}</p>
            <div className={styles.controlsRow}>
              <button
                type="button"
                className={styles.button}
                onClick={handleStep}
                disabled={!program || cpuState.halted}
              >
                Шаг
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.secondaryButton}`}
                onClick={handleToggleRun}
                disabled={!program || cpuState.halted}
              >
                {isRunning ? 'Пауза' : 'Автовыполнение'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.simulatorLayout}>
        <div className={styles.instructionsCard}>
          <h2 className={styles.instructionsTitle}>Инструкции программы</h2>
          {program && program.instructions.length > 0 ? (
            <div className={styles.instructionsList}>
              {program.instructions.map((instruction, index) => {
                const isActive = !cpuState.halted && index === currentInstructionIndex;
                return (
                  <div
                    key={`${instruction.raw}-${instruction.line}-${index}`}
                    className={`${styles.instruction} ${isActive ? styles.instructionActive : ''}`}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <span className={styles.instructionIndex}>{index.toString().padStart(2, '0')}</span>
                    <span className={styles.instructionText}>{instruction.raw}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={styles.emptyState}>Нет инструкций. Добавьте код и соберите программу.</p>
          )}
        </div>

        <div className={styles.stateCard}>
          <h2 className={styles.stateTitle}>Состояние процессора</h2>
          <div className={styles.stateGrid}>
            <div className={styles.meta}>
              <span className={styles.stateLabel}>Служебные счётчики</span>
              <div className={styles.metaList}>
                <span>PC: {cpuState.pc}</span>
                <span>Циклы: {cpuState.cycles}</span>
                <span>Статус: {cpuState.halted ? 'остановлен' : 'активен'}</span>
              </div>
            </div>
            <div className={styles.registers}>
              <span className={styles.stateLabel}>Регистры</span>
              <div className={styles.registerList}>
                {REGISTER_LIST.map(register => (
                  <span key={register}>
                    {register}: {cpuState.registers[register]}
                  </span>
                ))}
              </div>
            </div>
            <div className={styles.flags}>
              <span className={styles.stateLabel}>Флаги</span>
              <div className={styles.flagList}>
                <span>Z: {cpuState.flags.Z ? 1 : 0}</span>
                <span>N: {cpuState.flags.N ? 1 : 0}</span>
              </div>
            </div>
            <div className={styles.memory}>
              <span className={styles.stateLabel}>Память (16 ячеек)</span>
              <div className={styles.memoryGrid}>
                {cpuState.memory.map((value, index) => (
                  <div key={index} className={styles.memoryCell}>
                    <span className={styles.memoryAddress}>[{index.toString(16).toUpperCase()}]</span>
                    <span className={styles.memoryValue}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.historyCard}>
        <h2 className={styles.historyTitle}>История выполнения</h2>
        {history.length > 0 ? (
          <div className={styles.historyList}>
            {history.slice(-12).map(entry => (
              <div key={`${entry.cycle}-${entry.instruction.line}`} className={styles.historyItem}>
                <span className={styles.historyInstruction}>
                  #{entry.cycle}: {entry.instruction.raw}
                </span>
                <span className={styles.historyExplanation}>{entry.explanation}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyState}>История появится после выполнения первой инструкции.</p>
        )}
      </div>
    </section>
  );
}
