import { io, Socket } from 'socket.io-client';

// Resolves backend WebSocket URL from Vite env variable or sensible defaults
const resolveBackendUrl = (): string => {
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, ''); // Remove trailing slashes
  }

  // Fallback for local development
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:3001`;
  }

  return 'http://localhost:3001';
};

export const BACKEND_URL = resolveBackendUrl();

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    console.log(`[Socket.IO Client] Connecting to backend: ${BACKEND_URL}`);
    socket = io(BACKEND_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
  }
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
