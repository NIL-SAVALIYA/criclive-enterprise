import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

let socket = null;

export function useFootballSocket(matchId = null) {
  const [connected, setConnected] = useState(false);
  const [latestFootballEvent, setLatestFootballEvent] = useState(null);
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

    const onFootballEventRecorded = (data) => {
      setLatestFootballEvent(data);
    };

    const onFootballEventUndone = (data) => {
      setLatestUndoEvent(data);
    };

    const onMatchStateUpdated = (data) => {
      setMatchCompletedEvent(data);
    };

    if (socket.connected) {
      setConnected(true);
      joinRoom();
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('FOOTBALL_EVENT_RECORDED', onFootballEventRecorded);
    socket.on('GLOBAL_FOOTBALL_EVENT_RECORDED', onFootballEventRecorded);
    socket.on('FOOTBALL_EVENT_UNDONE', onFootballEventUndone);
    socket.on('GLOBAL_FOOTBALL_EVENT_UNDONE', onFootballEventUndone);
    socket.on('MATCH_STATE_UPDATED', onMatchStateUpdated);

    return () => {
      if (socket) {
        if (matchId) {
          socket.emit('leave_match', matchId);
        }
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('FOOTBALL_EVENT_RECORDED', onFootballEventRecorded);
        socket.off('GLOBAL_FOOTBALL_EVENT_RECORDED', onFootballEventRecorded);
        socket.off('FOOTBALL_EVENT_UNDONE', onFootballEventUndone);
        socket.off('GLOBAL_FOOTBALL_EVENT_UNDONE', onFootballEventUndone);
        socket.off('MATCH_STATE_UPDATED', onMatchStateUpdated);
      }
    };
  }, [matchId]);

  return {
    connected,
    latestFootballEvent,
    latestUndoEvent,
    matchCompletedEvent
  };
}
