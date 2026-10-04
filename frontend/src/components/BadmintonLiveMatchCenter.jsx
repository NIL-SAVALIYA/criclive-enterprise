import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useBadmintonSocket } from '../socket/useBadmintonSocket';
import Skeleton from './Skeleton';
import {
  Trophy,
  Activity,
  Radio,
  Clock,
  MapPin,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Zap,
  RotateCcw
} from 'lucide-react';

export default function BadmintonLiveMatchCenter({ matchId }) {
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const { connected, latestPointEvent, latestUndoEvent, matchCompletedEvent } = useBadmintonSocket(matchId);

  useEffect(() => {
    fetchBadmintonState();
  }, [matchId]);

  // Real-time WebSocket update listener
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
      console.error('Failed to fetch Badminton match state:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to load Badminton match state.');
    } finally {
      setLoading(false);
    }
  }

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
        <h2 className="text-xl font-bold text-gray-200">Unable to Load Badminton Match</h2>
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
  const isLive = matchState?.status === 'LIVE' || match?.status === 'LIVE';

  const teamA = match?.teamA || { name: 'Team A', shortName: 'TMA' };
  const teamB = match?.teamB || { name: 'Team B', shortName: 'TMB' };

  const game1A = matchState?.teamAPointsGame1 ?? 0;
  const game1B = matchState?.teamBPointsGame1 ?? 0;
  const game2A = matchState?.teamAPointsGame2 ?? 0;
  const game2B = matchState?.teamBPointsGame2 ?? 0;
  const game3A = matchState?.teamAPointsGame3 ?? 0;
  const game3B = matchState?.teamBPointsGame3 ?? 0;

  const setsWonA = matchState?.teamASetsWon ?? 0;
  const setsWonB = matchState?.teamBSetsWon ?? 0;

  const pointsList = matchState?.points || [];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800 bg-gradient-to-r from-gray-900 via-gray-950 to-gray-900 shadow-2xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-800/80">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-teal-950/80 border border-teal-500/40 text-teal-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              🏸 BADMINTON MATCH
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
              onClick={fetchBadmintonState}
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
            <MapPin className="w-3.5 h-3.5 text-teal-400" />
            <span>{match?.venue || 'Indoor Badminton Court'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            <span>{match?.matchDate ? new Date(match.matchDate).toLocaleString() : 'Scheduled'}</span>
          </div>
        </div>
      </div>

      {/* Main Scoreboard Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-teal-500/20 bg-gray-950 shadow-2xl relative">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-6 items-center">
          {/* Side A Team */}
          <div className="md:col-span-2 text-center md:text-left space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-400 text-white font-black text-2xl shadow-xl glow-emerald">
              {teamA.shortName?.slice(0, 2) || 'A'}
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight">{teamA.name}</h2>
              <span className="text-xs font-semibold text-teal-400">Sets Won: {setsWonA}</span>
            </div>
          </div>

          {/* Big Score Display */}
          <div className="md:col-span-3 text-center space-y-4 py-2 border-y md:border-y-0 md:border-x border-gray-800 px-4">
            <div className="inline-block px-3 py-1 rounded-full bg-gray-900 border border-gray-700 text-xs font-bold text-gray-300 uppercase tracking-widest">
              Game {matchState?.currentGame || 1} of 3
            </div>

            {/* Games Table */}
            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto text-center">
              <div className={`p-2.5 rounded-xl border ${matchState?.currentGame === 1 ? 'bg-teal-950/80 border-teal-500/60 ring-1 ring-teal-400/50' : 'bg-gray-900/60 border-gray-800'}`}>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Game 1</div>
                <div className="text-lg font-black text-white">{game1A} - {game1B}</div>
              </div>

              <div className={`p-2.5 rounded-xl border ${matchState?.currentGame === 2 ? 'bg-teal-950/80 border-teal-500/60 ring-1 ring-teal-400/50' : 'bg-gray-900/60 border-gray-800'}`}>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Game 2</div>
                <div className="text-lg font-black text-white">{game2A} - {game2B}</div>
              </div>

              <div className={`p-2.5 rounded-xl border ${matchState?.currentGame === 3 ? 'bg-teal-950/80 border-teal-500/60 ring-1 ring-teal-400/50' : 'bg-gray-900/60 border-gray-800'}`}>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Game 3</div>
                <div className="text-lg font-black text-white">{game3A} - {game3B}</div>
              </div>
            </div>

            {/* Match Winner Banner */}
            {isCompleted && (
              <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-950 to-emerald-950 border border-emerald-500/50 text-emerald-300 text-xs font-black shadow-lg animate-fadeIn">
                🏆 MATCH COMPLETED — Winner: {setsWonA > setsWonB ? teamA.name : teamB.name} ({setsWonA}-{setsWonB})
              </div>
            )}
          </div>

          {/* Side B Team */}
          <div className="md:col-span-2 text-center md:text-right space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-400 text-white font-black text-2xl shadow-xl glow-cyan">
              {teamB.shortName?.slice(0, 2) || 'B'}
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight">{teamB.name}</h2>
              <span className="text-xs font-semibold text-cyan-400">Sets Won: {setsWonB}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Point-by-Point Live Feed */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-4">
        <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4 text-teal-400" /> Live Rally Feed & Score Log
        </h3>

        {pointsList.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500 bg-gray-900/40 rounded-xl border border-gray-800/80">
            No rally points recorded yet. Live rally commentary will appear here when play starts.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {pointsList.map((pt, idx) => {
              const isTeamA = pt.scoringTeamId === teamA.id;
              return (
                <div
                  key={pt.id || idx}
                  className="p-3 rounded-xl bg-gray-900/80 border border-gray-800/80 flex items-center justify-between text-xs transition-all hover:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 rounded-md bg-gray-800 text-[10px] font-black text-gray-300">
                      G{pt.gameNumber} • R{pt.rallyNumber}
                    </span>
                    <span className={`font-bold ${isTeamA ? 'text-teal-400' : 'text-cyan-400'}`}>
                      {isTeamA ? teamA.name : teamB.name}
                    </span>
                    <span className="text-gray-400 hidden sm:inline">{pt.commentary || 'Point scored'}</span>
                  </div>

                  <div className="font-extrabold text-white bg-gray-950 px-3 py-1 rounded-lg border border-gray-800">
                    {pt.scoreTeamA} - {pt.scoreTeamB}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
