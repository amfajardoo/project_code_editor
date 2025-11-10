import {
  Component,
  type ElementRef,
  effect,
  type InputSignal,
  inject,
  input,
  linkedSignal,
  type OutputEmitterRef,
  output,
  type Signal,
  viewChild,
  type WritableSignal,
} from '@angular/core';
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
  /**
   * Injected service providing auto-completion functionality for the editor.
   * @private
   * @readonly
   * @type {Autocomplete}
   */
  private autocomplete: Autocomplete = inject(Autocomplete);

  /**
   * Injected service managing high-level editor operations and state.
   * @private
   * @readonly
   * @type {Manager}
   */
  private manager: Manager = inject(Manager);

  /**
   * Injected service handling real-time collaboration via Yjs/WebSockets.
   * @private
   * @readonly
   * @type {Collaboration}
   */
  private collaboration: Collaboration = inject(Collaboration);

  /**
   * A ViewChild reference to the DOM element where the CodeMirror editor should be mounted.
   * @type {Signal<ElementRef<HTMLElement> | undefined>}
   */
  editorContainer: Signal<ElementRef<HTMLElement> | undefined> = viewChild<ElementRef<HTMLElement>>('editorContainer');

  /**
   * Input property defining the programming language for syntax highlighting and extensions.
   * @type {InputSignal<SupportedLanguage>}
   * @default 'javascript'
   */
  language: InputSignal<SupportedLanguage> = input<SupportedLanguage>('javascript');

  /**
   * Input property controlling the visibility of line numbers in the editor gutter.
   * @type {InputSignal<boolean>}
   * @default true
   */
  lineNumbers: InputSignal<boolean> = input<boolean>(true);

  /**
   * Input property controlling whether lines should wrap when they exceed the editor width.
   * @type {InputSignal<boolean>}
   * @default false
   */
  lineWrapping: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input property defining the number of spaces represented by a tab.
   * @type {InputSignal<number>}
   * @default 2
   */
  tabSize: InputSignal<number> = input<number>(2);

  /**
   * Required input property specifying the unique identifier of the collaborative room.
   * @type {InputSignal<string>}
   */
  roomId: InputSignal<string> = input.required<string>();

  /**
   * A signal that is linked to the `language` input, allowing the component to react to external changes.
   * @type {WritableSignal<SupportedLanguage>}
   */
  currentLanguage: WritableSignal<SupportedLanguage> = linkedSignal(this.language);

  /**
   * Output event emitter triggered when the content of the editor changes.
   * Emits the new content string.
   * @type {OutputEmitterRef<string>}
   */
  contentChange: OutputEmitterRef<string> = output<string>();

  /**
   * Output event emitter triggered when the cursor position changes.
   * Emits the new cursor position (offset).
   * @type {OutputEmitterRef<number>}
   */
  cursorPositionChange: OutputEmitterRef<number> = output<number>();

  /**
   * Output event emitter triggered once the CodeMirror `EditorView` is fully initialized and ready.
   * Emits the initialized `EditorView` instance.
   * @type {OutputEmitterRef<EditorView>}
   */
  editorReady: OutputEmitterRef<EditorView> = output<EditorView>();

  /**
   * Flag indicating whether the CodeMirror editor has completed its initial setup.
   * @private
   * @type {boolean}
   * @default false
   */
  private editorInitialized: boolean = false;

  /**
   * @constructor
   * Initializes the component and sets up reactive effects to manage the CodeMirror editor's lifecycle
   * and configuration based on signal and input changes.
   *
   * It establishes the following reactive processes:
   * 1. Editor Initialization: Watches the `editorContainer` reference and initializes the CodeMirror view when the element is available in the DOM.
   * 2. Language Change: Reacts to changes in the `language` input and updates the editor's syntax highlighting.
   * 3. Tab Size Change: Reacts to changes in the `tabSize` input and updates the editor's tab configuration.
   * 4. Line Wrapping Change: Reacts to changes in the `lineWrapping` input and updates the editor's text display mode.
   */
  constructor() {
    /**
     * Effect 1: Editor Initialization.
     * Initializes the CodeMirror editor when the 'editorContainer' DOM element reference becomes available.
     */
    effect(() => {
      const element = this.editorContainer();
      if (element) {
        this.initializeEditor(element.nativeElement);
      }
    });

    /*
     * Effect 2: Language Change Reaction.
     * Watches the 'language' input and calls the manager service to apply the new language mode
     * and syntax extensions to the editor.
     */
    effect(() => {
      const newLanguage = this.language();
      if (this.manager.isEditorInitialized) {
        this.manager.changeLanguage(newLanguage);
      }
    });

    /*
     * Effect 3: Tab Size Change Reaction.
     * Watches the 'tabSize' input and updates the editor's tab configuration.
     */
    effect(() => {
      const size = this.tabSize();
      if (this.manager.isEditorInitialized) {
        this.manager.changeTabSize(size);
      }
    });

    /*
     * Effect 4: Line Wrapping Change Reaction.
     * Watches the 'lineWrapping' input and updates the editor's line wrapping setting.
     */
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
