import { Injectable, inject } from '@angular/core';
import type { EditorState, Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { CodeMirrorSetup } from '../code-mirror/code-mirror-setup';
import type { EditorConfig, SupportedLanguage } from '../code-mirror/config';

@Injectable({
  providedIn: 'root',
})
export class Manager {
  /**
   * Injected service responsible for configuring CodeMirror extensions, themes, and settings.
   * @private
   * @readonly
   * @type {CodeMirrorSetup}
   */
  private codeMirrorSetup: CodeMirrorSetup = inject(CodeMirrorSetup);

  /**
   * The active view instance of the CodeMirror editor.
   * It is undefined until the editor is initialized.
   * @private
   * @type {EditorView | undefined}
   */
  private editorView?: EditorView;

  /**
   * The state instance of the CodeMirror editor, defining the document, configuration, and extensions.
   * It is undefined until the editor is initialized.
   * @private
   * @type {EditorState | undefined}
   */
  private editorState?: EditorState;

  /**
   * A flag indicating whether the CodeMirror editor has been successfully initialized and mounted.
   * @private
   * @type {boolean}
   * @default false
   */
  private isInitialized: boolean = false;

  /**
   * Creates and initializes a new CodeMirror EditorView.
   *
   * This method first creates a new `EditorState` based on the provided configuration
   * and initial content. Then, it creates and mounts the `EditorView` into the parent
   * element using the new state. It also registers a required update callback.
   *
   * @param parent - The HTMLElement where the EditorView will be mounted.
   * @param config - The partial configuration object used to create the initial state.
   * @param initialContent - The starting text content of the editor.
   * @param _extensions - The list of extensions to include (ignored locally but passed for context/setup).
   * @param updateCallback - A callback function invoked when the editor's document changes.
   * @returns A Promise that resolves to the newly created `EditorView` instance.
   */
  async initializeEditor(
    parent: HTMLElement,
    config: Partial<EditorConfig>,
    initialContent: string,
    _extensions: Extension[],
    updateCallback: (view: EditorView) => void
  ): Promise<EditorView> {
    this.editorState = await this.codeMirrorSetup.createEditorState(config, initialContent);
    this.editorView = this.codeMirrorSetup.createEditorView(parent, this.editorState, updateCallback);
    this.isInitialized = true;
    return this.editorView;
  }

  /**
   * Applies a new partial configuration to the existing CodeMirror editor view.
   *
   * This method is typically used to dynamically change editor settings (like theme,
   * extensions, etc.) without losing the current document state. It delegates the
   * reconfiguration logic to the underlying setup utility.
   *
   * @param config - The partial configuration object containing the settings to update.
   * @returns A Promise that resolves when the editor view has been reconfigured.
   */
  async reconfigureEditor(config: Partial<EditorConfig>): Promise<void> {
    if (this.editorView) {
      await this.codeMirrorSetup.reconfigureEditor(this.editorView, config);
    }
  }

  /**
   * Retrieves the full text content from the current editor view.
   *
   * @returns The content of the editor as a string, or `undefined` if the editor view is not available.
   */
  getEditorContent(): string | undefined {
    if (this.editorView) {
      return this.codeMirrorSetup.getEditorContent(this.editorView);
    }
    return undefined;
  }

  /**
   * Retrieves the current primary cursor position (offset) within the editor document.
   *
   * @returns The numeric character offset of the cursor, or `undefined` if the editor view is not available.
   */
  getCursorPosition(): number | undefined {
    if (this.editorView) {
      return this.codeMirrorSetup.getCursorPosition(this.editorView);
    }
    return undefined;
  }

  /**
   * Changes the active language mode (syntax highlighting) for the editor.
   *
   * This method uses the underlying CodeMirror setup utility to update the language extension.
   * Note: The check for `isEditorInitialized` and subsequent `destroyEditor` call suggests
   * an older pattern, but the core logic delegates to changing the language on the existing view.
   *
   * @param newLanguage - The `SupportedLanguage` enum value for the desired language.
   */
  changeLanguage(newLanguage: SupportedLanguage): void {
    if (this.isEditorInitialized) {
      this.destroyEditor();
    }
    if (this.editorView) {
      this.codeMirrorSetup.changeLanguage(this.editorView, newLanguage);
    }
  }

  /**
   * Dynamically changes the tab size setting for the editor view.
   *
   * @param size - The new number of spaces to represent a tab character (e.g., 2 or 4).
   */
  changeTabSize(size: number): void {
    if (this.editorView) {
      this.codeMirrorSetup.changeTabSize(this.editorView, size);
    }
  }

  /**
   * Dynamically toggles line wrapping (soft wrap) in the editor view.
   *
   * @param wrapping - `true` to enable line wrapping, `false` to disable it.
   */
  changeLineWrapping(wrapping: boolean): void {
    if (this.editorView) {
      this.codeMirrorSetup.changeLineWrapping(this.editorView, wrapping);
    }
  }

  /**
   * Cleans up and destroys the current CodeMirror editor instance.
   *
   * This removes the editor from the DOM, clears internal references (`editorView`, `editorState`),
   * and resets the initialization flag to free up resources.
   */
  destroyEditor(): void {
    if (this.editorView) {
      this.codeMirrorSetup.destroyEditor(this.editorView);
      this.editorView = undefined;
      this.editorState = undefined;
      this.isInitialized = false;
    }
  }

  /**
   * Getter to check the initialization status of the editor component.
   *
   * @returns `true` if the editor has been successfully initialized, `false` otherwise.
   */
  get isEditorInitialized(): boolean {
    return this.isInitialized;
  }
}
