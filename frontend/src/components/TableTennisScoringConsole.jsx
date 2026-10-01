import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useTableTennisSocket } from '../socket/useTableTennisSocket';
import Skeleton from './Skeleton';
import {
  Trophy,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Undo2,
  Users,
  ShieldCheck,
  MapPin,
  Clock,
  Radio
} from 'lucide-react';

export default function TableTennisScoringConsole({ matchId, token: propToken }) {
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get('token') || searchParams.get('scoringToken') || searchParams.get('accessToken');
  const activeToken = propToken || queryToken || sessionStorage.getItem('activeScoringToken') || '';

  useEffect(() => {
    if (activeToken) {
      sessionStorage.setItem('activeScoringToken', activeToken);
    }
  }, [activeToken]);

  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

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
      console.error('Failed to fetch Table Tennis scoring state:', err);
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

  async function handleAddPoint(scoringTeamId) {
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.post(`/table-tennis/matches/${matchId}/point`, {
        scoringTeamId,
        commentary: 'Point scored'
      }, {
        headers: { 'x-scoring-token': activeToken }
      });

      const updated = res.data.data;
      setMatchData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          matchState: updated.matchState
        };
      });
      setSuccessMsg('Point recorded!');
    } catch (err) {
      console.error('Failed to record point:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to record point.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUndoPoint() {
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.post(`/table-tennis/matches/${matchId}/undo`, {}, {
        headers: { 'x-scoring-token': activeToken }
      });
      const updated = res.data.data;
      setMatchData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          matchState: updated.matchState
        };
      });
      setSuccessMsg('Last point undone successfully.');
    } catch (err) {
      console.error('Failed to undo point:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to undo point.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (errorMsg && !matchData) {
    return (
      <div className="glass-panel p-8 text-center space-y-4 rounded-2xl border border-red-500/30">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-bold text-gray-200">Scoring Console Unavailable</h2>
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
  
  const teamA = match?.teamA || { name: 'Team A', shortName: 'TMA' };
  const teamB = match?.teamB || { name: 'Team B', shortName: 'TMB' };

  const gamesA = matchState?.teamAGamesWon || 0;
  const gamesB = matchState?.teamBGamesWon || 0;

  const currentGame = matchState?.games?.find(g => g.gameNumber === matchState.currentGameNumber) || { teamAScore: 0, teamBScore: 0 };
  const scoreA = currentGame.teamAScore;
  const scoreB = currentGame.teamBScore;

  const getPlayerName = (id) => {
    if (!id) return 'Unknown';
    const player = [...teamAPlayers, ...teamBPlayers].find(p => p.id === id);
    return player ? `${player.firstName} ${player.lastName}`.trim() : 'Player';
  };

  const isDeuce = scoreA >= 10 && scoreB >= 10 && Math.abs(scoreA - scoreB) < 2;

  const canUndo = matchState?.games?.some(g => g.points?.length > 0) || false;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800 bg-gradient-to-r from-gray-900 via-gray-950 to-gray-900 shadow-2xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-800/80">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              🏓 {matchState?.format === 'DOUBLES' ? 'DOUBLES' : 'SINGLES'} • BEST OF {matchState?.bestOf}
            </span>
            {matchState?.status === 'LIVE' && (
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
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Sync
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

        {/* Messages */}
        {(errorMsg || successMsg) && (
          <div className={`mt-3 p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${errorMsg ? 'bg-red-950/40 text-red-400 border border-red-500/30' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30'}`}>
            {errorMsg ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {errorMsg || successMsg}
          </div>
        )}
      </div>

      {/* Main Scoreboard */}
      <div className="glass-panel p-6 rounded-3xl border border-indigo-500/20 bg-gray-950 shadow-2xl relative">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-6 items-center">
          {/* Side A Team */}
          <div className="md:col-span-2 text-center md:text-left space-y-2">
            <h2 className="text-xl font-extrabold text-white tracking-tight">{teamA.name}</h2>
            <span className="text-sm font-semibold text-indigo-400">Games Won: {gamesA}</span>
          </div>

          {/* Scores */}
          <div className="md:col-span-3 text-center space-y-3">
            <div className="text-sm font-bold text-gray-400 uppercase tracking-widest bg-gray-900/60 py-1.5 px-4 rounded-full inline-block border border-gray-800">
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
          <div className="md:col-span-2 text-center md:text-right space-y-2">
            <h2 className="text-xl font-extrabold text-white tracking-tight">{teamB.name}</h2>
            <span className="text-sm font-semibold text-fuchsia-400">Games Won: {gamesB}</span>
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

      {/* Action Scoring Buttons */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleAddPoint(teamA.id)}
            disabled={isCompleted || submitting}
            className={`w-full py-6 px-4 rounded-2xl font-black text-lg shadow-xl transition-all flex flex-col items-center justify-center gap-1 ${
              isCompleted || submitting
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-900/40 glow-indigo active:scale-98'
            }`}
          >
            <span className="text-xs uppercase tracking-wider opacity-80">+1 Point</span>
            <span>{teamA.name}</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddPoint(teamB.id)}
            disabled={isCompleted || submitting}
            className={`w-full py-6 px-4 rounded-2xl font-black text-lg shadow-xl transition-all flex flex-col items-center justify-center gap-1 ${
              isCompleted || submitting
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                : 'bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 hover:from-fuchsia-500 hover:to-fuchsia-400 text-white shadow-fuchsia-900/40 glow-fuchsia active:scale-98'
            }`}
          >
            <span className="text-xs uppercase tracking-wider opacity-80">+1 Point</span>
            <span>{teamB.name}</span>
          </button>
        </div>

        {/* Additional Controls */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleUndoPoint}
            disabled={isCompleted || submitting || !canUndo}
            className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors ${
              isCompleted || submitting || !canUndo
                ? 'bg-gray-900 text-gray-600 cursor-not-allowed border border-gray-800'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700'
            }`}
          >
            <Undo2 className="w-4 h-4" />
            Undo Last Point
          </button>
        </div>
      </div>
    </div>
  );
}
