import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'net';
import { EventEmitter } from 'events';
import { log } from './logger';

const DEFAULT_PORT = 43210;
const MAX_PORT_ATTEMPTS = 5;

let wss: WebSocketServer | null = null;
let activePort: number | null = null;

/** Emitted when the extension sends a TEXT_REQUEST. */
export const wsEvents = new EventEmitter();

export interface TextRequest {
  text: string;
  html: string;
  url: string;
  prompt: string;
}

/** Returns the port the WS server is actually listening on. */
export function getActivePort(): number | null {
  return activePort;
}

/** Check if a TCP port is available by briefly binding to it. */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => { srv.close(() => resolve(true)); });
    srv.listen(port, '127.0.0.1');
  });
}

/** Find an available port starting from `preferred`. */
async function findAvailablePort(preferred: number): Promise<number> {
  for (let i = 0; i < MAX_PORT_ATTEMPTS; i++) {
    const port = preferred + i;
    if (await isPortAvailable(port)) return port;
  }
  // Last resort: let the OS pick
  return 0;
}

export async function startWebSocketServer(preferredPort?: number): Promise<number> {
  const port = await findAvailablePort(preferredPort ?? DEFAULT_PORT);

  return new Promise((resolve, reject) => {
    wss = new WebSocketServer({ port, host: '127.0.0.1' });

    wss.on('listening', () => {
      const addr = wss!.address();
      activePort = typeof addr === 'object' && addr !== null ? addr.port : port;
      log('info', `WebSocket server listening on ws://127.0.0.1:${activePort}`);
      resolve(activePort);
    });

    wss.on('connection', (ws: WebSocket) => {
      ws.on('message', (data: Buffer) => {
        let msg: { type?: string; id?: string; payload?: unknown };
        try {
          msg = JSON.parse(data.toString());
        } catch {
          log('warn', 'WS: invalid JSON from client');
          return;
        }

        if (msg.type === 'TEXT_REQUEST') {
          const p = msg.payload as TextRequest;
          ws.send(JSON.stringify({ type: 'ACK', id: msg.id }));
          wsEvents.emit('text-request', p);
        } else {
          log('warn', 'WS: unknown message type', String(msg.type));
        }
      });

      ws.on('error', (err) => log('error', 'WS client error', (err as Error).message));
    });

    wss.on('error', (err) => {
      log('error', 'WS server error', (err as Error).message);
      reject(err);
    });
  });
}

export function stopWebSocketServer(): void {
  wss?.close();
  wss = null;
  activePort = null;
}
