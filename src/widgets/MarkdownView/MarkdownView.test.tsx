import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { MarkdownView } from './MarkdownView';

describe('MarkdownView', () => {
  /**
   * Проверяем, что таблицы и код рендерятся, а потенциальный XSS блокируется.
   */
  test('renders markdown tables and code blocks safely', () => {
    const markdown = `| A | B |\n| - | - |\n| 1 | 2 |\n\n\`\`\`ts\nconsole.log('secure');\n\`\`\`\n\n<div onclick="alert('xss')">Не должно отрендериться</div>`;

    const { container } = render(<MarkdownView content={markdown} />);

    expect(screen.getByRole('table')).toBeVisible();
    const codeElement = screen.getByText(/console\.log/);
    expect(codeElement).toBeVisible();
    expect(codeElement.closest('pre')).toHaveAttribute('data-language', 'TS');
    expect(container.querySelector('[onclick]')).toBeNull();
  });

  test('renders CodePlayground blocks inside markdown', async () => {
    const markdown = `Вводный текст\n\n<CodePlayground code={\`export default function Hello() {\n  return <div>Привет!</div>;\n}\`} />\n\nЗавершающий абзац.`;

    render(<MarkdownView content={markdown} />);

    expect(screen.getByText('Вводный текст')).toBeVisible();
    await waitFor(() => {
      expect(screen.getByText('Привет!')).toBeVisible();
    });
    expect(screen.getByText('Завершающий абзац.')).toBeVisible();
  });
});
