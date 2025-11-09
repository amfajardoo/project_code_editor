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

  /**
   * Handler invoked when the editor's content changes.
   *
   * It updates the internal reactive state (`this.content`) with the new document content.
   *
   * @param content - The complete, updated content of the editor as a string.
   */
  onContentChange(content: string): void {
    this.content.set(content);
  }

  /**
   * Handler invoked when the editor's cursor position changes.
   *
   * It updates the internal reactive state (`this.cursorPosition`) with the new cursor offset.
   *
   * @param position - The numeric character offset of the primary cursor.
   */
  onCursorChange(position: number): void {
    this.cursorPosition.set(position);
  }

  /**
   * Handler invoked when the user selects a different language from a UI element (e.g., a `<select>` tag).
   *
   * It extracts the new language value from the event target and updates the internal
   * reactive state (`this.currentLanguage`).
   *
   * @param event - The DOM event triggered by the change (e.g., `HTMLSelectElement` change event).
   */
  onLanguageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.currentLanguage.set(select.value as SupportedLanguage);
  }

  /**
   * Navigates the user to the application's root route.
   *
   * This is typically used to move the user back to a main dashboard or landing page.
   */
  goToHome() {
    this.router.navigate(['/']);
  }
}
