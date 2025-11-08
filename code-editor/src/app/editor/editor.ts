import {
  Component,
  type ElementRef,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  autocompletion,
  type Completion,
  type CompletionContext,
  type CompletionSource,
} from '@codemirror/autocomplete';
import type { EditorState, Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { yCollab } from 'y-codemirror.next';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';
import { CodeMirrorSetup } from '../code-mirror/code-mirror-setup';
import type { EditorConfig, SupportedLanguage } from '../code-mirror/config';

const YJS_WEBSOCKET_URL = 'ws://localhost:1234'; // Puerto del servidor yjs-server.ts
const GEMINI_PROXY_URL = 'http://localhost:3000/api/complete'; // Puerto y prefijo de NestJS

@Component({
  selector: 'app-editor',
  imports: [],
  templateUrl: './editor.html',
  styleUrl: './editor.css',
})
export class Editor {
  codeMirrorSetup = inject(CodeMirrorSetup);

  editorContainer = viewChild<ElementRef<HTMLElement>>('editorContainer');

  initialContent = input<string>('');
  language = input<SupportedLanguage>('javascript');
  currentLanguage = linkedSignal(this.language);
  lineNumbers = input<boolean>(true);
  lineWrapping = input<boolean>(false);
  tabSize = input<number>(2);

  roomId = input<string>('default-session');
  #ydoc = new Y.Doc();
  #provider?: WebsocketProvider;
  #editorContent = signal('');

  contentChange = output<string>();
  cursorPositionChange = output<number>();
  editorReady = output<EditorView>();

  #editorView?: EditorView;
  #editorState?: EditorState;
  #isInitialized = false;

  #completionSource: CompletionSource = (context: CompletionContext) => {
    if (!context.explicit && context.matchBefore(/\w+$/) === null) {
      return Promise.resolve(null);
    }

    const { state, pos } = context;
    const textBeforeCursor = state.doc.sliceString(0, pos);

    return this.fetchGeminiSuggestion(textBeforeCursor, pos);
  };

  private async fetchGeminiSuggestion(
    codeContext: string,
    position: number
  ): Promise<{ from: number; options: Completion[] } | null> {
    try {
      const response = await fetch(GEMINI_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeContext }),
      });

      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const suggestionText: string = data.suggestion || '';

      if (!suggestionText) return null;

      const suggestion: Completion = {
        label: suggestionText.length > 50 ? `${suggestionText.substring(0, 50)}...` : suggestionText,
        detail: 'Gemini AI Completion',
        info: 'Suggestion provided by Gemini AI',
        apply: suggestionText,
        type: 'keyword',
      };

      return {
        from: position,
        options: [suggestion],
      };
    } catch (error) {
      console.error('Error trying to fetch Gemini:', error);
      return null;
    }
  }

  constructor() {
    effect(() => {
      const element = this.editorContainer();
      if (element && !this.#isInitialized) {
        this.initializeEditor(element.nativeElement);
      }
    });

    effect(() => {
      const newLanguage = this.language();
      if (this.#isInitialized && this.#editorView) {
        this.codeMirrorSetup.changeLanguage(this.#editorView, newLanguage);
      }
    });

    effect(() => {
      const size = this.tabSize();
      if (this.#isInitialized && this.#editorView) {
        this.codeMirrorSetup.changeTabSize(this.#editorView, size);
      }
    });

    effect(() => {
      const wrapping = this.lineWrapping();
      if (this.#isInitialized && this.#editorView) {
        this.codeMirrorSetup.changeLineWrapping(this.#editorView, wrapping);
      }
    });

    effect(() => {
      this.#editorContent();
      if (this.#isInitialized && this.#editorView) {
        const content = this.codeMirrorSetup.getEditorContent(this.#editorView);
        this.contentChange.emit(content);
      }
    });
  }

  private async initializeEditor(parent: HTMLElement): Promise<void> {
    const ytext = this.#ydoc.getText('codemirror-document');

    this.#provider = new WebsocketProvider(YJS_WEBSOCKET_URL, this.roomId(), this.#ydoc);

    ytext.observe(() => {
      this.#editorContent.set(ytext.toString());
    });

    const collabExtensions: Extension[] = [
      yCollab(ytext, this.#provider.awareness),
      autocompletion({ override: [this.#completionSource] }),
    ];

    const config: Partial<EditorConfig> = {
      language: this.language(),
      lineNumbers: this.lineNumbers(),
      lineWrapping: this.lineWrapping(),
      tabSize: this.tabSize(),
      extensions: collabExtensions,
    };

    this.#editorState = await this.codeMirrorSetup.createEditorState(config, ytext.toString());

    this.#editorView = this.codeMirrorSetup.createEditorView(parent, this.#editorState, (view) =>
      this.handleEditorUpdate(view)
    );

    this.#isInitialized = true;

    this.editorReady.emit(this.#editorView);
  }

  private handleEditorUpdate(view: EditorView): void {
    const cursorPos = this.codeMirrorSetup.getCursorPosition(view);

    this.cursorPositionChange.emit(cursorPos);
  }

  private destroyEditor(): void {
    if (this.#provider) {
      this.#provider.disconnect();
      this.#provider = undefined;
    }
    if (this.#editorView) {
      this.codeMirrorSetup.destroyEditor(this.#editorView);
      this.#editorView = undefined;
      this.#editorState = undefined;
      this.#isInitialized = false;
    }
  }

  async changeLanguage(newLanguage: SupportedLanguage): Promise<void> {
    if (this.#editorView && this.#provider) {
      this.currentLanguage.set(newLanguage);

      const config: Partial<EditorConfig> = {
        language: newLanguage,
        lineNumbers: this.lineNumbers(),
        lineWrapping: this.lineWrapping(),
        tabSize: this.tabSize(),
        extensions: [
          yCollab(this.#ydoc.getText('codemirror-document'), this.#provider.awareness),
          autocompletion({ override: [this.#completionSource] }),
        ],
      };
      await this.codeMirrorSetup.reconfigureEditor(this.#editorView, config);
    }
  }

  ngOnDestroy(): void {
    this.destroyEditor();
  }
}
