import { render, screen } from '@testing-library/react';
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
    expect(screen.getByRole('button', { name: 'Скопировать' })).toBeVisible();
    const lineButtons = screen.getAllByRole('button', { name: /Скопировать строку/ });
    expect(lineButtons).toHaveLength(1);
    expect(lineButtons[0]).toHaveTextContent('1');
    expect(container.querySelector('[onclick]')).toBeNull();
  });

  test('wraps standalone code tags into code blocks', () => {
    const markdown = `<code class="language-bash">echo "hello"\nls -la</code>`;

    render(<MarkdownView content={markdown} />);

    const codeElement = screen.getByText('ls -la');
    const preElement = codeElement.closest('pre');

    expect(preElement).not.toBeNull();
    expect(preElement).toHaveAttribute('data-language', 'BASH');
    expect(screen.getByRole('button', { name: 'Скопировать' })).toBeVisible();
    const lineButtons = screen.getAllByRole('button', { name: /Скопировать строку/ });
    expect(lineButtons).toHaveLength(2);
  });
});
