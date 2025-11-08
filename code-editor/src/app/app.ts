import { Component, computed, signal } from '@angular/core';
import type { EditorView } from '@codemirror/view';
import type { SupportedLanguage } from './code-mirror/config';
import { Editor } from './editor/editor';

@Component({
  selector: 'app-root',
  imports: [Editor],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  initialCode = signal('');
  currentLanguage = signal('typescript');
  cursorPosition = signal(0);
  content = signal('');
  contentLength = computed(() => this.content().length);
  lineCount = computed(() => this.content().split('\n').length);

  onContentChange(content: string): void {
    this.content.set(content);
  }

  onCursorChange(position: number): void {
    this.cursorPosition.set(position);
  }

  onEditorReady(view: EditorView): void {
    console.log('Editor is ready!', view);
  }

  onLanguageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.currentLanguage.set(select.value as SupportedLanguage);
  }
}
