import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

let socket = null;

export function useCricketSocket(matchId = null, tournamentId = null) {
  const [connected, setConnected] = useState(false);
  const [liveScore, setLiveScore] = useState(null);
  const [commentaryFeed, setCommentaryFeed] = useState([]);
  const [scorecard, setScorecard] = useState(null);
  const [pointsTable, setPointsTable] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!socket) {

      const serverUrl =
        import.meta.env.VITE_SOCKET_URL ||
        (window.location.hostname === 'localhost'
          ? 'http://localhost:5000'
          : `http://${window.location.hostname}:5000`);

      socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000
      });
    }

    const joinRooms = () => {
      if (matchId) {
        socket.emit('join_match', matchId);
      }
      if (tournamentId) {
        socket.emit('join_tournament', tournamentId);
      }
    };

    const onConnect = () => {
      setConnected(true);
      joinRooms();
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    const onReconnect = () => {
      setConnected(true);
      socket.emit('reconnect_sync', { matchId, tournamentId });
      joinRooms();
    };

    // Live Event Listeners
    const onScoreUpdated = (data) => {
      if (data && (!data.matchId || data.matchId === matchId)) {
        setLiveScore(data.payload || data);
      }
    };

    const onCommentaryAdded = (data) => {
      if (data) {
        setCommentaryFeed((prev) => [data, ...prev]);
      }
    };

    const onScorecardRefresh = (data) => {
      if (data) {
        setScorecard(data);
      }
    };

    const onPointsTableUpdated = (data) => {
      if (data) {
        setPointsTable(data.pointsTable || data);
      }
    };

    const onStatsUpdated = (data) => {
      if (data) {
        setStats(data);
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('reconnect', onReconnect);
    socket.on('SCORE_UPDATED', onScoreUpdated);
    socket.on('GLOBAL_LIVE_SCORE_UPDATED', onScoreUpdated);
    socket.on('COMMENTARY_ADDED', onCommentaryAdded);
    socket.on('SCORECARD_REFRESH', onScorecardRefresh);
    socket.on('POINTS_TABLE_UPDATED', onPointsTableUpdated);
    socket.on('STATS_UPDATED', onStatsUpdated);

    if (socket.connected) {
      onConnect();
    }

    return () => {
      if (matchId) socket.emit('leave_match', matchId);
      if (tournamentId) socket.emit('leave_tournament', tournamentId);

      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('reconnect', onReconnect);
      socket.off('SCORE_UPDATED', onScoreUpdated);
      socket.off('GLOBAL_LIVE_SCORE_UPDATED', onScoreUpdated);
      socket.off('COMMENTARY_ADDED', onCommentaryAdded);
      socket.off('SCORECARD_REFRESH', onScorecardRefresh);
      socket.off('POINTS_TABLE_UPDATED', onPointsTableUpdated);
      socket.off('STATS_UPDATED', onStatsUpdated);
    };
  }, [matchId, tournamentId]);

  return {
    socket,
    connected,
    liveScore,
    commentaryFeed,
    scorecard,
    pointsTable,
    stats
  };
}
