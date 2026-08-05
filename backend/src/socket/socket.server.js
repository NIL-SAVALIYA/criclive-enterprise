import { Server } from "socket.io";

let io = null;

/**
 * Initialize Socket.IO Server attached to HTTP server
 */
export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Client connected to Socket.IO: ${socket.id}`);

    // Join Match Room
    socket.on("join_match", (matchId) => {
      if (matchId) {
        socket.join(`match_${matchId}`);
        console.log(`📡 Socket ${socket.id} joined room match_${matchId}`);
      }
    });

    // Leave Match Room
    socket.on("leave_match", (matchId) => {
      if (matchId) {
        socket.leave(`match_${matchId}`);
        console.log(`📡 Socket ${socket.id} left room match_${matchId}`);
      }
    });

    // Join Tournament Room
    socket.on("join_tournament", (tournamentId) => {
      if (tournamentId) {
        socket.join(`tournament_${tournamentId}`);
        console.log(`📡 Socket ${socket.id} joined room tournament_${tournamentId}`);
      }
    });

    // Leave Tournament Room
    socket.on("leave_tournament", (tournamentId) => {
      if (tournamentId) {
        socket.leave(`tournament_${tournamentId}`);
      }
    });

    // Reconnect Request
    socket.on("reconnect_sync", (data) => {
      socket.emit("sync_ack", { timestamp: new Date(), status: "CONNECTED" });
    });

    socket.on("disconnect", () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Get Socket.IO instance
 */
export function getIO() {
  if (!io) {
    console.warn("⚠️ Socket.IO not initialized yet.");
  }
  return io;
}

/**
 * Emit Live Score Update to match room
 */
export function emitLiveScore(matchId, payload) {
  if (!io) return;
  io.to(`match_${matchId}`).emit("SCORE_UPDATED", payload);
  io.emit("GLOBAL_LIVE_SCORE_UPDATED", { matchId, payload });
}

/**
 * Emit Live Commentary Event to match room
 */
export function emitCommentary(matchId, commentaryData) {
  if (!io) return;
  io.to(`match_${matchId}`).emit("COMMENTARY_ADDED", commentaryData);
}

/**
 * Emit Full Scorecard Refresh event
 */
export function emitScorecardRefresh(matchId, scorecard) {
  if (!io) return;
  io.to(`match_${matchId}`).emit("SCORECARD_REFRESH", scorecard);
}

/**
 * Emit Points Table Refresh to tournament room
 */
export function emitPointsTableRefresh(tournamentId, pointsTable) {
  if (!io) return;
  io.to(`tournament_${tournamentId}`).emit("POINTS_TABLE_UPDATED", pointsTable);
  io.emit("GLOBAL_POINTS_TABLE_UPDATED", { tournamentId, pointsTable });
}

/**
 * Emit Tournament Standings & Stats Refresh
 */
export function emitStatsRefresh(tournamentId, statsData) {
  if (!io) return;
  io.to(`tournament_${tournamentId}`).emit("STATS_UPDATED", statsData);
}
