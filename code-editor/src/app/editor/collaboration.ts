import { Injectable, signal } from '@angular/core';
import type { Extension } from '@codemirror/state';
import { yCollab } from 'y-codemirror.next';
import type { Awareness } from 'y-protocols/awareness';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

const YJS_WEBSOCKET_URL = 'ws://localhost:1234';

function getRandomColor(): string {
  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#FFA07A',
    '#98D8C8',
    '#F7DC6F',
    '#BB8FCE',
    '#85C1E2',
    '#F8B739',
    '#52B788',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function getRandomName(): string {
  const adjectives = ['Happy', 'Clever', 'Brave', 'Swift', 'Bright', 'Cool', 'Smart', 'Quick'];
  const animals = ['Panda', 'Tiger', 'Eagle', 'Dolphin', 'Fox', 'Wolf', 'Bear', 'Hawk'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `${adj} ${animal}`;
}

export interface UserInfo {
  name: string;
  color: string;
  colorLight?: string;
}

@Injectable({
  providedIn: 'root',
})
export class Collaboration {
  private ydoc: Y.Doc;
  private provider?: WebsocketProvider;
  private ytext: Y.Text;
  private isInitialized = false;
  private color = getRandomColor();
  connectedUsers = signal<UserInfo[]>([]);
  userInfo = signal<UserInfo>({
    name: getRandomName(),
    color: this.color,
    colorLight: `${this.color}33`,
  });

  constructor() {
    this.ydoc = new Y.Doc();
    this.ytext = this.ydoc.getText('codemirror');
  }

  /**
   * Initializes the collaboration provider and connects to the specified room.
   *
   * This method creates a new `WebsocketProvider` (Y.js) using the configured
   * WebSocket URL, the provided `roomId`, and the internal `ydoc`.
   * It also sets the local user's information (name, color) in the Y.js Awareness state
   * and sets up an event listener to update the list of connected users whenever
   * the Awareness state changes (i.e., when users join or leave).
   *
   * If the service is already initialized, this method does nothing.
   *
   * @param roomId - The unique identifier for the collaboration room to join.
   */
  initialize(roomId: string): void {
    if (this.isInitialized && this.provider) {
      return;
    }

    this.provider = new WebsocketProvider(YJS_WEBSOCKET_URL, roomId, this.ydoc, { connect: true });

    this.provider.awareness.setLocalStateField('user', {
      name: this.userInfo().name,
      color: this.userInfo().color,
      colorLight: this.userInfo().colorLight,
    });

    this.provider.awareness.on('change', () => {
      const states = Array.from(
        this.provider?.awareness.getStates().values() as Iterable<{ [x: string]: unknown; user?: UserInfo }>
      );
      const _users = states.map((state) => state.user).filter(Boolean) as UserInfo[];
      this.connectedUsers.set(_users);
    });

    this.isInitialized = true;
  }

  /**
   * Returns the CodeMirror extensions required for Y.js collaboration.
   *
   * This includes the core `yCollab` extension, which binds the CodeMirror editor's
   * content to the Y.js shared text (`ytext`) and provides cursor/user presence
   * through the `WebsocketProvider`'s `awareness`.
   *
   * @returns An array of CodeMirror `Extension` objects necessary for collaborative editing.
   * @throws {Error} If collaboration has not been initialized (i.e., `provider` is undefined).
   */
  getCollaborationExtensions(): Extension[] {
    if (!this.provider) {
      throw new Error('Collaboration must be initialized before getting extensions');
    }
    return [yCollab(this.ytext, this.provider.awareness)];
  }

  /**
   * Retrieves the current content of the shared document.
   *
   * It converts the Y.js shared text object (`ytext`) to a standard string.
   *
   * @returns The full content of the collaborative document as a string.
   */
  getCurrentContent(): string {
    return this.ytext.toString();
  }

  /**
   * Gets the Y.js Awareness instance associated with the collaboration provider.
   *
   * The Awareness object is used to manage and share non-content state, such as
   * user cursors, selections, and other presence data.
   *
   * @returns The Y.js `Awareness` instance, or `undefined` if the provider has not been initialized.
   */
  getAwareness(): Awareness | undefined {
    return this.provider?.awareness;
  }

  /**
   * Gets the underlying Y.js `WebsocketProvider` instance.
   *
   * The provider handles the WebSocket connection and synchronization with other clients.
   *
   * @returns The `WebsocketProvider` instance, or `undefined` if it has not been initialized.
   */
  getProvider(): WebsocketProvider | undefined {
    return this.provider;
  }

  /**
   * Checks the connection status of the collaboration provider's WebSocket.
   *
   * @returns `true` if the WebSocket is currently connected, `false` otherwise.
   */
  isConnected(): boolean {
    return this.provider?.wsconnected ?? false;
  }

  /**
   * Disconnects the collaboration service.
   *
   * This stops the WebSocket connection, destroys the provider instance to free resources,
   * and resets the internal state.
   */
  disconnect(): void {
    if (this.provider) {
      this.provider.disconnect();
      this.provider.destroy();
      this.provider = undefined;
    }
    this.isInitialized = false;
  }

  /**
   * Disconnects from the current collaboration room and immediately reconnects
   * to a new room.
   *
   * This is equivalent to calling `disconnect()` followed by `initialize(newRoomId)`.
   *
   * @param newRoomId - The unique identifier of the new collaboration room to join.
   */
  reconnect(newRoomId: string): void {
    this.disconnect();
    this.initialize(newRoomId);
  }
}
