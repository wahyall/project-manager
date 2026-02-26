const { Server } = require("socket.io");
const logger = require("../utils/logger");

let io;

const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    logger.debug(`Socket connected: ${socket.id}`);

    // Join workspace room saat user terautentikasi
    socket.on("workspace:join", (workspaceId) => {
      socket.join(`workspace:${workspaceId}`);
      logger.debug(`Socket ${socket.id} joined workspace:${workspaceId}`);
    });

    socket.on("workspace:leave", (workspaceId) => {
      socket.leave(`workspace:${workspaceId}`);
      logger.debug(`Socket ${socket.id} left workspace:${workspaceId}`);
    });

    // Join board room (brainstorming)
    socket.on("board:join", (boardId) => {
      socket.join(`board:${boardId}`);
    });

    socket.on("board:leave", (boardId) => {
      socket.leave(`board:${boardId}`);
    });

    // Join sheet room (spreadsheet)
    socket.on("sheet:join", (sheetId) => {
      socket.join(`sheet:${sheetId}`);
    });

    socket.on("sheet:leave", (sheetId) => {
      socket.leave(`sheet:${sheetId}`);
    });

    // Presence heartbeat
    socket.on("presence:heartbeat", (data) => {
      // Akan diimplementasikan lengkap di Fase 1.4 (User & Profil)
    });

    socket.on("disconnect", (reason) => {
      logger.debug(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  logger.info("Socket.io terinisialisasi");
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io belum diinisialisasi");
  }
  return io;
};

module.exports = { initializeSocket, getIO };
