import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

let socket = null;

export function useBadmintonSocket(matchId = null) {
  const [connected, setConnected] = useState(false);
  const [latestPointEvent, setLatestPointEvent] = useState(null);
  const [latestUndoEvent, setLatestUndoEvent] = useState(null);
  const [matchCompletedEvent, setMatchCompletedEvent] = useState(null);

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

    const onBadmintonPointRecorded = (data) => {
      setLatestPointEvent(data);
    };

    const onBadmintonPointUndone = (data) => {
      setLatestUndoEvent(data);
    };

    const onMatchCompleted = (data) => {
      setMatchCompletedEvent(data);
    };

    if (socket.connected) {
      setConnected(true);
      joinRoom();
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('BADMINTON_POINT_RECORDED', onBadmintonPointRecorded);
    socket.on('GLOBAL_BADMINTON_POINT_RECORDED', onBadmintonPointRecorded);
    socket.on('BADMINTON_POINT_UNDONE', onBadmintonPointUndone);
    socket.on('GLOBAL_BADMINTON_POINT_UNDONE', onBadmintonPointUndone);
    socket.on('MATCH_STATE_UPDATED', onMatchCompleted);

    return () => {
      if (socket) {
        if (matchId) {
          socket.emit('leave_match', matchId);
        }
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('BADMINTON_POINT_RECORDED', onBadmintonPointRecorded);
        socket.off('GLOBAL_BADMINTON_POINT_RECORDED', onBadmintonPointRecorded);
        socket.off('BADMINTON_POINT_UNDONE', onBadmintonPointUndone);
        socket.off('GLOBAL_BADMINTON_POINT_UNDONE', onBadmintonPointUndone);
        socket.off('MATCH_STATE_UPDATED', onMatchCompleted);
      }
    };
  }, [matchId]);

  return {
    connected,
    latestPointEvent,
    latestUndoEvent,
    matchCompletedEvent
  };
}
