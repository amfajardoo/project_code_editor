import { Injectable } from '@angular/core';
import { Compartment, EditorState, type Extension, StateEffect } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { basicSetupExtensions, type EditorConfig, lineWrappingConfig, tabSizeConfig } from './config';
import { getLanguageExtension } from './language.config';

@Injectable({
  providedIn: 'root',
})
export class CodeMirrorSetup {
  #languageCompartment = new Compartment();
  #tabSizeCompartment = new Compartment();
  #lineWrappingCompartment = new Compartment();
  #extensionCompartment = new Compartment();

  /**
   * Creates and returns a new EditorState configured with extensions built from the given configuration
   * and initialized with the provided document text.
   *
   * This function asynchronously constructs the editor extensions by delegating to buildExtensions(config),
   * then calls EditorState.create({ doc, extensions }) to produce the EditorState instance.
   *
   * @param config - Partial EditorConfig used to build the editor extensions. Passed to buildExtensions.
   * @param initialDoc - Optional initial document content to populate the editor. Defaults to an empty string.
   * @returns A Promise that resolves to the created EditorState configured with the built extensions and initial document.
   * @throws Propagates any errors thrown by buildExtensions or EditorState.create.
   * @remarks The resulting editor behavior depends on the order and contents of the extensions returned by buildExtensions.
   */
  async createEditorState(config: Partial<EditorConfig>, initialDoc: string = ''): Promise<EditorState> {
    const extensions = await this.buildExtensions(config);

    return EditorState.create({
      doc: initialDoc,
      extensions,
    });
  }

  /**
   * Creates and returns a new EditorView mounted into the provided parent element.
   *
   * The editor is initialized with the given EditorState. If an onUpdate callback is provided,
   * an update listener is appended to the view's configuration after construction; the listener
   * calls the provided callback with the created EditorView whenever the document changes
   * (i.e., when update.docChanged is true).
   *
   * The listener is added by dispatching StateEffect.appendConfig with the listener configuration.
   * This means the registration happens as a side effect immediately after the view is created.
   *
   * @param parent - The HTMLElement to mount the EditorView into.
   * @param state - The initial EditorState for the editor.
   * @param onUpdate - Optional callback invoked with the EditorView when the document changes.
   * @returns The created EditorView instance.
   */
  createEditorView(parent: HTMLElement, state: EditorState, onUpdate?: (view: EditorView) => void): EditorView {
    const view = new EditorView({
      state,
      parent,
    });

    if (onUpdate) {
      const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onUpdate(view);
        }
      });

      view.dispatch({
        effects: StateEffect.appendConfig.of(updateListener),
      });
    }

    return view;
  }

  /**
   * Builds an array of CodeMirror extensions based on the provided configuration.
   *
   * @param config - Partial configuration object for the editor
   * @param config.tabSize - The size of tab indentation
   * @param config.lineWrapping - Whether to enable line wrapping
   *
   * @returns Promise that resolves to an array of CodeMirror extensions
   *
   * @remarks
   * The method combines basic setup extensions with language-specific extensions
   * and configuration-based extensions for read-only state, tab size, and line wrapping.
   * Each extension is added to a specific compartment to allow dynamic updates.
   */
  private async buildExtensions(config: Partial<EditorConfig>): Promise<Extension[]> {
    const extensions: Extension[] = [];

    extensions.push(basicSetupExtensions());
    const languageExtension = await this.getLanguageExtensionFromConfig(config);
    extensions.push(this.#languageCompartment.of(languageExtension || []));
    extensions.push(this.#tabSizeCompartment.of(config.tabSize ? tabSizeConfig(config.tabSize) : []));
    extensions.push(this.#lineWrappingCompartment.of(config.lineWrapping ? lineWrappingConfig() : []));
    extensions.push(this.#extensionCompartment.of(config.extensions || []));

    return extensions;
  }

  /**
   * Retrieves the appropriate language extension based on the editor configuration.
   * Attempts to determine the language from the explicit language setting.
   * Falls back to JavaScript if no language can be determined.
   *
   * @param config - The partial editor configuration object
   * @param config.language - Optional explicit language setting
   * @returns Promise resolving to the determined language extension, or null if none found
   *
   * @example
   * const extension = await getLanguageExtensionFromConfig(config);
   */
  private async getLanguageExtensionFromConfig(config: Partial<EditorConfig>): Promise<Extension | null> {
    let languageExtension: Extension | null = null;

    if (!languageExtension && config.language) {
      languageExtension = await getLanguageExtension(config.language);
    }

    if (!languageExtension) {
      console.warn('No language found, falling back to JavaScript');
      languageExtension = await getLanguageExtension('javascript');
    }

    return languageExtension;
  }

  /**
   * Changes the programming language syntax highlighting in the editor.
   * @param view - The CodeMirror editor view instance to update
   * @param language - The programming language identifier string
   * @returns A promise that resolves when the language change is complete
   * @throws {Error} If the language extension cannot be loaded
   */
  async changeLanguage(view: EditorView, language: string): Promise<void> {
    const languageExtension = await getLanguageExtension(language);

    if (languageExtension) {
      view.dispatch({
        effects: this.#languageCompartment.reconfigure(languageExtension),
      });
    }
  }

  /**
   * Update the tab size configuration for a CodeMirror editor.
   *
   * Dispatches an effect on the provided EditorView which reconfigures the tabSize compartment
   * using the configuration produced by `tabSizeConfig(size)`.
   *
   * @param view - The EditorView instance whose tab size configuration will be updated.
   * @param size - The desired tab size (number of spaces per tab). This value is forwarded to `tabSizeConfig`.
   *
   * @remarks
   * This method triggers a state transaction on the view; it does not directly mutate the view object.
   * Any validation or normalization of `size` is handled by `tabSizeConfig`.
   */
  changeTabSize(view: EditorView, size: number): void {
    view.dispatch({
      effects: this.#tabSizeCompartment.reconfigure(tabSizeConfig(size)),
    });
  }

  /**
   * Toggles line wrapping in the provided CodeMirror editor view.
   *
   * @param view - The CodeMirror `EditorView` instance to update.
   * @param enabled - If `true`, enables line wrapping; if `false`, disables it.
   */
  changeLineWrapping(view: EditorView, enabled: boolean): void {
    view.dispatch({
      effects: this.#lineWrappingCompartment.reconfigure(enabled ? lineWrappingConfig() : []),
    });
  }

  /**
   * Reconfigures the provided code editor view with the specified configuration options.
   *
   * This method updates the editor's language, read-only state, tab size, and line wrapping
   * according to the properties defined in the `config` object. Each property is updated only
   * if it is explicitly provided in the configuration.
   *
   * @param view - The instance of the editor view to be reconfigured.
   * @param config - A partial configuration object containing editor options to update.
   *   - `language` (optional): The programming language mode to set for the editor.
   *   - `readOnly` (optional): Whether the editor should be set to read-only mode.
   *   - `tabSize` (optional): The number of spaces to use for a tab character.
   *   - `lineWrapping` (optional): Whether lines should wrap in the editor.
   * @returns A promise that resolves when all asynchronous reconfiguration steps are complete.
   */
  async reconfigureEditor(view: EditorView, config: Partial<EditorConfig>): Promise<void> {
    if (config.language !== undefined) {
      await this.changeLanguage(view, config.language);
    }

    if (config.tabSize !== undefined) {
      this.changeTabSize(view, config.tabSize);
    }

    if (config.lineWrapping !== undefined) {
      this.changeLineWrapping(view, config.lineWrapping);
    }
  }

  /**
   * Retrieves the current content of the editor as a string.
   *
   * @param view - The instance of the `EditorView` from which to extract the content.
   * @returns The textual content of the editor.
   */
  getEditorContent(view: EditorView): string {
    return view.state.doc.toString();
  }

  /**
   * Sets the content of the provided CodeMirror editor view.
   *
   * This method replaces the entire document content with the given string.
   *
   * @param view - The CodeMirror `EditorView` instance whose content will be updated.
   * @param content - The new content to set in the editor.
   */
  setEditorContent(view: EditorView, content: string): void {
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: content,
      },
    });
  }

  /**
   * Returns the current cursor position within the editor view.
   *
   * @param view - The EditorView instance representing the code editor.
   * @returns The zero-based index of the cursor position in the document.
   */
  getCursorPosition(view: EditorView): number {
    return view.state.selection.main.head;
  }

  /**
   * Retrieves the textual context surrounding the current cursor position in the editor.
   *
   * @param view - The instance of the editor view.
   * @param contextLength - The number of characters to include before and after the cursor position. Defaults to 100.
   * @returns An object containing:
   * - `before`: The text preceding the cursor, up to `contextLength` characters.
   * - `after`: The text following the cursor, up to `contextLength` characters.
   * - `line`: The full text of the line where the cursor is located.
   */
  getCursorContext(
    view: EditorView,
    contextLength: number = 100
  ): {
    before: string;
    after: string;
    line: string;
  } {
    const pos = this.getCursorPosition(view);
    const doc = view.state.doc;
    const line = doc.lineAt(pos);

    const beforeStart = Math.max(0, pos - contextLength);
    const afterEnd = Math.min(doc.length, pos + contextLength);

    return {
      before: doc.sliceString(beforeStart, pos),
      after: doc.sliceString(pos, afterEnd),
      line: line.text,
    };
  }

  /**
   * Destroys the provided CodeMirror editor view instance, releasing all resources and event listeners.
   *
   * @param view - The `EditorView` instance to be destroyed.
   */
  destroyEditor(view: EditorView): void {
    view.destroy();
  }
}
