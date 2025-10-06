import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ArticleEditor } from '../ArticleEditor';

interface HeadingData {
  readonly text: string;
  readonly level: number;
  readonly id?: string;
}

interface MockEditorOptions {
  readonly content?: unknown;
  readonly editorProps?: {
    readonly handlePaste?: (view: MockView, event: ClipboardEvent) => boolean | void;
    readonly handleDrop?: (view: MockView, event: DragEvent) => boolean | void;
    readonly handleKeyDown?: (view: MockView, event: KeyboardEvent) => boolean | void;
    readonly handleTextInput?: (
      view: MockView,
      from: number,
      to: number,
      text: string,
    ) => boolean | void;
    readonly attributes?: Record<string, string>;
  };
  readonly onCreate?: (params: { editor: MockEditor }) => void;
  readonly onUpdate?: (params: { editor: MockEditor }) => void;
  readonly onSelectionUpdate?: (params: { editor: MockEditor }) => void;
  readonly autofocus?: boolean;
}

class MockNode {
  public type: { name: string };
  public attrs: Record<string, unknown>;
  public textContent: string;
  public nodeSize: number;

  constructor(name: string, attrs: Record<string, unknown>, textContent: string, nodeSize = 1) {
    this.type = { name };
    this.attrs = attrs;
    this.textContent = textContent;
    this.nodeSize = nodeSize;
  }
}

class MockDoc {
  private nodes: MockNode[] = [];

  setNodes(nodes: MockNode[]) {
    this.nodes = nodes;
  }

  setFromJSON(json: any) {
    if (!json || !Array.isArray(json.content)) {
      this.nodes = [];
      return;
    }
    this.nodes = json.content.map(
      (item: any, index: number) =>
        new MockNode(item?.type ?? `node-${index}`, item?.attrs ?? {}, item?.content?.[0]?.text ?? ''),
    );
  }

  addNode(node: MockNode) {
    this.nodes.push(node);
  }

  updateNode(index: number, attrs: Record<string, unknown>) {
    const node = this.nodes[index];
    if (node) {
      node.attrs = { ...node.attrs, ...attrs };
    }
  }

  deleteRange(from: number, to: number) {
    this.nodes.splice(from, Math.max(0, to - from));
  }

  textBetween() {
    return '';
  }

  descendants(callback: (node: MockNode, pos: number) => boolean | void) {
    for (let index = 0; index < this.nodes.length; index += 1) {
      const result = callback(this.nodes[index], index);
      if (result === false) {
        return false;
      }
    }
    return true;
  }
}

class MockTransaction {
  constructor(private readonly doc: MockDoc) {}

  setNodeMarkup(pos: number, _type: unknown, attrs: Record<string, unknown>) {
    this.doc.updateNode(pos, attrs);
    return this;
  }

  delete(from: number, to: number) {
    this.doc.deleteRange(from, to);
    return this;
  }

  deleteRange(from: number, to: number) {
    this.doc.deleteRange(from, to);
    return this;
  }

  setMeta(_key: string, _value: unknown) {
    return this;
  }

  apply() {
    return true;
  }
}

class MockView {
  constructor(private readonly doc: MockDoc) {}

  get state() {
    return { doc: this.doc };
  }

  dispatch(tr: MockTransaction) {
    tr.apply();
  }
}

class MockCommandChain {
  private readonly actions: Array<() => void> = [];

  constructor(private readonly editor: MockEditor) {}

  focus() {
    return this;
  }

  setImage(attrs: Record<string, unknown>) {
    this.actions.push(() => this.editor.insertImage(attrs));
    return this;
  }

  toggleHeading(params: { level: number }) {
    this.actions.push(() => this.editor.toggleHeading(params.level));
    return this;
  }

  toggleBulletList() {
    return this;
  }

  toggleOrderedList() {
    return this;
  }

  toggleTaskList() {
    return this;
  }

  toggleBlockquote() {
    return this;
  }

  toggleCodeBlock() {
    return this;
  }

  setHorizontalRule() {
    return this;
  }

  insertTable(_config: unknown) {
    return this;
  }

  run() {
    this.actions.forEach((action) => action());
    return true;
  }
}

let mockContentHtml = '<p></p>';
let mockContentJson: unknown = { type: 'doc', content: [] };
let lastEditor: MockEditor | null = null;
let editorOptions: MockEditorOptions | null = null;

class MockEditor {
  public readonly options: MockEditorOptions;
  public readonly doc: MockDoc;
  public readonly view: MockView;
  private html: string;
  private json: unknown;

  constructor(options: MockEditorOptions) {
    this.options = options;
    this.doc = new MockDoc();
    this.view = new MockView(this.doc);
    this.html = mockContentHtml;
    this.json = mockContentJson;
    if (options.content) {
      this.setContent(options.content);
    }
    options.onCreate?.({ editor: this });
  }

  get state() {
    return { doc: this.doc, tr: new MockTransaction(this.doc) };
  }

  chain() {
    return new MockCommandChain(this);
  }

  commands = {
    setContent: (content: unknown, emit = true) => {
      this.setContent(content);
      if (emit) {
        this.options.onUpdate?.({ editor: this });
      }
      return true;
    },
    command: (
      fn: (params: {
        tr: MockTransaction;
        state: { doc: MockDoc };
        dispatch: (tr: MockTransaction) => void;
      }) => boolean | void,
    ) => {
      const tr = new MockTransaction(this.doc);
      const result = fn({ tr, state: this.state, dispatch: this.view.dispatch.bind(this.view) });
      return result ?? true;
    },
  };

  isActive = () => false;

  getHTML = () => this.html;

  getJSON = () => this.json;

  setEditable = (_editable: boolean) => undefined;

  setContent(content: unknown) {
    this.json = content;
    if (content && typeof content === 'object') {
      this.doc.setFromJSON(content);
    } else {
      this.doc.setNodes([]);
    }
  }

  insertImage(attrs: Record<string, unknown>) {
    this.doc.addNode(new MockNode('image', attrs, ''));
  }

  toggleHeading(level: number) {
    this.doc.addNode(new MockNode('heading', { level }, `Heading ${level}`));
    this.options.onSelectionUpdate?.({ editor: this });
  }

  setHeadings(headings: HeadingData[], html: string) {
    this.doc.setNodes(
      headings.map(
        (heading) => new MockNode('heading', { level: heading.level, id: heading.id ?? null }, heading.text),
      ),
    );
    this.html = html;
    this.json = {
      type: 'doc',
      content: headings.map((heading) => ({
        type: 'heading',
        attrs: { level: heading.level, id: heading.id ?? null },
        content: [{ type: 'text', text: heading.text }],
      })),
    };
    this.options.onUpdate?.({ editor: this });
    this.options.onSelectionUpdate?.({ editor: this });
  }
}

vi.mock('../../../shared/model/auth', async () => {
  const actual = await vi.importActual<typeof import('../../../shared/model/auth')>(
    '../../../shared/model/auth',
  );
  return {
    ...actual,
    useAuth: () => ({
      authHeader: 'Bearer test-token',
      isAdmin: true,
      login: vi.fn(),
      logout: vi.fn(),
    }),
  };
});

vi.mock('@tiptap/react', () => {
  return {
    EditorContent: ({ editor }: { editor: MockEditor | null }) => (
      <div data-testid="editor-content" data-has-editor={Boolean(editor)} />
    ),
    useEditor: (options?: MockEditorOptions) => {
      const instance = new MockEditor(options ?? {});
      lastEditor = instance;
      editorOptions = options ?? null;
      return instance;
    },
  };
});

beforeEach(() => {
  const observe = vi.fn();
  const unobserve = vi.fn();
  const disconnect = vi.fn();
  class MockIntersectionObserver {
    constructor(public callback: IntersectionObserverCallback) {}
    observe = observe;
    unobserve = unobserve;
    disconnect = disconnect;
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  });
  if (!('createObjectURL' in URL)) {
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      configurable: true,
      value: vi.fn(),
    });
  }
  if (!('revokeObjectURL' in URL)) {
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      configurable: true,
      value: vi.fn(),
    });
  }
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:preview');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  (global.fetch as unknown as ReturnType<typeof vi.fn>)?.mockRestore?.();
  (URL.createObjectURL as unknown as ReturnType<typeof vi.fn>)?.mockRestore?.();
  (URL.revokeObjectURL as unknown as ReturnType<typeof vi.fn>)?.mockRestore?.();
  vi.useRealTimers();
  lastEditor = null;
  editorOptions = null;
  mockContentHtml = '<p></p>';
  mockContentJson = { type: 'doc', content: [] };
});

function renderEditor() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/articles/new']}>
        <Routes>
          <Route path="/admin/articles/new" element={<ArticleEditor />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { user, ...utils };
}

function updateHeadings(headings: HeadingData[], html: string) {
  if (!lastEditor || !editorOptions) {
    throw new Error('Editor mock not initialised');
  }
  lastEditor.setHeadings(headings, html);
}

function triggerPasteWithFiles(files: File[]) {
  if (!lastEditor || !editorOptions) {
    throw new Error('Editor mock not initialised');
  }
  const handlePaste = editorOptions.editorProps?.handlePaste;
  if (!handlePaste) {
    throw new Error('Paste handler not registered');
  }
  const preventDefault = vi.fn();
  handlePaste(lastEditor.view as unknown as MockView, {
    clipboardData: { files },
    preventDefault,
  } as unknown as ClipboardEvent);
}

describe('ArticleEditor', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/uploads/images')) {
        return new Response(JSON.stringify({ url: 'https://cdn.example.com/image.png' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.endsWith('/articles')) {
        return new Response(
          JSON.stringify({
            id: 'new-id',
            title: 'Hello world',
            slug: 'hello-world',
            status: 'DRAFT',
            contentHtml: '<p>Hello world</p>',
            contentJson: {
              type: 'doc',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }],
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response('OK', { status: 200 });
    });
  });

  afterEach(() => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockRestore?.();
  });

  it('generates slug from title and updates TOC when heading is added', async () => {
    const { user } = renderEditor();

    const titleField = screen.getByLabelText('Title');
    await user.type(titleField, 'Пример статьи');

    const slugField = screen.getByLabelText('Slug');
    expect(slugField).toHaveValue('primer-stati');

    updateHeadings([{ text: 'Заголовок', level: 1 }], '<h1>Заголовок</h1>');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Заголовок' })).toBeVisible();
    });
  });

  it('uploads image on paste and replaces placeholder with response url', async () => {
    renderEditor();
    const file = new File(['binary'], 'example.png', { type: 'image/png' });
    triggerPasteWithFiles([file]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/uploads/images'),
        expect.anything(),
      );
    });

    expect(await screen.findByText('Загрузки')).toBeVisible();
    expect(await screen.findByText('Готово')).toBeVisible();
  });

  it('autosaves changes after debounce interval', async () => {
    vi.useFakeTimers();
    const { user } = renderEditor();

    await user.type(await screen.findByLabelText('Title'), 'Автосейв тест');

    vi.advanceTimersByTime(1600);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/articles'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });
});
