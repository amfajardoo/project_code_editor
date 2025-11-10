import { Component, computed, inject, type ModelSignal, model, type Signal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

/**
 * Generates a random alphanumeric string of a specified length.
 *
 * @param {number} [length=8] - The desired length of the generated ID. Defaults to 8.
 * @returns {string} The randomly generated alphanumeric ID string.
 */
const generateRandomId = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

@Component({
  selector: 'app-home',
  imports: [FormsModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export default class Home {
  /**
   * Router service injected for navigation.
   * @private
   * @readonly
   * @type {Router}
   */
  private router: Router = inject(Router);

  /**
   * A signal model that holds the ID of the room the user wants to join.
   * The value is mutable and controlled by the view.
   * @type {ModelSignal<string>}
   */
  joinRoomId: ModelSignal<string> = model<string>('');

  /**
   * A computed signal that checks if the `joinRoomId` has a valid length (3 or more characters, excluding whitespace).
   * @type {Signal<boolean>}
   */
  isValidRoomId: Signal<boolean> = computed(() => this.joinRoomId()?.trim().length >= 3);

  /**
   * A signal holding a newly generated random ID for creating a new room.
   * @type {Signal<string>}
   */
  createNewRoomId: Signal<string> = signal(generateRandomId());

  /**
   * Handles the action of joining an existing collaboration room.
   *
   * It first checks if the room ID entered by the user (`this.joinRoomId()`) is valid
   * using `this.isValidRoomId()`. If the ID is valid, it navigates the user to the
   * editor route, appending the trimmed room ID as a URL parameter.
   *
   * Navigation path: `/editor/{roomId}`.
   */
  joinRoom() {
    if (this.isValidRoomId()) {
      const roomIdToJoin = this.joinRoomId().trim();
      this.router.navigate(['/editor', roomIdToJoin]);
    }
  }
}
