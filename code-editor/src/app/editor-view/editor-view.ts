import { ClipboardModule } from '@angular/cdk/clipboard';
import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { SupportedLanguage } from '../code-mirror/config';
import { Collaboration } from '../editor/collaboration';
import { Editor } from '../editor/editor';

@Component({
  selector: 'app-editor-view',
  imports: [Editor, ClipboardModule],
  templateUrl: './editor-view.html',
  styleUrl: './editor-view.css',
})
export default class EditorView {
  private router = inject(Router);
  roomId = input.required<string>();
  currentLanguage = signal('typescript');
  cursorPosition = signal(0);
  content = signal('');
  contentLength = computed(() => this.content().length);
  lineCount = computed(() => this.content().split('\n').length);
  copied = signal(false);

  private collaboration = inject(Collaboration);

  userInfo = this.collaboration.userInfo;
  connectedUsers = this.collaboration.connectedUsers;

  onContentChange(content: string): void {
    this.content.set(content);
  }

  onCursorChange(position: number): void {
    this.cursorPosition.set(position);
  }

  onLanguageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.currentLanguage.set(select.value as SupportedLanguage);
  }

  goToHome() {
    this.router.navigate(['/']);
  }
}
