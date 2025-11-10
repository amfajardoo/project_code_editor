import { ClipboardModule } from '@angular/cdk/clipboard';
import {
  Component,
  computed,
  type InputSignal,
  inject,
  input,
  type Signal,
  signal,
  type WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import type { SupportedLanguage } from '../code-mirror/config';
import { Collaboration, type UserInfo } from '../editor/collaboration';
import { Editor } from '../editor/editor';

@Component({
  selector: 'app-editor-view',
  imports: [Editor, ClipboardModule],
  templateUrl: './editor-view.html',
  styleUrl: './editor-view.css',
})
export default class EditorView {
  /**
   * Router service injected for navigation.
   * @private
   * @readonly
   * @type {Router}
   */
  private router: Router = inject(Router);

  /**
   * The ID of the collaborative room, required as an input property.
   * @type {InputSignal<string>}
   */
  roomId: InputSignal<string> = input.required<string>();

  /**
   * A signal holding the currently selected programming language for the editor (e.g., 'typescript').
   * @type {WritableSignal<SupportedLanguage>}
   */
  currentLanguage: WritableSignal<SupportedLanguage> = signal<SupportedLanguage>('typescript');

  /**
   * A signal holding the current position of the cursor within the editor content.
   * @type {WritableSignal<number>}
   */
  cursorPosition: WritableSignal<number> = signal(0);

  /**
   * A signal holding the current text content of the editor.
   * @type {WritableSignal<string>}
   */
  content: WritableSignal<string> = signal('');

  /**
   * A computed signal that calculates the total length (number of characters) of the editor content.
   * @type {Signal<number>}
   */
  contentLength: Signal<number> = computed(() => this.content().length);

  /**
   * A computed signal that calculates the number of lines in the editor content.
   * @type {Signal<number>}
   */
  lineCount: Signal<number> = computed(() => this.content().split('\n').length);

  /**
   * A signal indicating whether the editor content has recently been copied to the clipboard.
   * @type {Signal<boolean>}
   */
  copied: Signal<boolean> = signal(false);

  /**
   * The collaboration service injected for real-time data handling.
   * @private
   * @readonly
   * @type {Collaboration}
   */
  private collaboration: Collaboration = inject(Collaboration);

  /**
   * A signal or observable holding the current user's information, retrieved from the collaboration service.
   * @type {WritableSignal<UserInfo>}
   */
  userInfo: WritableSignal<UserInfo> = this.collaboration.userInfo;

  /**
   * A signal or observable holding a map or array of users currently connected to the room.
   * @type {WritableSignal<UserInfo[]>}
   */
  connectedUsers: WritableSignal<UserInfo[]> = this.collaboration.connectedUsers;

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
