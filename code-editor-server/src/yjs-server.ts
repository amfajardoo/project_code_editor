import { WebSocketServer } from "ws";

const { setupWSConnection } = require("y-websocket/bin/utils");

// Ports: NestJS (3000), Yjs (1234)
const PORT = 1234;

const wss = new WebSocketServer({ port: PORT });
console.log(`📡 Servidor Yjs-WebSocket corriendo en ws://localhost:${PORT}`);

wss.on("connection", (conn, req) => {
	// Extrae el Room ID de la URL (e.g., ws://localhost:1234/?room=my-session-id)
	const url = new URL(req.url || "/", `http://${req.headers.host}`);
	const roomName = url.searchParams.get("room") || "default";

	// Función crucial: Configura la conexión Yjs.
	// Maneja los mensajes, la sincronización, y la lógica de Yjs/CRDTs.
	setupWSConnection(conn, req, {
		docName: roomName,
		// Opciones adicionales como persistencia de documentos podrían ir aquí
	});
});

// Manejo de errores
wss.on("error", (error) => {
	console.error("Error en el servidor Yjs-WebSocket:", error);
});
