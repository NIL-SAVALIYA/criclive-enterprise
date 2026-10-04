import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useFootballSocket } from '../socket/useFootballSocket';
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
  Flag,
  Users
} from 'lucide-react';

export default function FootballLiveMatchCenter({ matchId }) {
  const [searchParams] = useSearchParams();
  const { user, hasRole } = useAuth();

  const queryToken = searchParams.get('token') || searchParams.get('scoringToken') || searchParams.get('accessToken');

  useEffect(() => {
    if (queryToken) {
      sessionStorage.setItem('activeScoringToken', queryToken);
    }
  }, [queryToken]);

  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const { connected, latestFootballEvent, latestUndoEvent, matchCompletedEvent } = useFootballSocket(matchId);

  const fetchFootballState = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get(`/football/matches/${matchId}/state`);
      setMatchData(res.data.data);
    } catch (err) {
      console.error('Failed to fetch Football match state:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to load Football live match.');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchFootballState();
  }, [fetchFootballState]);

  // Real-time WebSocket updates
  useEffect(() => {
    if (latestFootballEvent?.matchState) {
      setMatchData((prev) => {
        if (!prev) return prev;
        const events = prev.events || [];
        const exists = events.some((e) => e.id === latestFootballEvent.event?.id);
        const nextEvents = exists
          ? events
          : latestFootballEvent.event
          ? [...events, latestFootballEvent.event]
          : events;

        return {
          ...prev,
          matchState: latestFootballEvent.matchState,
          events: nextEvents
        };
      });
    }
  }, [latestFootballEvent]);

  useEffect(() => {
    if (latestUndoEvent) {
      fetchFootballState();
    }
  }, [latestUndoEvent, fetchFootballState]);

  useEffect(() => {
    if (matchCompletedEvent) {
      fetchFootballState();
    }
  }, [matchCompletedEvent, fetchFootballState]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-5xl mx-auto">
        <Skeleton className="h-44 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-12 glass-panel rounded-3xl border border-red-500/30 text-center space-y-4 max-w-2xl mx-auto">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Football Match Unavailable</h2>
        <p className="text-xs text-gray-400">{errorMsg}</p>
        <Link
          to="/football"
          className="inline-block px-5 py-2 rounded-xl bg-gray-800 text-white text-xs font-bold hover:bg-gray-700"
        >
          Return to Football Hub
        </Link>
      </div>
    );
  }

  const match = matchData?.match || {};
  const state = matchData?.matchState || {};
  const events = matchData?.events || [];

  const isLive = state.status === 'LIVE' || match.status === 'LIVE';
  const isCompleted = state.status === 'COMPLETED' || match.status === 'COMPLETED';

  const scoringToken = queryToken || match.scoringToken || sessionStorage.getItem('activeScoringToken');
  const canScore = hasRole(['ADMIN', 'ORGANIZER', 'SCORER']) || Boolean(scoringToken);

  // Group events for quick inspection
  const goals = events.filter((e) => e.eventType === 'GOAL');
  const cards = events.filter((e) => e.eventType === 'YELLOW_CARD' || e.eventType === 'RED_CARD');
  const substitutions = events.filter((e) => e.eventType === 'SUBSTITUTION');

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* 1. HERO SCOREBOARD CARD */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-[#0B0F19] to-[#041209] border border-gray-800 p-6 md:p-10 shadow-2xl space-y-6">
        {/* Top Match Metadata Bar */}
        <div className="flex justify-between items-center text-xs text-gray-400 border-b border-gray-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-black rounded-full uppercase text-[10px] tracking-wider flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-ping' : 'bg-gray-400'}`}></span>
              ⚽ {state.status || match.status || 'UPCOMING'}
            </span>
            <span className="font-mono text-gray-400">
              {state.currentHalf === 1 ? '1st Half' : state.currentHalf === 2 ? '2nd Half' : 'Match'} • {state.matchMinute || 0}'
            </span>
          </div>

          <div className="flex items-center gap-3">
            {canScore && (
              <Link
                to={
                  scoringToken
                    ? `/football/score/${encodeURIComponent(scoringToken)}`
                    : `/football/admin/scorer?matchId=${matchId}`
                }
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 shadow glow-emerald transition-all"
                title="Open Football Scoring Console"
              >
                ⚽ Scoring Console
              </Link>
            )}
            <span className="flex items-center gap-1 text-[11px] text-gray-400">
              <MapPin className="w-3.5 h-3.5 text-gray-500" />
              {match.venue || 'Football Stadium'}
            </span>
            <span className="font-mono text-[10px] px-2.5 py-0.5 rounded bg-gray-900 border border-gray-800 text-gray-300">
              {connected ? '🟢 LIVE FEED' : '🟡 RECONNECTING'}
            </span>
          </div>
        </div>

        {/* Big Match Score Display */}
        <div className="grid grid-cols-3 items-center py-6 text-center">
          <div className="space-y-1.5 text-right pr-4 md:pr-8">
            <div className="text-xl md:text-3xl font-black text-white">{match.teamA?.name || 'Home Club'}</div>
            <div className="text-xs text-emerald-400 font-bold font-mono tracking-wider">HOME</div>
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className="text-4xl md:text-7xl font-black text-white font-mono tracking-tight flex items-center gap-4 bg-gray-950/90 border border-emerald-500/30 px-6 md:px-10 py-3 rounded-3xl shadow-2xl glow-emerald">
              <span className="text-emerald-400">{state.homeScore ?? 0}</span>
              <span className="text-gray-600">-</span>
              <span className="text-emerald-400">{state.awayScore ?? 0}</span>
            </div>
            {match.result && (
              <span className="text-xs text-amber-300 font-extrabold mt-3 bg-amber-950/60 border border-amber-500/30 px-4 py-1 rounded-full shadow-md">
                🏆 {match.result}
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-left pl-4 md:pr-8">
            <div className="text-xl md:text-3xl font-black text-white">{match.teamB?.name || 'Away Club'}</div>
            <div className="text-xs text-emerald-400 font-bold font-mono tracking-wider">AWAY</div>
          </div>
        </div>

        {/* Goal Highlights Strip */}
        {goals.length > 0 && (
          <div className="pt-4 border-t border-gray-800/80 flex flex-wrap justify-between items-center gap-4 text-xs">
            <div className="space-y-1">
              {goals
                .filter((g) => g.teamId === match.teamA?.id)
                .map((g) => (
                  <div key={g.id} className="text-emerald-300 font-medium flex items-center gap-1.5">
                    <span>⚽ {g.detail || 'Goal'}</span>
                    <span className="font-mono font-bold text-gray-400">{g.minute}'</span>
                  </div>
                ))}
            </div>

            <div className="space-y-1 text-right">
              {goals
                .filter((g) => g.teamId === match.teamB?.id)
                .map((g) => (
                  <div key={g.id} className="text-emerald-300 font-medium flex items-center justify-end gap-1.5">
                    <span className="font-mono font-bold text-gray-400">{g.minute}'</span>
                    <span>⚽ {g.detail || 'Goal'}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. MATCH STATS SNAPSHOT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-gray-800 text-center space-y-1">
          <div className="text-xs text-gray-400 font-bold uppercase">Total Goals</div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {(state.homeScore || 0) + (state.awayScore || 0)}
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-gray-800 text-center space-y-1">
          <div className="text-xs text-gray-400 font-bold uppercase">Cards</div>
          <div className="text-2xl font-black text-amber-400 font-mono">{cards.length}</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-gray-800 text-center space-y-1">
          <div className="text-xs text-gray-400 font-bold uppercase">Substitutions</div>
          <div className="text-2xl font-black text-blue-400 font-mono">{substitutions.length}</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-gray-800 text-center space-y-1">
          <div className="text-xs text-gray-400 font-bold uppercase">Match Phase</div>
          <div className="text-lg font-black text-white font-mono mt-1">
            {isCompleted ? 'Full Time' : state.currentHalf === 2 ? '2nd Half' : '1st Half'}
          </div>
        </div>
      </div>

      {/* 3. EVENT TIMELINE FEED */}
      <div className="glass-panel p-6 md:p-8 rounded-3xl border border-gray-800 space-y-4">
        <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" /> Match Timeline & Play-by-Play Feed
        </h3>

        {events.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500">
            No events recorded yet. Match updates will stream here in real time.
          </div>
        ) : (
          <div className="relative border-l-2 border-gray-800 ml-4 pl-6 space-y-4 my-4">
            {[...events].reverse().map((ev) => {
              const isHomeTeam = ev.teamId === match.teamA?.id;
              const teamName = isHomeTeam
                ? match.teamA?.name || 'Home'
                : ev.teamId === match.teamB?.id
                ? match.teamB?.name || 'Away'
                : '';

              let icon = '⏱️';
              let badgeColor = 'bg-gray-800/80 border-gray-700 text-gray-200';

              if (ev.eventType === 'GOAL') {
                icon = '⚽';
                badgeColor = 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-md glow-emerald';
              } else if (ev.eventType === 'YELLOW_CARD') {
                icon = '🟨';
                badgeColor = 'bg-amber-950/80 border-amber-500/50 text-amber-300';
              } else if (ev.eventType === 'RED_CARD') {
                icon = '🟥';
                badgeColor = 'bg-red-950/80 border-red-500/50 text-red-300';
              } else if (ev.eventType === 'SUBSTITUTION') {
                icon = '🔄';
                badgeColor = 'bg-blue-950/80 border-blue-500/50 text-blue-300';
              } else if (ev.eventType === 'PENALTY') {
                icon = '🎯';
                badgeColor = 'bg-purple-950/80 border-purple-500/50 text-purple-300';
              }

              return (
                <div key={ev.id} className="relative group">
                  {/* Timeline dot */}
                  <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-gray-900 group-hover:scale-125 transition-transform" />

                  <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-4 ${badgeColor}`}>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-sm w-9">{ev.minute}'</span>
                      <span className="text-xl">{icon}</span>
                      <div className="space-y-0.5">
                        <div className="font-bold flex items-center gap-2 text-sm">
                          <span>{ev.eventType}</span>
                          {teamName && <span className="text-xs font-normal opacity-75">({teamName})</span>}
                        </div>
                        {ev.detail && <div className="text-xs opacity-80">{ev.detail}</div>}
                      </div>
                    </div>

                    <span className="text-[10px] font-mono opacity-50 shrink-0">
                      {new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
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
