import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { EditorView as CodeMirrorEditorView } from '@codemirror/view';
import type { SupportedLanguage } from '../code-mirror/config';
import { Editor } from '../editor/editor';

@Component({
  selector: 'app-editor-view',
  imports: [Editor],
  templateUrl: './editor-view.html',
  styleUrl: './editor-view.css',
})
export default class EditorView {
  private router = inject(Router);
  roomId = input.required<string>();
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

  onEditorReady(view: CodeMirrorEditorView): void {
    console.log('Editor is ready!', view);
  }

  onLanguageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.currentLanguage.set(select.value as SupportedLanguage);
  }

  goToHome() {
    this.router.navigate(['/']);
  }
}
