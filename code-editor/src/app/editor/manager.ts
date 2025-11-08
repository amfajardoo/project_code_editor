import { Injectable, inject } from '@angular/core';
import type { EditorState, Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { CodeMirrorSetup } from '../code-mirror/code-mirror-setup';
import type { EditorConfig, SupportedLanguage } from '../code-mirror/config';

@Injectable({
  providedIn: 'root',
})
export class Manager {
  private codeMirrorSetup = inject(CodeMirrorSetup);

  private editorView?: EditorView;
  private editorState?: EditorState;
  private isInitialized = false;

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

  async reconfigureEditor(config: Partial<EditorConfig>): Promise<void> {
    if (this.editorView) {
      await this.codeMirrorSetup.reconfigureEditor(this.editorView, config);
    }
  }

  getEditorContent(): string | undefined {
    if (this.editorView) {
      return this.codeMirrorSetup.getEditorContent(this.editorView);
    }
    return undefined;
  }

  getCursorPosition(): number | undefined {
    if (this.editorView) {
      return this.codeMirrorSetup.getCursorPosition(this.editorView);
    }
    return undefined;
  }

  changeLanguage(newLanguage: SupportedLanguage): void {
    if (this.editorView) {
      this.codeMirrorSetup.changeLanguage(this.editorView, newLanguage);
    }
  }

  changeTabSize(size: number): void {
    if (this.editorView) {
      this.codeMirrorSetup.changeTabSize(this.editorView, size);
    }
  }

  changeLineWrapping(wrapping: boolean): void {
    if (this.editorView) {
      this.codeMirrorSetup.changeLineWrapping(this.editorView, wrapping);
    }
  }

  destroyEditor(): void {
    if (this.editorView) {
      this.codeMirrorSetup.destroyEditor(this.editorView);
      this.editorView = undefined;
      this.editorState = undefined;
      this.isInitialized = false;
    }
  }

  get isEditorInitialized(): boolean {
    return this.isInitialized;
  }
}
