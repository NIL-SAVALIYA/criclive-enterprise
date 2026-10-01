import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

let socket = null;

export function useTableTennisSocket(matchId = null) {
  const [connected, setConnected] = useState(false);
  const [latestPointEvent, setLatestPointEvent] = useState(null);
  const [latestUndoEvent, setLatestUndoEvent] = useState(null);
  const [matchUpdatedEvent, setMatchUpdatedEvent] = useState(null);

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

    const joinRoom = () => {
      if (matchId) {
        socket.emit('join_match', matchId);
      }
    };

    const onConnect = () => {
      setConnected(true);
      joinRoom();
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    const onTableTennisPointScored = (data) => {
      setLatestPointEvent(data);
    };

    const onTableTennisPointUndone = (data) => {
      setLatestUndoEvent(data);
    };

    const onMatchUpdated = (data) => {
      setMatchUpdatedEvent(data);
    };

    if (socket.connected) {
      setConnected(true);
      joinRoom();
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('TABLE_TENNIS_POINT_SCORED', onTableTennisPointScored);
    socket.on('GLOBAL_TABLE_TENNIS_POINT_SCORED', onTableTennisPointScored);
    socket.on('TABLE_TENNIS_POINT_UNDONE', onTableTennisPointUndone);
    socket.on('GLOBAL_TABLE_TENNIS_POINT_UNDONE', onTableTennisPointUndone);
    socket.on('TABLE_TENNIS_MATCH_UPDATED', onMatchUpdated);
    socket.on('GLOBAL_TABLE_TENNIS_MATCH_UPDATED', onMatchUpdated);

    return () => {
      if (socket) {
        if (matchId) {
          socket.emit('leave_match', matchId);
        }
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('TABLE_TENNIS_POINT_SCORED', onTableTennisPointScored);
        socket.off('GLOBAL_TABLE_TENNIS_POINT_SCORED', onTableTennisPointScored);
        socket.off('TABLE_TENNIS_POINT_UNDONE', onTableTennisPointUndone);
        socket.off('GLOBAL_TABLE_TENNIS_POINT_UNDONE', onTableTennisPointUndone);
        socket.off('TABLE_TENNIS_MATCH_UPDATED', onMatchUpdated);
        socket.off('GLOBAL_TABLE_TENNIS_MATCH_UPDATED', onMatchUpdated);
      }
    };
  }, [matchId]);

  return {
    connected,
    latestPointEvent,
    latestUndoEvent,
    matchUpdatedEvent
  };
}
