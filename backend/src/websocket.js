import { WebSocketServer } from 'ws';
import { verifyToken } from './utils/auth.js';

let wss = null;
const clients = new Map(); // userId -> Set<ws>

export function initWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    let userId = null;

    // Try to authenticate from query param
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      if (token) {
        const decoded = verifyToken(token);
        userId = decoded.id;

        if (!clients.has(userId)) {
          clients.set(userId, new Set());
        }
        clients.get(userId).add(ws);

        ws.send(JSON.stringify({ type: 'CONNECTED', payload: { userId } }));
        console.log(`[WS] User ${userId} connected. Total connections: ${clients.size}`);
      }
    } catch (err) {
      console.log('[WS] Unauthenticated connection');
    }

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);

        // Handle auth message
        if (data.type === 'AUTH' && data.token) {
          try {
            const decoded = verifyToken(data.token);
            userId = decoded.id;

            if (!clients.has(userId)) {
              clients.set(userId, new Set());
            }
            clients.get(userId).add(ws);

            ws.send(JSON.stringify({ type: 'CONNECTED', payload: { userId } }));
          } catch (err) {
            ws.send(JSON.stringify({ type: 'AUTH_ERROR', payload: { message: 'Invalid token' } }));
          }
          return;
        }

        // Handle ping
        if (data.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', payload: { timestamp: Date.now() } }));
          return;
        }

        // Handle readiness confirmation
        if (data.type === 'READINESS_CONFIRM') {
          broadcast({
            type: 'READINESS_UPDATE',
            payload: data.payload,
          });
          return;
        }

      } catch (err) {
        console.error('[WS] Error parsing message:', err);
      }
    });

    ws.on('close', () => {
      if (userId && clients.has(userId)) {
        clients.get(userId).delete(ws);
        if (clients.get(userId).size === 0) {
          clients.delete(userId);
        }
        console.log(`[WS] User ${userId} disconnected`);
      }
    });

    ws.on('error', (err) => {
      console.error('[WS] Connection error:', err.message);
    });
  });

  console.log('[WS] WebSocket server initialized');
  return wss;
}

/**
 * Broadcast message to all connected clients or a specific user
 */
export function broadcast(message) {
  if (!wss) return;

  const payload = JSON.stringify(message);

  if (message.targetUserId) {
    // Send to specific user
    const userSockets = clients.get(message.targetUserId);
    if (userSockets) {
      for (const ws of userSockets) {
        if (ws.readyState === 1) {
          ws.send(payload);
        }
      }
    }
  } else {
    // Broadcast to all
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(payload);
      }
    });
  }
}

/**
 * Get count of connected clients
 */
export function getConnectedCount() {
  return clients.size;
}
