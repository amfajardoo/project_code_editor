import { WebSocketServer, WebSocket } from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { IncomingMessage } from "http";

const PORT = 1234;

const messageSync = 0;
const messageAwareness = 1;

const docs = new Map<string, WSSharedDoc>();

class WSSharedDoc extends Y.Doc {
  name: string;
  conns: Map<WebSocket, Set<number>>;
  awareness: awarenessProtocol.Awareness;

  constructor(name: string) {
    super({ gc: true });
    this.name = name;
    this.conns = new Map();
    this.awareness = new awarenessProtocol.Awareness(this);
    
    this.on("update", (update: Uint8Array, origin: any) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);
      
      this.conns.forEach((_, conn) => {
        if (conn !== origin && conn.readyState === WebSocket.OPEN) {
          conn.send(message, (err) => {
            if (err) {
            }
          });
        }
      });
    });

    this.awareness.on("update", ({ added, updated, removed }: any, origin: any) => {
      const changedClients = added.concat(updated).concat(removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
      );
      const message = encoding.toUint8Array(encoder);
      
      this.conns.forEach((_, conn) => {
        if (conn !== origin && conn.readyState === WebSocket.OPEN) {
          conn.send(message, (err) => {
            if (err) {
            }
          });
        }
      });
    });
  }
}

const getYDoc = (docname: string): WSSharedDoc => {
  let doc = docs.get(docname);
  if (!doc) {
    doc = new WSSharedDoc(docname);
    docs.set(docname, doc);
  }
  return doc;
};

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (conn: WebSocket, req: IncomingMessage) => {
  const urlPath = req.url || "/";
  const roomName = urlPath.substring(1) || "default";
   
  const doc = getYDoc(roomName);
  doc.conns.set(conn, new Set());

  const send = (message: Uint8Array) => {
    if (conn.readyState === WebSocket.OPEN) {
      conn.send(message, (err) => {
        if (err) {
        }
      });
    }
  };

  conn.on("message", (message: Buffer) => {
    try {
      const uint8Array = new Uint8Array(message);
      
      if (uint8Array.length === 0) {
        return;
      }

      const decoder = decoding.createDecoder(uint8Array);
      const encoder = encoding.createEncoder();
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case messageSync: {
          encoding.writeVarUint(encoder, messageSync);
          const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, doc, conn);
          
          if (encoding.length(encoder) > 1) {
            send(encoding.toUint8Array(encoder));
          }
          break;
        }
          
        case messageAwareness: {
          awarenessProtocol.applyAwarenessUpdate(
            doc.awareness,
            decoding.readVarUint8Array(decoder),
            conn
          );
          break;
        }

        default:;
      }
    } catch (err) {

    }
  });

  const syncEncoder = encoding.createEncoder();
  encoding.writeVarUint(syncEncoder, messageSync);
  syncProtocol.writeSyncStep1(syncEncoder, doc);
  send(encoding.toUint8Array(syncEncoder));

  const awarenessStates = doc.awareness.getStates();
  if (awarenessStates.size > 0) {
    const awarenessEncoder = encoding.createEncoder();
    encoding.writeVarUint(awarenessEncoder, messageAwareness);
    encoding.writeVarUint8Array(
      awarenessEncoder,
      awarenessProtocol.encodeAwarenessUpdate(doc.awareness, Array.from(awarenessStates.keys()))
    );
    send(encoding.toUint8Array(awarenessEncoder));
  }

  conn.on("close", () => {
    doc.conns.delete(conn);
    awarenessProtocol.removeAwarenessStates(
      doc.awareness, 
      Array.from(doc.awareness.getStates().keys()).filter((clientID) => {
        const state = doc.awareness.states.get(clientID);
        return state && (state as any).conn === conn;
      }), 
      null
    );
    
    if (doc.conns.size === 0) {
      doc.destroy();
      docs.delete(roomName);
    }
  });

  conn.on("error", (error) => {
  });
});

wss.on("error", (error) => {
});