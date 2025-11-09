import { Component, computed, inject, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

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
  private router = inject(Router);
  joinRoomId = model<string>('');
  isValidRoomId = computed(() => this.joinRoomId()?.trim().length >= 3);
  createNewRoomId = signal(generateRandomId());

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
