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

  initialContent = input<string>('');
  language = input<SupportedLanguage>('javascript');
  currentLanguage = linkedSignal(this.language);
  lineNumbers = input<boolean>(true);
  lineWrapping = input<boolean>(false);
  tabSize = input<number>(2);
  roomId = input.required<string>();

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

  private async initializeEditor(parent: HTMLElement): Promise<void> {
    this.collaboration.initialize(this.roomId());

    const provider = this.collaboration.getProvider();
    if (!provider) {
      console.error('❌ No se pudo obtener el provider');
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

  private handleEditorUpdate(_view: EditorView): void {
    const content = this.manager.getEditorContent();
    this.contentChange.emit(content ?? '');

    const cursorPos = this.manager.getCursorPosition();
    if (cursorPos !== undefined) {
      this.cursorPositionChange.emit(cursorPos);
    }
  }

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

  ngOnDestroy(): void {
    this.collaboration.disconnect();
    this.manager.destroyEditor();
    this.editorInitialized = false;
  }
}
