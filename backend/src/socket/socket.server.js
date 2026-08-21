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
    socket.on("reconnect_sync", () => {
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
 * Emit Authoritative Ball Recorded Event with comprehensive match state
 */
export function emitBallRecorded(matchId, payload) {
  if (!io) return;
  io.to(`match_${matchId}`).emit("BALL_RECORDED", payload);
  io.emit("GLOBAL_BALL_RECORDED", { matchId, payload });
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
 * Emit Analytics Updated event (Wagon Wheel & Pitch Map)
 */
export function emitAnalyticsUpdated(matchId, analytics) {
  if (!io) return;
  io.to(`match_${matchId}`).emit("ANALYTICS_UPDATED", analytics);
}

/**
 * Emit Single Authoritative Match State Updated event
 */
export function emitMatchStateUpdated(matchId, payload) {
  if (!io) return;
  io.to(`match_${matchId}`).emit("MATCH_STATE_UPDATED", payload);
  io.emit("GLOBAL_MATCH_STATE_UPDATED", { matchId, ...payload });

  if (payload.liveScore) {
    io.to(`match_${matchId}`).emit("SCORE_UPDATED", payload.liveScore);
    io.emit("GLOBAL_LIVE_SCORE_UPDATED", { matchId, payload: payload.liveScore });
  }
  if (payload.scorecard) {
    io.to(`match_${matchId}`).emit("SCORECARD_REFRESH", payload.scorecard);
  }
  if (payload.analytics) {
    io.to(`match_${matchId}`).emit("ANALYTICS_UPDATED", payload.analytics);
  }
}

/**
 * Emit Undo Delivery Event
 */
export function emitUndoDelivery(matchId, payload) {
  if (!io) return;
  io.to(`match_${matchId}`).emit("UNDO_PROCESSED", payload);
  io.emit("GLOBAL_UNDO_PROCESSED", { matchId, ...payload });
  emitMatchStateUpdated(matchId, payload);
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

/**
 * Emit Manager Assignment Created Event
 */
export function emitManagerAssignmentCreated(targetUserId, assignment) {
  if (!io) return;
  io.emit("MANAGER_ASSIGNMENT_CREATED", { targetUserId, assignment });
  if (assignment.matchId) {
    io.to(`match_${assignment.matchId}`).emit("MATCH_MANAGER_UPDATED", assignment);
  }
}

/**
 * Emit Manager Assignment Accepted Event
 */
export function emitManagerAssignmentAccepted(tournamentId, matchId, assignment) {
  if (!io) return;
  io.emit("MANAGER_ASSIGNMENT_ACCEPTED", { tournamentId, matchId, assignment });
  if (tournamentId) {
    io.to(`tournament_${tournamentId}`).emit("TOURNAMENT_MANAGER_UPDATED", assignment);
  }
  if (matchId) {
    io.to(`match_${matchId}`).emit("MATCH_MANAGER_UPDATED", assignment);
  }
}

/**
 * Emit Manager Assignment Declined Event
 */
export function emitManagerAssignmentDeclined(tournamentId, matchId, assignment) {
  if (!io) return;
  io.emit("MANAGER_ASSIGNMENT_DECLINED", { tournamentId, matchId, assignment });
  if (matchId) {
    io.to(`match_${matchId}`).emit("MATCH_MANAGER_UPDATED", assignment);
  }
}

/**
 * Emit Manager Assignment Cancelled Event
 */
export function emitManagerAssignmentCancelled(targetUserId, assignment) {
  if (!io) return;
  io.emit("MANAGER_ASSIGNMENT_CANCELLED", { targetUserId, assignment });
  if (assignment.matchId) {
    io.to(`match_${assignment.matchId}`).emit("MATCH_MANAGER_UPDATED", assignment);
  }
}

/**
 * Emit Manager Assignment Revoked Event
 */
export function emitManagerAssignmentRevoked(targetUserId, assignment) {
  if (!io) return;
  io.emit("MANAGER_ASSIGNMENT_REVOKED", { targetUserId, assignment });
  if (assignment.matchId) {
    io.to(`match_${assignment.matchId}`).emit("MATCH_MANAGER_UPDATED", assignment);
  }
}

/**
 * Emit Playing XI Submitted Event
 */
export function emitPlayingXISubmitted(matchId, teamId, playingXI) {
  if (!io) return;
  io.to(`match_${matchId}`).emit("PLAYING_XI_UPDATED", { matchId, teamId, playingXI });
  io.emit("GLOBAL_PLAYING_XI_UPDATED", { matchId, teamId, playingXI });
}

