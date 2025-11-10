import { WebSocketServer, WebSocket } from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { IncomingMessage } from "http";

/**
 * The port number on which the WebSocket server listens.
 * @type {number}
 * @constant
 */
const PORT = 1234;

/**
 * Message type identifier for Yjs synchronization updates.
 * @type {number}
 * @constant
 */
const messageSync = 0;

/**
 * Message type identifier for Yjs awareness updates.
 * @type {number}
 * @constant
 */
const messageAwareness = 1;

/**
 * A map of document names (room names) to their corresponding shared Y.Doc instances.
 * @type {Map<string, WSSharedDoc>}
 */
const docs = new Map<string, WSSharedDoc>();

/**
 * Represents a Yjs document shared across multiple WebSocket connections.
 * It extends Y.Doc and manages connections and awareness states.
 * @augments Y.Doc
 */
class WSSharedDoc extends Y.Doc {
  /**
   * The name of the shared document (e.g., the room id).
   * @type {string}
   */
  name: string;

  /**
   * A map of active WebSocket connections to the set of client IDs they are aware of.
   * Note: The Set<number> is often unused in this basic setup but is standard in y-websocket.
   * @type {Map<WebSocket, Set<number>>}
   */
  conns: Map<WebSocket, Set<number>>;

  /**
   * The Yjs Awareness instance for tracking user presence and state.
   * @type {awarenessProtocol.Awareness}
   */
  awareness: awarenessProtocol.Awareness;

  /**
   * Creates an instance of WSSharedDoc.
   * @param {string} name - The name of the document/room.
   */
  constructor(name: string) {
    super({ gc: true });
    this.name = name;
    this.conns = new Map();
    this.awareness = new awarenessProtocol.Awareness(this);
    
    /**
     * Event handler triggered when the Y.Doc receives an update (a change to the shared document state).
     * This handler broadcasts the synchronization update to all other connected clients.
     *
     * @event update
     * @param {Uint8Array} update - The binary update containing the document changes.
     * @param {any} origin - The WebSocket connection that originated the update, to prevent echoing.
     * @listens Y.Doc#update
     */
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

    /**
     * Event handler triggered when the Awareness state of any client changes (e.g., cursor position, user status).
     * This handler encodes the awareness update and broadcasts it to all other connected clients.
     *
     * @event update
     * @param {object} changes - Object containing arrays of client IDs: `added`, `updated`, and `removed`.
     * @param {number[]} changes.added - Client IDs that have just gained an awareness state.
     * @param {number[]} changes.updated - Client IDs whose awareness state has changed.
     * @param {number[]} changes.removed - Client IDs whose awareness state has been removed.
     * @param {any} origin - The WebSocket connection that originated the awareness update.
     * @listens awarenessProtocol.Awareness#update
     */
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

/**
 * Retrieves an existing shared document by name or creates a new one if it doesn't exist.
 *
 * @param {string} docname - The name of the document (room name).
 * @returns {WSSharedDoc} The shared Yjs document instance.
 */
const getYDoc = (docname: string): WSSharedDoc => {
  let doc = docs.get(docname);
  if (!doc) {
    doc = new WSSharedDoc(docname);
    docs.set(docname, doc);
  }
  return doc;
};

/**
 * The WebSocket server instance.
 * @type {WebSocketServer}
 */
const wss = new WebSocketServer({ port: PORT });

/**
 * Event handler triggered when a new WebSocket client connects to the server.
 * This handler initializes the client's connection to a shared Yjs document (room) and sets up
 * the bidirectional synchronization and awareness protocols.
 *
 * @event connection
 * @param {WebSocket} conn - The new WebSocket connection established with the client.
 * @param {IncomingMessage} req - The incoming HTTP request details, used to extract the room name from the URL.
 * @listens WebSocketServer#connection
 */
wss.on("connection", (conn: WebSocket, req: IncomingMessage) => {

  /**
   * The path from the connection URL, used to determine the document/room name.
   * @type {string}
   * @default "/"
   */
  const urlPath = req.url || "/";

  /**
   * The name of the shared document (room) the client is connecting to.
   * Extracted from the URL path (e.g., `/my-room` becomes `my-room`), defaults to `default`.
   * @type {string}
   * @default "default"
   */
  const roomName = urlPath.substring(1) || "default";
   
  /**
   * The WSSharedDoc instance for the current room. Retrieved or created via `getYDoc`.
   * @type {WSSharedDoc}
   */
  const doc = getYDoc(roomName);

  // Connection is added to the document's map of active connections.
  doc.conns.set(conn, new Set());

  /**
   * Helper function to safely send a message (Uint8Array) to the connected client.
   * Checks if the WebSocket is open before attempting to send.
   *
   * @param {Uint8Array} message - The binary data message to send.
   */
  const send = (message: Uint8Array) => {
    if (conn.readyState === WebSocket.OPEN) {
      conn.send(message, (err) => {
        if (err) {
        }
      });
    }
  };

  /**
   * Event handler triggered when the client sends a message over the WebSocket.
   * This handler decodes the message type and processes it using the Yjs sync or awareness protocols.
   *
   * @event message
   * @param {Buffer} message - The raw binary message data received from the client.
   * @listens WebSocket#message
   */
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

  /**
   * Encodes and sends the initial Yjs synchronization message (Sync Step 1) to the client.
   * This sends the client the current state of the document so it can request missing updates.
   */
  const syncEncoder = encoding.createEncoder();
  encoding.writeVarUint(syncEncoder, messageSync);
  syncProtocol.writeSyncStep1(syncEncoder, doc);
  send(encoding.toUint8Array(syncEncoder));

  /**
   * Checks for and sends the initial awareness state (other users' presence) to the client.
   * This ensures the new client is immediately aware of existing users in the room.
   */
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

  /**
   * Event handler triggered when the WebSocket connection is closed by the client or server.
   * This handler removes the connection and cleans up the associated awareness states.
   * It also destroys the document if this was the last connection to it.
   *
   * @event close
   * @listens WebSocket#close
   */
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

  /**
   * Event handler for errors occurring on the specific WebSocket connection.
   *
   * @event error
   * @param {Error} error - The error object.
   * @listens WebSocket#error
   */
  conn.on("error", (error) => {
  });
});

/**
 * Event handler for fatal errors occurring on the WebSocket server itself.
 *
 * @event error
 * @param {Error} error - The error object.
 * @listens WebSocketServer#error
 */
wss.on("error", (error) => {
});