import { describe, expect, it } from 'vitest';
import {
  MAX_SOURCE_LENGTH,
  compileSource,
  type CompileFailure,
  type CompileSuccess,
} from './compiler';

function expectSuccess(result: ReturnType<typeof compileSource>): asserts result is CompileSuccess {
  expect('bytes' in result, 'ожидался успешный результат компиляции').toBe(true);
}

function expectFailure(result: ReturnType<typeof compileSource>): asserts result is CompileFailure {
  expect('errors' in result && !('bytes' in result), 'ожидалась ошибка компиляции').toBe(true);
}

describe('compileSource', () => {
  it('компилирует простую программу в машинный код', () => {
    const result = compileSource(
      ['LOAD A, #1', 'LOAD B, #2', 'ADD A, B', 'STORE A, [0x10]', 'HLT'].join('\n')
    );
    expectSuccess(result);
    expect(result.bytes).toEqual([
      0x01, 0x00, 0x01, // LOAD A, #1
      0x01, 0x10, 0x02, // LOAD B, #2
      0x03, 0x01, // ADD A, B
      0x02, 0x00, 0x10, // STORE A, [0x10]
      0xff,
    ]);
    expect(result.listing.length).toBeGreaterThan(0);
  });

  it('возвращает ошибки при неизвестной инструкции', () => {
    const result = compileSource('FOO A, #1\nHLT');
    expectFailure(result);
    expect(result.errors[0]).toContain('неизвестная инструкция');
  });

  it('предупреждает о прыжке на текущую инструкцию', () => {
    const result = compileSource('LOOP: JMP LOOP\nHLT');
    expectSuccess(result);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining('Прыжок на текущую инструкцию') }),
      ])
    );
  });

  it('ограничивает размер исходника', () => {
    const hugeSource = 'HLT\n'.repeat(MAX_SOURCE_LENGTH);
    const result = compileSource(hugeSource);
    expectFailure(result);
    expect(result.errors[0]).toContain('Исходник слишком большой');
  });

  it('валидирует диапазон немедленных значений', () => {
    const result = compileSource('LOAD A, #300\nHLT');
    expectFailure(result);
    expect(result.errors[0]).toContain('вне диапазона');
  });
});
