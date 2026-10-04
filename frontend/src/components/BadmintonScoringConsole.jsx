import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useBadmintonSocket } from '../socket/useBadmintonSocket';
import Skeleton from './Skeleton';
import {
  Trophy,
  Plus,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Radio,
  RefreshCw,
  Zap,
  ShieldCheck
} from 'lucide-react';

export default function BadmintonScoringConsole({ matchId }) {
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [commentaryText, setCommentaryText] = useState('');

  const { connected, latestPointEvent, latestUndoEvent, matchCompletedEvent } = useBadmintonSocket(matchId);

  useEffect(() => {
    fetchBadmintonState();
  }, [matchId]);

  // Real-time updates from WebSocket
  useEffect(() => {
    if (latestPointEvent?.updatedState) {
      setMatchData((prev) => {
        if (!prev) return prev;
        const points = prev.matchState?.points || [];
        const exists = points.some(p => p.id === latestPointEvent.pointRecord?.id);
        const newPoints = exists
          ? points
          : (latestPointEvent.pointRecord ? [latestPointEvent.pointRecord, ...points] : points);

        return {
          ...prev,
          matchState: {
            ...latestPointEvent.updatedState,
            points: newPoints
          }
        };
      });
    }
  }, [latestPointEvent]);

  // Real-time WebSocket undo update listener
  useEffect(() => {
    if (latestUndoEvent?.revertedState) {
      setMatchData((prev) => {
        if (!prev) return prev;
        const points = prev.matchState?.points || [];
        const newPoints = points.filter(p => p.id !== latestUndoEvent.undonePointId);

        return {
          ...prev,
          matchState: {
            ...latestUndoEvent.revertedState,
            points: newPoints
          }
        };
      });
    }
  }, [latestUndoEvent]);

  useEffect(() => {
    if (matchCompletedEvent) {
      fetchBadmintonState();
    }
  }, [matchCompletedEvent]);

  async function fetchBadmintonState() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get(`/badminton/matches/${matchId}/state`);
      setMatchData(res.data.data);
    } catch (err) {
      console.error('Failed to fetch Badminton scoring state:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to load Badminton match state.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPoint(scoringTeamId) {
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.post(`/badminton/matches/${matchId}/points`, {
        scoringTeamId,
        commentary: commentaryText.trim() || undefined
      });

      const updated = res.data.data;
      setMatchData((prev) => {
        if (!prev) return prev;
        const points = prev.matchState?.points || [];
        const exists = points.some(p => p.id === updated.point?.id);
        const newPoints = exists
          ? points
          : (updated.point ? [updated.point, ...points] : points);
        return {
          ...prev,
          matchState: {
            ...updated.matchState,
            points: newPoints
          }
        };
      });
      setCommentaryText('');

      if (updated.isMatchWon) {
        setSuccessMsg(`🏆 MATCH COMPLETED! Winner declared.`);
      } else if (updated.isGameWon) {
        setSuccessMsg(`🎉 Game completed! Moving to Game ${updated.matchState.currentGame}`);
      } else {
        setSuccessMsg('Point recorded!');
      }
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
      const res = await api.post(`/badminton/matches/${matchId}/undo`);
      const updated = res.data.data;
      setMatchData((prev) => {
        if (!prev) return prev;
        const points = prev.matchState?.points || [];
        const newPoints = points.filter(p => p.id !== updated.undonePointId);
        return {
          ...prev,
          matchState: {
            ...updated.matchState,
            points: newPoints
          }
        };
      });
      setSuccessMsg('Last rally point undone successfully.');
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
          onClick={fetchBadmintonState}
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

  const currentGame = matchState?.currentGame || 1;
  const gameKeyA = `teamAPointsGame${currentGame}`;
  const gameKeyB = `teamBPointsGame${currentGame}`;

  const ptsA = matchState?.[gameKeyA] ?? 0;
  const ptsB = matchState?.[gameKeyB] ?? 0;

  const setsWonA = matchState?.teamASetsWon ?? 0;
  const setsWonB = matchState?.teamBSetsWon ?? 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Title */}
      <div className="glass-panel p-5 rounded-2xl border border-teal-500/30 bg-gradient-to-r from-gray-900 via-gray-950 to-gray-900 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-1 rounded-md bg-teal-950 border border-teal-500/40 text-teal-400 text-[10px] font-black uppercase tracking-wider">
            🏸 BADMINTON SCORING CONSOLE
          </span>
          <h1 className="text-xl font-black text-white mt-1">
            {teamA.name} vs {teamB.name}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {connected && (
            <span className="px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Realtime Scorer Sync
            </span>
          )}
        </div>
      </div>

      {/* Notifications Banner */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Score Summary Box */}
      <div className="glass-panel p-6 rounded-3xl border border-gray-800 bg-gray-950 text-center space-y-4">
        <div className="inline-block px-3 py-1 rounded-full bg-gray-900 border border-gray-700 text-xs font-extrabold text-teal-400 uppercase tracking-widest">
          Game {currentGame} in Progress • Sets: {teamA.shortName} ({setsWonA}) - ({setsWonB}) {teamB.shortName}
        </div>

        {/* Big Live Points Counter */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto items-center py-2">
          <div className="p-4 rounded-2xl bg-teal-950/40 border border-teal-500/30">
            <span className="block text-xs font-bold text-gray-400 uppercase">{teamA.name}</span>
            <span className="text-5xl font-black text-teal-400 tracking-tight">{ptsA}</span>
          </div>

          <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30">
            <span className="block text-xs font-bold text-gray-400 uppercase">{teamB.name}</span>
            <span className="text-5xl font-black text-cyan-400 tracking-tight">{ptsB}</span>
          </div>
        </div>

        {/* Match Completed overlay notice */}
        {isCompleted && (
          <div className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-sm font-black shadow-2xl">
            🏆 MATCH COMPLETED — Winner: {setsWonA > setsWonB ? teamA.name : teamB.name}
          </div>
        )}
      </div>

      {/* Action Scoring Buttons */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Side A Point Button */}
          <button
            type="button"
            onClick={() => handleAddPoint(teamA.id)}
            disabled={isCompleted || submitting}
            className={`w-full py-6 px-4 rounded-2xl font-black text-lg shadow-xl transition-all flex flex-col items-center justify-center gap-1 ${
              isCompleted || submitting
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                : 'bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white shadow-teal-900/40 glow-emerald active:scale-98'
            }`}
          >
            <span className="text-xs uppercase tracking-wider opacity-80">+1 Rally Point</span>
            <span>{teamA.name}</span>
          </button>

          {/* Side B Point Button */}
          <button
            type="button"
            onClick={() => handleAddPoint(teamB.id)}
            disabled={isCompleted || submitting}
            className={`w-full py-6 px-4 rounded-2xl font-black text-lg shadow-xl transition-all flex flex-col items-center justify-center gap-1 ${
              isCompleted || submitting
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                : 'bg-gradient-to-r from-cyan-600 to-blue-500 hover:from-cyan-500 hover:to-blue-400 text-white shadow-cyan-900/40 glow-cyan active:scale-98'
            }`}
          >
            <span className="text-xs uppercase tracking-wider opacity-80">+1 Rally Point</span>
            <span>{teamB.name}</span>
          </button>
        </div>

        {/* Commentary Input */}
        <div className="glass-panel p-4 rounded-2xl border border-gray-800 space-y-2">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
            Rally Commentary (Optional)
          </label>
          <input
            type="text"
            value={commentaryText}
            onChange={(e) => setCommentaryText(e.target.value)}
            disabled={isCompleted || submitting}
            placeholder="e.g. Sharp smash down the line by player!"
            className="w-full px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* Undo Control Button */}
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={handleUndoPoint}
            disabled={submitting || (matchState?.points?.length || 0) === 0}
            className={`px-6 py-3 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-md ${
              submitting || (matchState?.points?.length || 0) === 0
                ? 'bg-gray-900 text-gray-600 border border-gray-800 cursor-not-allowed'
                : 'bg-gray-800 hover:bg-gray-700 text-amber-400 border border-amber-500/40 hover:border-amber-500/80 active:scale-98'
            }`}
          >
            <RotateCcw className="w-4 h-4" /> Undo Last Rally Point
          </button>
        </div>
      </div>
    </div>
  );
}
