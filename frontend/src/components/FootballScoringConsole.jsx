import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import { useFootballSocket } from '../socket/useFootballSocket';
import Skeleton from './Skeleton';
import {
  Trophy,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Play,
  Clock,
  ShieldCheck,
  Users,
  ChevronRight,
  Flame,
  ArrowRight,
  Flag,
  Loader2
} from 'lucide-react';

export default function FootballScoringConsole({ matchId }) {
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Active Event Form Tab: 'GOAL' | 'CARD' | 'SUB' | 'PENALTY' | 'KICKOFF'
  const [activeTab, setActiveTab] = useState('GOAL');

  // Squad Players
  const [homePlayers, setHomePlayers] = useState([]);
  const [awayPlayers, setAwayPlayers] = useState([]);

  // Form States
  const [eventTeamId, setEventTeamId] = useState('');
  const [eventMinute, setEventMinute] = useState(0);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [secondaryPlayerId, setSecondaryPlayerId] = useState('');
  const [eventDetail, setEventDetail] = useState('');
  const [cardType, setCardType] = useState('YELLOW_CARD');
  const [penaltyScored, setPenaltyScored] = useState(true);

  const { connected, latestFootballEvent, latestUndoEvent, matchCompletedEvent } = useFootballSocket(matchId);

  const fetchFootballState = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get(`/football/matches/${matchId}/state`);
      const data = res.data.data;
      setMatchData(data);

      if (data?.match?.teamA?.id && !eventTeamId) {
        setEventTeamId(data.match.teamA.id);
      }

      if (data?.matchState?.matchMinute !== undefined) {
        setEventMinute(data.matchState.matchMinute);
      }

      // Fetch squads for player dropdowns
      if (data?.match?.teamA?.id) {
        api.get('/players', { params: { teamId: data.match.teamA.id } })
          .then((r) => setHomePlayers(r.data.data || []))
          .catch(() => setHomePlayers([]));
      }
      if (data?.match?.teamB?.id) {
        api.get('/players', { params: { teamId: data.match.teamB.id } })
          .then((r) => setAwayPlayers(r.data.data || []))
          .catch(() => setAwayPlayers([]));
      }
    } catch (err) {
      console.error('Failed to fetch Football scoring state:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to load Football match state.');
    } finally {
      setLoading(false);
    }
  }, [matchId, eventTeamId]);

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

  const match = matchData?.match || {};
  const state = matchData?.matchState || {};
  const events = matchData?.events || [];

  const isLive = state.status === 'LIVE' || match.status === 'LIVE';
  const isCompleted = state.status === 'COMPLETED' || match.status === 'COMPLETED';

  // Active team player options
  const activePlayers = eventTeamId === match.teamB?.id ? awayPlayers : homePlayers;

  // Clear feedback messages after 4 seconds
  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg(null);
        setErrorMsg(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, errorMsg]);

  // Match Control Handlers
  async function handleStartMatch() {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.post(`/football/matches/${matchId}/start`, {
        kickoffTeamId: match.teamA?.id
      });
      setMatchData((prev) => ({
        ...prev,
        match: res.data.data.match,
        matchState: res.data.data.matchState,
        events: res.data.data.events
      }));
      setSuccessMsg('Match kicked off successfully!');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to start Football match.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleHalfTime() {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.post(`/football/matches/${matchId}/half-time`, {
        minute: Number(eventMinute) || 45
      });
      setMatchData((prev) => ({
        ...prev,
        matchState: res.data.data.matchState,
        events: res.data.data.events
      }));
      setSuccessMsg('Half-time whistle recorded!');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to record half-time.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSecondHalf() {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.post(`/football/matches/${matchId}/second-half`, {
        minute: Number(eventMinute) || 45
      });
      setMatchData((prev) => ({
        ...prev,
        matchState: res.data.data.matchState,
        events: res.data.data.events
      }));
      setSuccessMsg('Second half started!');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to start second half.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFullTime() {
    if (!window.confirm('Are you sure you want to end the match with full-time whistle?')) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.post(`/football/matches/${matchId}/full-time`, {
        minute: Number(eventMinute) || 90
      });
      setMatchData((prev) => ({
        ...prev,
        match: { ...prev.match, ...res.data.data.match },
        matchState: res.data.data.matchState,
        events: res.data.data.events
      }));
      setSuccessMsg('Full-time whistle blown. Match marked as Completed!');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to complete match.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUndo() {
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.post(`/football/matches/${matchId}/undo-event`);
      setMatchData((prev) => ({
        ...prev,
        matchState: res.data.data.matchState,
        events: res.data.data.events
      }));
      const undoneType = res.data.data.undoneEvent?.eventType || 'event';
      setSuccessMsg(`Undone latest ${undoneType}.`);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to undo latest event.');
    } finally {
      setSubmitting(false);
    }
  }

  // Event Submission Handlers
  async function handleSubmitEvent(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg(null);

    const targetTeamId = eventTeamId || match.teamA?.id;
    const parsedMinute = Number(eventMinute) || 0;

    try {
      if (activeTab === 'GOAL') {
        const res = await api.post(`/football/matches/${matchId}/events/goal`, {
          scoringTeamId: targetTeamId,
          playerId: selectedPlayerId || null,
          secondaryPlayerId: secondaryPlayerId || null,
          minute: parsedMinute,
          detail: eventDetail || 'Goal'
        });
        setMatchData((prev) => ({
          ...prev,
          matchState: res.data.data.matchState,
          events: res.data.data.events
        }));
        setSuccessMsg('Goal recorded successfully! ⚽');
      } else if (activeTab === 'CARD') {
        const res = await api.post(`/football/matches/${matchId}/events/card`, {
          cardType,
          teamId: targetTeamId,
          playerId: selectedPlayerId || null,
          minute: parsedMinute,
          detail: eventDetail || (cardType === 'YELLOW_CARD' ? 'Yellow Card' : 'Red Card')
        });
        setMatchData((prev) => ({
          ...prev,
          matchState: res.data.data.matchState,
          events: res.data.data.events
        }));
        setSuccessMsg(`${cardType === 'YELLOW_CARD' ? 'Yellow' : 'Red'} card recorded.`);
      } else if (activeTab === 'SUB') {
        const res = await api.post(`/football/matches/${matchId}/events/substitution`, {
          teamId: targetTeamId,
          playerLeavingId: selectedPlayerId || null,
          playerEnteringId: secondaryPlayerId || null,
          minute: parsedMinute,
          detail: eventDetail || 'Substitution'
        });
        setMatchData((prev) => ({
          ...prev,
          matchState: res.data.data.matchState,
          events: res.data.data.events
        }));
        setSuccessMsg('Substitution recorded successfully.');
      } else if (activeTab === 'PENALTY') {
        const res = await api.post(`/football/matches/${matchId}/events/penalty`, {
          teamId: targetTeamId,
          playerId: selectedPlayerId || null,
          minute: parsedMinute,
          isScored: Boolean(penaltyScored),
          detail: eventDetail || (penaltyScored ? 'Penalty Goal' : 'Penalty Saved / Missed')
        });
        setMatchData((prev) => ({
          ...prev,
          matchState: res.data.data.matchState,
          events: res.data.data.events
        }));
        setSuccessMsg(penaltyScored ? 'Penalty Goal recorded! ⚽' : 'Penalty missed/saved recorded.');
      } else if (activeTab === 'KICKOFF') {
        const res = await api.post(`/football/matches/${matchId}/events/kickoff`, {
          teamId: targetTeamId,
          minute: parsedMinute,
          detail: eventDetail || 'Kickoff'
        });
        setMatchData((prev) => ({
          ...prev,
          matchState: res.data.data.matchState,
          events: res.data.data.events
        }));
        setSuccessMsg('Kickoff event recorded.');
      }

      // Reset form fields
      setSelectedPlayerId('');
      setSecondaryPlayerId('');
      setEventDetail('');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit event.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-5xl mx-auto">
        <Skeleton className="h-44 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Alert Notifications */}
      {errorMsg && (
        <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-2xl flex items-center gap-3 text-red-200 text-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-900/30 border border-emerald-500/50 rounded-2xl flex items-center gap-3 text-emerald-200 text-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. SCOREBOARD HEADER CARD */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-gray-900 to-[#070b14] border border-gray-800 p-6 md:p-8 shadow-2xl space-y-6">
        <div className="flex justify-between items-center text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-black rounded-full uppercase text-[10px] tracking-wider flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-ping' : 'bg-gray-400'}`}></span>
              ⚽ {state.status || match.status || 'UPCOMING'}
            </span>
            <span className="font-mono text-gray-400">
              {state.currentHalf === 1 ? '1st Half' : state.currentHalf === 2 ? '2nd Half' : 'Match'} • {state.matchMinute || 0}'
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-gray-400">{match.venue || 'Football Arena'}</span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-300">
              {connected ? '🟢 LIVE FEED' : '🟡 CONNECTING'}
            </span>
          </div>
        </div>

        {/* Live Score Counter */}
        <div className="grid grid-cols-3 items-center py-4 text-center">
          <div className="space-y-1 text-right pr-4">
            <div className="text-xl md:text-2xl font-black text-white">{match.teamA?.name || 'Home Team'}</div>
            <div className="text-xs text-emerald-400 font-semibold font-mono">HOME</div>
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className="text-4xl md:text-6xl font-black text-white font-mono tracking-tight flex items-center gap-4 bg-gray-900/90 border border-gray-800 px-6 py-2 rounded-2xl shadow-inner">
              <span className="text-emerald-400">{state.homeScore ?? 0}</span>
              <span className="text-gray-500">-</span>
              <span className="text-emerald-400">{state.awayScore ?? 0}</span>
            </div>
            {match.result && (
              <span className="text-xs text-amber-300 font-bold mt-2 bg-amber-950/60 border border-amber-500/30 px-3 py-0.5 rounded-full">
                {match.result}
              </span>
            )}
          </div>

          <div className="space-y-1 text-left pl-4">
            <div className="text-xl md:text-2xl font-black text-white">{match.teamB?.name || 'Away Team'}</div>
            <div className="text-xs text-emerald-400 font-semibold font-mono">AWAY</div>
          </div>
        </div>
      </div>

      {/* 2. MATCH CONTROL TOOLBAR */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {!isLive && !isCompleted && (
            <button
              onClick={handleStartMatch}
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg glow-emerald flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" /> Kickoff / Start Match
            </button>
          )}

          {isLive && state.currentHalf === 1 && (
            <button
              onClick={handleHalfTime}
              disabled={submitting}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Clock className="w-4 h-4" /> Half-Time Whistle
            </button>
          )}

          {isLive && state.currentHalf === 1 && (
            <button
              onClick={handleSecondHalf}
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4" /> Start 2nd Half
            </button>
          )}

          {isLive && state.currentHalf === 2 && (
            <button
              onClick={handleFullTime}
              disabled={submitting}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Flag className="w-4 h-4" /> Full-Time Whistle
            </button>
          )}
        </div>

        <div>
          <button
            onClick={handleUndo}
            disabled={submitting || events.length === 0}
            className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-bold rounded-xl border border-gray-700 flex items-center gap-2 transition-all disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Undo Last Event
          </button>
        </div>
      </div>

      {/* 3. EVENT RECORDER PANEL */}
      <div className="glass-panel p-6 rounded-3xl border border-gray-800 space-y-6">
        {/* Event Type Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-4">
          {[
            { id: 'GOAL', label: '⚽ Goal', color: 'hover:border-emerald-500' },
            { id: 'CARD', label: '🟨 / 🟥 Card', color: 'hover:border-amber-500' },
            { id: 'SUB', label: '🔄 Substitution', color: 'hover:border-blue-500' },
            { id: 'PENALTY', label: '🎯 Penalty', color: 'hover:border-purple-500' },
            { id: 'KICKOFF', label: '⏱️ Kickoff', color: 'hover:border-gray-500' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-gray-900 text-gray-400 border border-gray-800 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Details */}
        <form onSubmit={handleSubmitEvent} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Team Selector */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400">Team:</label>
              <select
                value={eventTeamId}
                onChange={(e) => {
                  setEventTeamId(e.target.value);
                  setSelectedPlayerId('');
                  setSecondaryPlayerId('');
                }}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white font-semibold focus:border-emerald-500"
              >
                <option value={match.teamA?.id}>{match.teamA?.name} (Home)</option>
                <option value={match.teamB?.id}>{match.teamB?.name} (Away)</option>
              </select>
            </div>

            {/* Event Minute */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400">Match Minute:</label>
              <input
                type="number"
                min="0"
                max="130"
                value={eventMinute}
                onChange={(e) => setEventMinute(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white font-mono focus:border-emerald-500"
                placeholder="Minute (e.g. 67)"
              />
            </div>

            {/* Primary Player Selector */}
            {activeTab !== 'KICKOFF' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400">
                  {activeTab === 'SUB' ? 'Player Leaving:' : 'Player:'}
                </label>
                {activePlayers.length > 0 ? (
                  <select
                    value={selectedPlayerId}
                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white font-semibold focus:border-emerald-500"
                  >
                    <option value="">-- Select Player --</option>
                    {activePlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.jerseyNumber || '-'} {p.firstName} {p.lastName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={selectedPlayerId}
                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                    placeholder="Enter player name/ID"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500"
                  />
                )}
              </div>
            )}
          </div>

          {/* Conditional Form Rows */}
          {activeTab === 'CARD' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400">Card Color:</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 text-xs text-amber-300 font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="cardType"
                      value="YELLOW_CARD"
                      checked={cardType === 'YELLOW_CARD'}
                      onChange={() => setCardType('YELLOW_CARD')}
                      className="accent-amber-400"
                    />
                    🟨 Yellow Card
                  </label>
                  <label className="flex items-center gap-2 text-xs text-red-400 font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="cardType"
                      value="RED_CARD"
                      checked={cardType === 'RED_CARD'}
                      onChange={() => setCardType('RED_CARD')}
                      className="accent-red-500"
                    />
                    🟥 Red Card
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400">Reason / Detail:</label>
                <input
                  type="text"
                  value={eventDetail}
                  onChange={(e) => setEventDetail(e.target.value)}
                  placeholder="e.g. Tactical foul, dissent"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'SUB' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400">Player Entering:</label>
                {activePlayers.length > 0 ? (
                  <select
                    value={secondaryPlayerId}
                    onChange={(e) => setSecondaryPlayerId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white font-semibold focus:border-emerald-500"
                  >
                    <option value="">-- Select Substitute --</option>
                    {activePlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.jerseyNumber || '-'} {p.firstName} {p.lastName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={secondaryPlayerId}
                    onChange={(e) => setSecondaryPlayerId(e.target.value)}
                    placeholder="Enter entering player"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400">Substitution Reason:</label>
                <input
                  type="text"
                  value={eventDetail}
                  onChange={(e) => setEventDetail(e.target.value)}
                  placeholder="e.g. Tactical, Injury"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'PENALTY' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400">Penalty Result:</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-emerald-400 font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="penaltyScored"
                      checked={penaltyScored === true}
                      onChange={() => setPenaltyScored(true)}
                      className="accent-emerald-400"
                    />
                    ⚽ Scored (Goal)
                  </label>
                  <label className="flex items-center gap-2 text-xs text-red-400 font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="penaltyScored"
                      checked={penaltyScored === false}
                      onChange={() => setPenaltyScored(false)}
                      className="accent-red-400"
                    />
                    ❌ Missed / Saved
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400">Description:</label>
                <input
                  type="text"
                  value={eventDetail}
                  onChange={(e) => setEventDetail(e.target.value)}
                  placeholder="e.g. Bottom left corner, saved by keeper"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'GOAL' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400">Assist Player (Optional):</label>
                {activePlayers.length > 0 ? (
                  <select
                    value={secondaryPlayerId}
                    onChange={(e) => setSecondaryPlayerId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white font-semibold focus:border-emerald-500"
                  >
                    <option value="">-- No Assist --</option>
                    {activePlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.jerseyNumber || '-'} {p.firstName} {p.lastName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={secondaryPlayerId}
                    onChange={(e) => setSecondaryPlayerId(e.target.value)}
                    placeholder="Assist player name"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400">Goal Description:</label>
                <input
                  type="text"
                  value={eventDetail}
                  onChange={(e) => setEventDetail(e.target.value)}
                  placeholder="e.g. Header, Left foot curling strike, Penalty"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg glow-emerald flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Recording...
                </>
              ) : (
                <>Submit {activeTab} Event</>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 4. EVENT TIMELINE */}
      <div className="glass-panel p-6 rounded-3xl border border-gray-800 space-y-4">
        <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" /> Match Event Timeline
        </h3>

        {events.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500">
            No events recorded yet. Match kicked off will appear here.
          </div>
        ) : (
          <div className="space-y-2">
            {[...events].reverse().map((ev) => {
              const isHomeTeam = ev.teamId === match.teamA?.id;
              const teamName = isHomeTeam
                ? match.teamA?.name || 'Home'
                : ev.teamId === match.teamB?.id
                ? match.teamB?.name || 'Away'
                : '';

              let icon = '⏱️';
              let badgeColor = 'bg-gray-800 text-gray-300';

              if (ev.eventType === 'GOAL') {
                icon = '⚽';
                badgeColor = 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300';
              } else if (ev.eventType === 'YELLOW_CARD') {
                icon = '🟨';
                badgeColor = 'bg-amber-950/80 border border-amber-500/40 text-amber-300';
              } else if (ev.eventType === 'RED_CARD') {
                icon = '🟥';
                badgeColor = 'bg-red-950/80 border border-red-500/40 text-red-300';
              } else if (ev.eventType === 'SUBSTITUTION') {
                icon = '🔄';
                badgeColor = 'bg-blue-950/80 border border-blue-500/40 text-blue-300';
              } else if (ev.eventType === 'PENALTY') {
                icon = '🎯';
                badgeColor = 'bg-purple-950/80 border border-purple-500/40 text-purple-300';
              }

              return (
                <div
                  key={ev.id}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${badgeColor}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-sm w-8">{ev.minute}'</span>
                    <span className="text-base">{icon}</span>
                    <div className="space-y-0.5">
                      <div className="font-bold flex items-center gap-2">
                        <span>{ev.eventType}</span>
                        {teamName && <span className="font-normal opacity-80">({teamName})</span>}
                      </div>
                      {ev.detail && <div className="text-[11px] opacity-75">{ev.detail}</div>}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono opacity-60">
                    {new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
