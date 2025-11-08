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

  getCollaborationExtensions(): Extension[] {
    if (!this.provider) {
      throw new Error('Collaboration must be initialized before getting extensions');
    }
    return [yCollab(this.ytext, this.provider.awareness)];
  }

  getCurrentContent(): string {
    return this.ytext.toString();
  }

  getAwareness(): Awareness | undefined {
    return this.provider?.awareness;
  }

  getProvider(): WebsocketProvider | undefined {
    return this.provider;
  }

  isConnected(): boolean {
    return this.provider?.wsconnected ?? false;
  }

  disconnect(): void {
    if (this.provider) {
      this.provider.disconnect();
      this.provider.destroy();
      this.provider = undefined;
    }
    this.isInitialized = false;
  }

  reconnect(newRoomId: string): void {
    this.disconnect();
    this.initialize(newRoomId);
  }
}
