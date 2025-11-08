import { Injectable } from '@angular/core';
import type { Extension } from '@codemirror/state';
import { yCollab } from 'y-codemirror.next';
import type { Awareness } from 'y-protocols/awareness';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

const YJS_WEBSOCKET_URL = 'ws://localhost:1234';

@Injectable({
  providedIn: 'root',
})
export class Collaboration {
  private ydoc: Y.Doc;
  private provider?: WebsocketProvider;
  private ytext: Y.Text;

  constructor() {
    this.ydoc = new Y.Doc();
    this.ytext = this.ydoc.getText('codemirror-document');
  }

  initialize(roomId: string): void {
    this.provider = new WebsocketProvider(YJS_WEBSOCKET_URL, roomId, this.ydoc);

    this.ytext.observe(() => {
      this.notifyContentChange(this.ytext.toString());
    });
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

  disconnect(): void {
    this.provider?.disconnect();
    this.provider = undefined;
  }

  private notifyContentChange(_content: string): void {
    // console.log('Content changed:', content);
  }
}
