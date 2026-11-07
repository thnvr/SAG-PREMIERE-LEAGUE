import { io } from 'socket.io-client';

let socket = null;
let socketToken = null;

// In production, WebSocket connects directly to the Render backend.
// In development, Vite proxies /socket.io -> localhost:3001.
const SOCKET_URL = import.meta.env.PROD
  ? 'https://sag-premiere-backend.onrender.com'
  : '/';

/**
 * Initialize socket connection with auth token
 */
export function connectSocket(token) {
  const nextToken = token || null;
  if (socket && socketToken === nextToken) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  socketToken = nextToken;

  socket = io(SOCKET_URL, {
    auth: nextToken ? { token: nextToken } : {},
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
  });

  socket.on('reconnect', (attempt) => {
    console.log('[Socket] Reconnected after', attempt, 'attempts');
  });

  socket.on('reconnect_attempt', (attempt) => {
    console.log('[Socket] Reconnection attempt', attempt);
  });

  return socket;
}

/**
 * Disconnect socket
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  socketToken = null;
}

/**
 * Get existing socket instance
 */
export function getSocket() {
  return socket;
}

/**
 * Check if socket is connected
 */
export function isSocketConnected() {
  return socket?.connected || false;
}

export default {
  connectSocket,
  disconnectSocket,
  getSocket,
  isSocketConnected,
};
