import { io } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5555";

let socket = null;

/**
 * Inisialisasi koneksi Socket.io
 * Dipanggil setelah user login
 */
export const connectSocket = (token) => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on("connect", () => {
    console.log("[Socket] Connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[Socket] Disconnected:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("[Socket] Connection error:", error.message);
  });

  return socket;
};

/**
 * Disconnect socket
 * Dipanggil saat user logout
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Dapatkan instance socket saat ini
 */
export const getSocket = () => socket;

export default socket;
