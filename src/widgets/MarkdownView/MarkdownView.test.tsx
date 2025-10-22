import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MarkdownView } from './MarkdownView';

const writeTextMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('navigator', { clipboard: { writeText: writeTextMock } });
});

afterEach(() => {
  writeTextMock.mockReset();
  vi.unstubAllGlobals();
});

describe('MarkdownView code fences', () => {
  it('renders fenced java block with badge and copy button', async () => {
    const markdown = [
      '```java',
      'class A {',
      '  public static void main(String[] args) {',
      '    System.out.println("Hi");',
      '  }',
      '}',
      '```',
    ].join('\n');

    render(<MarkdownView content={markdown} />);

    const languageBadge = await screen.findByText('Java');
    expect(languageBadge).toBeVisible();

    const copyButton = await screen.findByRole('button', { name: /copy code/i });
    await userEvent.click(copyButton);

    const expected = [
      'class A {',
      '  public static void main(String[] args) {',
      '    System.out.println("Hi");',
      '  }',
      '}',
    ].join('\n');

    expect(writeTextMock).toHaveBeenCalledWith(expected);
  });

  it('does not render copy buttons for inline code', () => {
    render(<MarkdownView content={'Inline `code` example'} />);

    expect(screen.queryByRole('button', { name: /copy code/i })).not.toBeInTheDocument();
  });

  it('falls back to plain text for unknown languages', async () => {
    const markdown = ['```something', 'value', '```'].join('\n');

    render(<MarkdownView content={markdown} />);

    const badge = await screen.findByText('Plain text');
    expect(badge).toBeVisible();
  });
});
