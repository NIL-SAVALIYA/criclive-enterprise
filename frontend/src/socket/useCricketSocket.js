import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

let socket = null;

export function useCricketSocket(matchId = null, tournamentId = null) {
  const [connected, setConnected] = useState(false);
  const [liveScore, setLiveScore] = useState(null);
  const [commentaryFeed, setCommentaryFeed] = useState([]);
  const [scorecard, setScorecard] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [lastBall, setLastBall] = useState(null);
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
    const onBallRecorded = (data) => {
      if (data && (!data.matchId || data.matchId === matchId)) {
        if (data.liveScore) setLiveScore(data.liveScore);
        if (data.scorecard) setScorecard(data.scorecard);
        if (data.analytics) setAnalytics(data.analytics);
        if (data.ball) setLastBall(data.ball);
      }
    };

    const onScoreUpdated = (data) => {
      if (data && (!data.matchId || data.matchId === matchId)) {
        const payload = data.payload || data;
        setLiveScore(payload);
        if (payload.analytics) setAnalytics(payload.analytics);
        if (payload.scorecard) setScorecard(payload.scorecard);
      }
    };

    const onCommentaryAdded = (data) => {
      if (data) {
        setCommentaryFeed((prev) => [data, ...prev]);
      }
    };

    const onScorecardRefresh = (data) => {
      if (data) {
        setScorecard(data.scorecard || data);
        if (data.analytics) setAnalytics(data.analytics);
      }
    };

    const onAnalyticsUpdated = (data) => {
      if (data && (!data.matchId || data.matchId === matchId)) {
        setAnalytics(data.analytics || data);
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

    const onMatchStateUpdated = (data) => {
      if (data && (!data.matchId || data.matchId === matchId)) {
        if (data.liveScore) setLiveScore(data.liveScore);
        if (data.scorecard) setScorecard(data.scorecard);
        if (data.analytics) setAnalytics(data.analytics);
        if (data.ball) setLastBall(data.ball);
      }
    };

    const onUndoProcessed = (data) => {
      if (data && (!data.matchId || data.matchId === matchId)) {
        if (data.liveScore) setLiveScore(data.liveScore);
        if (data.scorecard) setScorecard(data.scorecard);
        if (data.analytics) setAnalytics(data.analytics);
        setLastBall(data.undoneBall || null);
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('reconnect', onReconnect);
    socket.on('BALL_RECORDED', onBallRecorded);
    socket.on('GLOBAL_BALL_RECORDED', onBallRecorded);
    socket.on('SCORE_UPDATED', onScoreUpdated);
    socket.on('GLOBAL_LIVE_SCORE_UPDATED', onScoreUpdated);
    socket.on('MATCH_STATE_UPDATED', onMatchStateUpdated);
    socket.on('GLOBAL_MATCH_STATE_UPDATED', onMatchStateUpdated);
    socket.on('UNDO_PROCESSED', onUndoProcessed);
    socket.on('GLOBAL_UNDO_PROCESSED', onUndoProcessed);
    socket.on('COMMENTARY_ADDED', onCommentaryAdded);
    socket.on('SCORECARD_REFRESH', onScorecardRefresh);
    socket.on('ANALYTICS_UPDATED', onAnalyticsUpdated);
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
      socket.off('BALL_RECORDED', onBallRecorded);
      socket.off('GLOBAL_BALL_RECORDED', onBallRecorded);
      socket.off('SCORE_UPDATED', onScoreUpdated);
      socket.off('GLOBAL_LIVE_SCORE_UPDATED', onScoreUpdated);
      socket.off('MATCH_STATE_UPDATED', onMatchStateUpdated);
      socket.off('GLOBAL_MATCH_STATE_UPDATED', onMatchStateUpdated);
      socket.off('UNDO_PROCESSED', onUndoProcessed);
      socket.off('GLOBAL_UNDO_PROCESSED', onUndoProcessed);
      socket.off('COMMENTARY_ADDED', onCommentaryAdded);
      socket.off('SCORECARD_REFRESH', onScorecardRefresh);
      socket.off('ANALYTICS_UPDATED', onAnalyticsUpdated);
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
    analytics,
    lastBall,
    pointsTable,
    stats
  };
}
