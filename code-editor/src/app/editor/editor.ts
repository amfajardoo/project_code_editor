import { Component, type ElementRef, effect, inject, input, linkedSignal, output, viewChild } from '@angular/core';
import { autocompletion } from '@codemirror/autocomplete';
import type { EditorView } from '@codemirror/view';
import { Autocomplete } from '../ai/autocomplete';
import type { SupportedLanguage } from '../code-mirror/config';
import { Collaboration } from './collaboration';
import { Manager } from './manager';

@Component({
  selector: 'app-editor',
  imports: [],
  templateUrl: './editor.html',
  styleUrl: './editor.css',
})
export class Editor {
  private autocomplete = inject(Autocomplete);
  private manager = inject(Manager);
  private collaboration = inject(Collaboration);

  editorContainer = viewChild<ElementRef<HTMLElement>>('editorContainer');

  language = input<SupportedLanguage>('javascript');
  lineNumbers = input<boolean>(true);
  lineWrapping = input<boolean>(false);
  tabSize = input<number>(2);
  roomId = input.required<string>();

  currentLanguage = linkedSignal(this.language);

  contentChange = output<string>();
  cursorPositionChange = output<number>();
  editorReady = output<EditorView>();

  private editorInitialized = false;

  constructor() {
    effect(() => {
      const element = this.editorContainer();
      if (element) {
        this.initializeEditor(element.nativeElement);
      }
    });

    effect(() => {
      const newLanguage = this.language();
      if (this.manager.isEditorInitialized) {
        this.manager.changeLanguage(newLanguage);
      }
    });

    effect(() => {
      const size = this.tabSize();
      if (this.manager.isEditorInitialized) {
        this.manager.changeTabSize(size);
      }
    });

    effect(() => {
      const wrapping = this.lineWrapping();
      if (this.manager.isEditorInitialized) {
        this.manager.changeLineWrapping(wrapping);
      }
    });
  }

  /**
   * Initializes the CodeMirror editor asynchronously, ensuring collaboration is set up
   * and synchronized before mounting the view.
   *
   * It first initializes the Y.js collaboration provider for the current room ID.
   * The actual editor view creation (`createEditor`) is triggered only after the
   * Y.js provider has synchronized its document state (`provider.synced`).
   *
   * The editor is configured with collaboration extensions, the AI autocompletion source,
   * and configuration settings (language, line numbers, etc.).
   *
   * @private
   * @param parent - The HTMLElement where the CodeMirror editor will be mounted.
   * @returns A Promise that resolves when the editor view has been created and emitted.
   */
  private async initializeEditor(parent: HTMLElement): Promise<void> {
    this.collaboration.initialize(this.roomId());

    const provider = this.collaboration.getProvider();
    if (!provider) {
      return;
    }

    const createEditor = async () => {
      if (this.editorInitialized) {
        return;
      }

      const collabExtensions = [
        ...this.collaboration.getCollaborationExtensions(),
        autocompletion({ override: [this.autocomplete.getCompletionSource()] }),
      ];

      const config = {
        language: this.language(),
        lineNumbers: this.lineNumbers(),
        lineWrapping: this.lineWrapping(),
        tabSize: this.tabSize(),
        extensions: collabExtensions,
      };

      const initialContent = this.collaboration.getCurrentContent();

      const view = await this.manager.initializeEditor(parent, config, initialContent, collabExtensions, (view) =>
        this.handleEditorUpdate(view)
      );

      this.editorInitialized = true;
      this.editorReady.emit(view);
    };

    if (provider.synced) {
      await createEditor();
    } else {
      provider.once('sync', async (isSynced: boolean) => {
        if (isSynced) {
          await createEditor();
        }
      });
    }
  }

  /**
   * Handles updates dispatched by the CodeMirror editor view.
   *
   * This method is triggered whenever the editor's state changes. It is responsible for:
   * 1. Retrieving the latest editor content and emitting a `contentChange` event.
   * 2. Retrieving the current cursor position and emitting a `cursorPositionChange` event.
   *
   * @private
   * @param _view - The CodeMirror `EditorView` instance (not used directly, but ensures callback compatibility).
   */
  private handleEditorUpdate(_view: EditorView): void {
    const content = this.manager.getEditorContent();
    this.contentChange.emit(content ?? '');

    const cursorPos = this.manager.getCursorPosition();
    if (cursorPos !== undefined) {
      this.cursorPositionChange.emit(cursorPos);
    }
  }

  /**
   * Changes the syntax highlighting language of the current CodeMirror editor.
   *
   * This updates the internal language state and calls the editor manager to
   * reconfigure the editor view with a new set of extensions, primarily updating
   * the language extension while preserving the collaboration and autocompletion settings.
   *
   * @param newLanguage - The `SupportedLanguage` enum value for the new language.
   * @returns A Promise that resolves when the editor has been reconfigured.
   */
  async changeLanguage(newLanguage: SupportedLanguage): Promise<void> {
    this.currentLanguage.set(newLanguage);

    const config = {
      language: newLanguage,
      lineNumbers: this.lineNumbers(),
      lineWrapping: this.lineWrapping(),
      tabSize: this.tabSize(),
      extensions: [
        ...this.collaboration.getCollaborationExtensions(),
        autocompletion({ override: [this.autocomplete.getCompletionSource()] }),
      ],
    };

    await this.manager.reconfigureEditor(config);
  }

  /**
   * Cleanup method called when the component is destroyed.
   *
   * It ensures a graceful shutdown by:
   * 1. Disconnecting the collaboration provider from the WebSocket.
   * 2. Destroying the CodeMirror editor instance to free up resources.
   * 3. Resetting the initialization flag.
   */
  ngOnDestroy(): void {
    this.collaboration.disconnect();
    this.manager.destroyEditor();
    this.editorInitialized = false;
  }
}
