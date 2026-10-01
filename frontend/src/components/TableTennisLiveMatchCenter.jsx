import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import { useTableTennisSocket } from '../socket/useTableTennisSocket';
import Skeleton from './Skeleton';
import { Trophy, Activity, Radio, Clock, MapPin, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';

export default function TableTennisLiveMatchCenter({ matchId }) {
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  
  const [teamAPlayers, setTeamAPlayers] = useState([]);
  const [teamBPlayers, setTeamBPlayers] = useState([]);

  const { connected, latestPointEvent, latestUndoEvent, matchUpdatedEvent } = useTableTennisSocket(matchId);

  const fetchTableTennisState = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get(`/table-tennis/matches/${matchId}/state`);
      const data = res.data.data;
      setMatchData(data);

      if (data?.match?.teamA?.id) {
        api.get('/players', { params: { teamId: data.match.teamA.id } })
          .then((r) => setTeamAPlayers(r.data.data || []))
          .catch(() => setTeamAPlayers([]));
      }
      if (data?.match?.teamB?.id) {
        api.get('/players', { params: { teamId: data.match.teamB.id } })
          .then((r) => setTeamBPlayers(r.data.data || []))
          .catch(() => setTeamBPlayers([]));
      }
    } catch (err) {
      console.error('Failed to fetch Table Tennis match state:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to load Table Tennis match state.');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchTableTennisState();
  }, [fetchTableTennisState]);

  // Real-time WebSocket updates
  useEffect(() => {
    if (latestPointEvent?.updatedState) {
      setMatchData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          matchState: latestPointEvent.updatedState
        };
      });
    }
  }, [latestPointEvent]);

  useEffect(() => {
    if (latestUndoEvent?.revertedState) {
      setMatchData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          matchState: latestUndoEvent.revertedState
        };
      });
    }
  }, [latestUndoEvent]);

  useEffect(() => {
    if (matchUpdatedEvent) {
      fetchTableTennisState();
    }
  }, [matchUpdatedEvent, fetchTableTennisState]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="glass-panel p-8 text-center space-y-4 rounded-2xl border border-red-500/30">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-bold text-gray-200">Unable to Load Table Tennis Match</h2>
        <p className="text-sm text-gray-400">{errorMsg}</p>
        <button
          onClick={fetchTableTennisState}
          className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const { match, matchState } = matchData || {};
  const isCompleted = matchState?.status === 'COMPLETED' || match?.status === 'COMPLETED';
  const isLive = matchState?.status === 'LIVE' || match?.status === 'LIVE';

  const teamA = match?.teamA || { name: 'Team A', shortName: 'TMA' };
  const teamB = match?.teamB || { name: 'Team B', shortName: 'TMB' };

  const gamesA = matchState?.teamAGamesWon || 0;
  const gamesB = matchState?.teamBGamesWon || 0;

  const currentGame = matchState?.games?.find(g => g.gameNumber === matchState.currentGameNumber) || { teamAScore: 0, teamBScore: 0 };
  const scoreA = currentGame.teamAScore;
  const scoreB = currentGame.teamBScore;
  const isDeuce = scoreA >= 10 && scoreB >= 10 && Math.abs(scoreA - scoreB) < 2;

  const getPlayerName = (id) => {
    if (!id) return 'Unknown';
    const player = [...teamAPlayers, ...teamBPlayers].find(p => p.id === id);
    return player ? `${player.firstName} ${player.lastName}`.trim() : 'Player';
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800 bg-gradient-to-r from-gray-900 via-gray-950 to-gray-900 shadow-2xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-800/80">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              🏓 {matchState?.format === 'DOUBLES' ? 'DOUBLES' : 'SINGLES'} • BEST OF {matchState?.bestOf}
            </span>
            {isLive && (
              <span className="px-2.5 py-1 rounded-lg bg-red-950/90 border border-red-500/50 text-red-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                <Radio className="w-3 h-3 text-red-400" /> LIVE
              </span>
            )}
            {isCompleted && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> COMPLETED
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-400">
            {connected ? (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Live Sync
              </span>
            ) : (
              <span className="text-[11px] text-gray-500">Connecting...</span>
            )}
            <button
              onClick={fetchTableTennisState}
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
              title="Refresh Score"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Match Location & Venue */}
        <div className="pt-3 flex flex-wrap items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
            <span>{match?.venue || 'Indoor Table Tennis Arena'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            <span>{match?.matchDate ? new Date(match.matchDate).toLocaleString() : 'Scheduled'}</span>
          </div>
        </div>
      </div>

      {/* Main Scoreboard Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-indigo-500/20 bg-gray-950 shadow-2xl relative">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-6 items-center">
          {/* Side A Team */}
          <div className="md:col-span-2 text-center md:text-left space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white font-black text-2xl shadow-xl glow-indigo">
              {teamA.shortName?.slice(0, 2) || 'A'}
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight">{teamA.name}</h2>
              <span className="text-xs font-semibold text-indigo-400">Games Won: {gamesA}</span>
            </div>
          </div>

          {/* Scores & Status (Center) */}
          <div className="md:col-span-3 text-center space-y-3">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-900/60 py-1.5 px-4 rounded-full border border-gray-800 inline-block shadow-inner">
              GAME {matchState?.currentGameNumber}
            </div>
            
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto items-center py-2">
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30">
                <span className="text-6xl font-black text-indigo-400 tracking-tight">{scoreA}</span>
              </div>
              <div className="p-4 rounded-2xl bg-fuchsia-950/40 border border-fuchsia-500/30">
                <span className="text-6xl font-black text-fuchsia-400 tracking-tight">{scoreB}</span>
              </div>
            </div>

            {isDeuce && (
              <div className="inline-block mt-2 px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full font-bold text-xs tracking-wider animate-pulse">
                DEUCE
              </div>
            )}
          </div>

          {/* Side B Team */}
          <div className="md:col-span-2 text-center md:text-right space-y-2 flex flex-col md:items-end">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-fuchsia-400 text-white font-black text-2xl shadow-xl glow-fuchsia">
              {teamB.shortName?.slice(0, 2) || 'B'}
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight">{teamB.name}</h2>
              <span className="text-xs font-semibold text-fuchsia-400">Games Won: {gamesB}</span>
            </div>
          </div>
        </div>

        {/* Server / Receiver display */}
        <div className="mt-6 pt-4 border-t border-gray-800 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800 flex items-center justify-between">
                <div>
                    <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Current Server</div>
                    <div className="font-semibold text-emerald-400">{getPlayerName(matchState?.currentServerId)}</div>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-400 glow-emerald"></div>
            </div>
            <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800 flex items-center justify-between">
                <div>
                    <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Current Receiver</div>
                    <div className="font-semibold text-gray-300">{getPlayerName(matchState?.currentReceiverId)}</div>
                </div>
            </div>
        </div>

        {/* Match Completed overlay notice */}
        {isCompleted && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-sm font-black shadow-2xl text-center">
            🏆 MATCH COMPLETED — Winner: {gamesA > gamesB ? teamA.name : teamB.name}
          </div>
        )}
      </div>

      {/* Completed Games Ledger */}
      {matchState?.games?.filter(g => g.status === 'COMPLETED').length > 0 && (
        <div className="glass-panel p-6 rounded-3xl border border-gray-800">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" /> Completed Games History
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {matchState.games.filter(g => g.status === 'COMPLETED').sort((a,b) => a.gameNumber - b.gameNumber).map(game => (
                    <div key={game.id} className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 flex justify-between items-center">
                        <div className="text-xs font-bold text-gray-400">GAME {game.gameNumber}</div>
                        <div className="flex gap-3 text-sm font-black">
                            <span className={game.teamAScore > game.teamBScore ? 'text-indigo-400' : 'text-gray-500'}>{game.teamAScore}</span>
                            <span className="text-gray-600">-</span>
                            <span className={game.teamBScore > game.teamAScore ? 'text-fuchsia-400' : 'text-gray-500'}>{game.teamBScore}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}
      
      {/* Point Timeline Ledger */}
      {currentGame?.points?.length > 0 && (
        <div className="glass-panel p-6 rounded-3xl border border-gray-800">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" /> Recent Points (Game {matchState?.currentGameNumber})
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {/* Points are usually appended, we want reverse chronological */}
                {[...currentGame.points].reverse().map(point => {
                    const isTeamA = point.scoringTeamId === teamA.id;
                    const scorerName = isTeamA ? teamA.name : teamB.name;
                    return (
                        <div key={point.id} className="p-3 rounded-xl bg-gray-900/40 border border-gray-800/60 flex flex-wrap justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="text-[10px] font-mono text-gray-500">PT {point.pointNumber}</div>
                                <div>
                                    <span className="text-xs font-semibold text-gray-300">{scorerName} scored</span>
                                    {(point.isGamePoint || point.isMatchPoint) && (
                                        <span className="ml-2 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                            {point.isMatchPoint ? 'MATCH POINT' : 'GAME POINT'}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-xs text-gray-500 font-mono">
                                    Server: {getPlayerName(point.serverId)} • Receiver: {getPlayerName(point.receiverId)}
                                </div>
                                <div className="text-sm font-black bg-gray-950 px-3 py-1 rounded-lg border border-gray-800">
                                    <span className={isTeamA ? 'text-indigo-400' : 'text-gray-400'}>{point.scoreTeamA}</span>
                                    <span className="mx-1 text-gray-600">-</span>
                                    <span className={!isTeamA ? 'text-fuchsia-400' : 'text-gray-400'}>{point.scoreTeamB}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      )}
    </div>
  );
}
