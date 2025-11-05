export type Operation =
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

type Register = 'A' | 'B' | 'C' | 'D';

type Operand =
  | { kind: 'register'; value: Register; raw: string }
  | { kind: 'immediate'; value: number; raw: string }
  | { kind: 'memory'; address: number; raw: string }
  | { kind: 'label'; name: string; raw: string };

interface IntermediateInstruction {
  op: Operation;
  operands: Operand[];
  line: number;
  raw: string;
}

export interface CompileWarning {
  message: string;
  line: number | null;
}

export interface CompileSuccess {
  bytes: number[];
  listing: string[];
  symbolTable: Record<string, number>;
  warnings: CompileWarning[];
}

export interface CompileFailure {
  errors: string[];
  warnings: CompileWarning[];
}

export type CompileResult = CompileSuccess | CompileFailure;

const REGISTER_SET: Record<Register, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
};

const OPCODE_MAP: Record<Operation, number> = {
  LOAD: 0x01,
  STORE: 0x02,
  ADD: 0x03,
  SUB: 0x04,
  INC: 0x05,
  DEC: 0x06,
  CMP: 0x07,
  JMP: 0x08,
  JNZ: 0x09,
  JZ: 0x0a,
  HLT: 0xff,
};

export const MAX_PROGRAM_BYTES = 256;
export const MAX_SOURCE_LENGTH = 8000;

function isOperation(token: string): token is Operation {
  return token.toUpperCase() in OPCODE_MAP;
}

function parseNumber(token: string): number | null {
  const trimmed = token.trim();
  if (/^[-+]?0x[0-9a-f]+$/i.test(trimmed)) {
    return Number.parseInt(trimmed, 16);
  }
  if (/^[-+]?\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }
  return null;
}

function sanitizeLabel(label: string): string | null {
  const normalized = label.trim().toUpperCase();
  if (!normalized) {
    return null;
  }
  if (!/^[A-Z_][A-Z0-9_]*$/.test(normalized)) {
    return null;
  }
  return normalized;
}

function getInstructionSize(instruction: IntermediateInstruction): number {
  switch (instruction.op) {
    case 'HLT':
      return 1;
    case 'INC':
    case 'DEC':
      return 2;
    case 'ADD':
    case 'SUB':
    case 'CMP':
      return 2;
    case 'LOAD':
    case 'STORE':
      return 3;
    case 'JMP':
    case 'JNZ':
    case 'JZ':
      return 2;
    default:
      return 0;
  }
}

function formatHex(value: number): string {
  return value.toString(16).padStart(2, '0').toUpperCase();
}

function createWarning(message: string, line: number | null): CompileWarning {
  return { message, line };
}

interface ParseOutput {
  instructions: IntermediateInstruction[];
  labels: Record<string, number>;
  errors: string[];
  warnings: CompileWarning[];
}

function parseSource(source: string): ParseOutput {
  const instructions: IntermediateInstruction[] = [];
  const labels: Record<string, number> = {};
  const warnings: CompileWarning[] = [];
  const errors: string[] = [];

  const lines = source.split(/\r?\n/);
  let pendingLabel: string | null = null;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const withoutComment = line.replace(/;.*/, '').trim();

    if (withoutComment.length === 0) {
      if (pendingLabel && !(pendingLabel in labels)) {
        labels[pendingLabel] = instructions.length;
        pendingLabel = null;
      }
      return;
    }

    let working = withoutComment;
    const labelMatch = working.match(/^([A-Za-z_][\w]*):/);
    if (labelMatch) {
      const normalized = sanitizeLabel(labelMatch[1]);
      if (!normalized) {
        errors.push(`Строка ${lineNumber}: некорректное имя метки "${labelMatch[1]}".`);
        return;
      }
      if (labels[normalized] !== undefined) {
        errors.push(`Строка ${lineNumber}: метка ${normalized} уже объявлена.`);
        return;
      }
      if (pendingLabel && !(pendingLabel in labels)) {
        labels[pendingLabel] = instructions.length;
      }
      pendingLabel = normalized;
      working = working.slice(labelMatch[0].length).trim();
      if (!working) {
        return;
      }
    }

    const [opToken, ...restTokens] = working.split(/\s+/);
    const operation = opToken.toUpperCase();
    if (!isOperation(operation)) {
      errors.push(`Строка ${lineNumber}: неизвестная инструкция ${opToken}.`);
      return;
    }

    const operandsPart = restTokens.join(' ');
    const operandTokens = operandsPart
      ? operandsPart
          .split(',')
          .map(token => token.trim())
          .filter(Boolean)
      : [];

    const operands: Operand[] = [];

    for (const token of operandTokens) {
      if (/^\[[^\]]+\]$/.test(token)) {
        const inner = token.slice(1, -1);
        const value = parseNumber(inner);
        if (value === null) {
          errors.push(`Строка ${lineNumber}: не удалось разобрать адрес памяти "${token}".`);
          break;
        }
        operands.push({ kind: 'memory', address: value, raw: token });
        continue;
      }

      if (/^#/.test(token)) {
        const numeric = parseNumber(token.slice(1));
        if (numeric === null) {
          errors.push(`Строка ${lineNumber}: не удалось разобрать число "${token}".`);
          break;
        }
        operands.push({ kind: 'immediate', value: numeric, raw: token });
        continue;
      }

      const upper = token.toUpperCase();
      if (upper in REGISTER_SET) {
        operands.push({ kind: 'register', value: upper as Register, raw: token });
        continue;
      }

      const labelName = sanitizeLabel(token);
      if (labelName) {
        operands.push({ kind: 'label', name: labelName, raw: token });
        continue;
      }

      errors.push(`Строка ${lineNumber}: не удалось распознать операнд "${token}".`);
      break;
    }

    if (errors.length > 0) {
      return;
    }

    if (pendingLabel && !(pendingLabel in labels)) {
      labels[pendingLabel] = instructions.length;
      pendingLabel = null;
    }

    instructions.push({
      op: operation,
      operands,
      line: lineNumber,
      raw: withoutComment,
    });
  });

  if (pendingLabel && !(pendingLabel in labels)) {
    labels[pendingLabel] = instructions.length;
  }

  return { instructions, labels, errors, warnings };
}

function validateInstruction(instruction: IntermediateInstruction): string | null {
  const operandCount = instruction.operands.length;
  switch (instruction.op) {
    case 'HLT':
      return operandCount === 0 ? null : 'HLT не принимает операнды.';
    case 'INC':
    case 'DEC':
      if (operandCount !== 1 || instruction.operands[0].kind !== 'register') {
        return `${instruction.op} принимает ровно один регистр.`;
      }
      return null;
    case 'ADD':
    case 'SUB':
    case 'CMP':
      if (
        operandCount !== 2 ||
        instruction.operands[0].kind !== 'register' ||
        instruction.operands[1].kind !== 'register'
      ) {
        return `${instruction.op} принимает два регистра.`;
      }
      return null;
    case 'LOAD':
      if (operandCount !== 2 || instruction.operands[0].kind !== 'register') {
        return 'LOAD ожидает регистр и значение (#n или [addr]).';
      }
      if (
        instruction.operands[1].kind !== 'immediate' &&
        instruction.operands[1].kind !== 'memory'
      ) {
        return 'LOAD поддерживает только немедленные значения (#n) или память ([addr]).';
      }
      return null;
    case 'STORE':
      if (
        operandCount !== 2 ||
        instruction.operands[0].kind !== 'register' ||
        instruction.operands[1].kind !== 'memory'
      ) {
        return 'STORE ожидает регистр и адрес памяти в квадратных скобках.';
      }
      return null;
    case 'JMP':
    case 'JNZ':
    case 'JZ':
      if (operandCount !== 1 || instruction.operands[0].kind !== 'label') {
        return `${instruction.op} ожидает ровно одну метку.`;
      }
      return null;
    default:
      return 'Неизвестная инструкция.';
  }
}

function encodeInstruction(
  instruction: IntermediateInstruction,
  symbolTable: Record<string, number>,
  byteOffset: number,
  warnings: CompileWarning[],
  errors: string[],
): number[] {
  const opcode = OPCODE_MAP[instruction.op];
  switch (instruction.op) {
    case 'HLT':
      return [opcode];
    case 'INC':
    case 'DEC': {
      const register = instruction.operands[0];
      const registerIndex = REGISTER_SET[register.value];
      return [opcode, registerIndex << 4];
    }
    case 'ADD':
    case 'SUB':
    case 'CMP': {
      const left = instruction.operands[0];
      const right = instruction.operands[1];
      return [opcode, (REGISTER_SET[left.value] << 4) | REGISTER_SET[right.value]];
    }
    case 'LOAD': {
      const target = instruction.operands[0];
      const source = instruction.operands[1];
      const registerIndex = REGISTER_SET[target.value];
      if (source.kind === 'immediate') {
        if (source.value < 0 || source.value > 255) {
          errors.push(
            `Строка ${instruction.line}: значение ${source.value} вне диапазона 0..255 для LOAD.`,
          );
          return [];
        }
        return [opcode, registerIndex << 4, source.value & 0xff];
      }
      if (source.address < 0 || source.address > 255) {
        errors.push(
          `Строка ${instruction.line}: адрес ${source.address} вне диапазона 0..255 для LOAD.`,
        );
        return [];
      }
      return [opcode, (registerIndex << 4) | 0x1, source.address & 0xff];
    }
    case 'STORE': {
      const register = instruction.operands[0];
      const memory = instruction.operands[1];
      if (memory.address < 0 || memory.address > 255) {
        errors.push(
          `Строка ${instruction.line}: адрес ${memory.address} вне диапазона 0..255 для STORE.`,
        );
        return [];
      }
      return [opcode, REGISTER_SET[register.value] << 4, memory.address & 0xff];
    }
    case 'JMP':
    case 'JNZ':
    case 'JZ': {
      const labelOperand = instruction.operands[0];
      const targetAddress = symbolTable[labelOperand.name];
      if (targetAddress === undefined) {
        errors.push(`Строка ${instruction.line}: метка ${labelOperand.name} не определена.`);
        return [];
      }
      if (targetAddress < 0 || targetAddress > 255) {
        errors.push(
          `Строка ${instruction.line}: адрес перехода ${targetAddress} вне диапазона 0..255.`,
        );
        return [];
      }
      if (targetAddress === byteOffset) {
        warnings.push(
          createWarning(
            `Прыжок на текущую инструкцию (${labelOperand.name}) может привести к бесконечному циклу.`,
            instruction.line,
          ),
        );
      }
      return [opcode, targetAddress & 0xff];
    }
    default:
      errors.push(`Строка ${instruction.line}: инструкция ${instruction.op} не поддерживается.`);
      return [];
  }
}

export function compileSource(source: string): CompileResult {
  if (source.length > MAX_SOURCE_LENGTH) {
    return {
      errors: [`Исходник слишком большой (${source.length} символов). Ограничение ${MAX_SOURCE_LENGTH}.`],
      warnings: [],
    };
  }

  const parsed = parseSource(source);
  if (parsed.errors.length > 0) {
    return {
      errors: parsed.errors,
      warnings: parsed.warnings,
    };
  }

  if (parsed.instructions.length === 0) {
    return {
      errors: ['Не найдено ни одной инструкции.'],
      warnings: parsed.warnings,
    };
  }

  const addresses: number[] = [];
  let offset = 0;
  parsed.instructions.forEach((instruction) => {
    addresses.push(offset);
    offset += getInstructionSize(instruction);
  });

  const symbolTable: Record<string, number> = {};
  Object.entries(parsed.labels).forEach(([label, instructionIndex]) => {
    const instructionAddress = addresses[instructionIndex];
    symbolTable[label] = instructionAddress !== undefined ? instructionAddress : offset;
  });

  if (offset > MAX_PROGRAM_BYTES) {
    return {
      errors: [`Программа занимает ${offset} байт, что превышает предел ${MAX_PROGRAM_BYTES}.`],
      warnings: parsed.warnings,
    };
  }

  const bytes: number[] = [];
  const listing: string[] = [];
  const warnings = [...parsed.warnings];
  const errors: string[] = [];

  parsed.instructions.forEach((instruction, index) => {
    const address = addresses[index];
    const validationError = validateInstruction(instruction);
    if (validationError) {
      errors.push(`Строка ${instruction.line}: ${validationError}`);
      return;
    }

    const encoded = encodeInstruction(instruction, symbolTable, address, warnings, errors);
    if (encoded.length === 0 && errors.length > 0) {
      return;
    }

    const hexBytes = encoded.map(formatHex).join(' ');
    listing.push(`${formatHex(address)}: ${hexBytes.padEnd(11)} ; ${instruction.raw}`);
    encoded.forEach((byte) => {
      if (byte < 0 || byte > 255) {
        errors.push(
          `Недопустимое значение байта ${byte} в инструкции на строке ${instruction.line}.`,
        );
      } else {
        bytes.push(byte & 0xff);
      }
    });
  });

  if (errors.length > 0) {
    return {
      errors,
      warnings,
    };
  }

  return {
    bytes,
    listing,
    symbolTable,
    warnings,
  };
}
