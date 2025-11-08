import { Component, type ElementRef, effect, inject, input, linkedSignal, output, viewChild } from '@angular/core';
import type { EditorState } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { CodeMirrorSetup } from '../code-mirror/code-mirror-setup';
import type { EditorConfig, SupportedLanguage } from '../code-mirror/config';

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

  contentChange = output<string>();
  cursorPositionChange = output<number>();
  editorReady = output<EditorView>();

  #editorView?: EditorView;
  #editorState?: EditorState;
  #isInitialized = false;

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
  }

  /**
   * Initializes the code editor within the specified parent HTML element.
   *
   * This method sets up the editor configuration, creates the editor state and view,
   * and emits an event when the editor is ready. It supports asynchronous initialization.
   *
   * @param parent - The HTML element that will contain the editor instance.
   * @returns A promise that resolves when the editor has been fully initialized.
   */
  private async initializeEditor(parent: HTMLElement): Promise<void> {
    const config: Partial<EditorConfig> = {
      language: this.language(),
      lineNumbers: this.lineNumbers(),
      lineWrapping: this.lineWrapping(),
      tabSize: this.tabSize(),
    };

    this.#editorState = await this.codeMirrorSetup.createEditorState(config, this.initialContent());

    this.#editorView = this.codeMirrorSetup.createEditorView(parent, this.#editorState, (view) =>
      this.handleEditorUpdate(view)
    );

    this.#isInitialized = true;

    this.editorReady.emit(this.#editorView);
  }

  /**
   * Handles updates from the editor view by retrieving the current content and cursor position.
   * Emits the updated content and cursor position through the respective output events.
   *
   * @param view - The current instance of the editor view.
   */
  private handleEditorUpdate(view: EditorView): void {
    const content = this.codeMirrorSetup.getEditorContent(view);
    const cursorPos = this.codeMirrorSetup.getCursorPosition(view);

    this.contentChange.emit(content);
    this.cursorPositionChange.emit(cursorPos);
  }

  /**
   * Destroys the current editor instance and cleans up associated resources.
   *
   * This method calls the `destroyEditor` function from `codeMirrorSetup` to properly dispose of the editor view.
   * It then resets the `#editorView`, `editorState`, and `#isInitialized` properties to ensure the editor is fully uninitialized.
   *
   * @private
   */
  private destroyEditor(): void {
    if (this.#editorView) {
      this.codeMirrorSetup.destroyEditor(this.#editorView);
      this.#editorView = undefined;
      this.#editorState = undefined;
      this.#isInitialized = false;
    }
  }

  /**
   * Changes the language mode of the editor.
   *
   * Updates the current language setting and reconfigures the editor with the new language,
   * preserving other editor configurations such as read-only state, line numbers, line wrapping, and tab size.
   *
   * @param newLanguage - The new language to set for the editor.
   * @returns A promise that resolves when the editor has been reconfigured.
   */
  async changeLanguage(newLanguage: SupportedLanguage): Promise<void> {
    if (this.#editorView) {
      this.currentLanguage.set(newLanguage);
      const config: Partial<EditorConfig> = {
        language: newLanguage,
        lineNumbers: this.lineNumbers(),
        lineWrapping: this.lineWrapping(),
        tabSize: this.tabSize(),
      };
      await this.codeMirrorSetup.reconfigureEditor(this.#editorView, config);
    }
  }

  ngOnDestroy(): void {
    this.destroyEditor();
  }
}
