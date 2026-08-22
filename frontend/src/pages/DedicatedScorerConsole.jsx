import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import BadmintonScoringConsole from '../components/BadmintonScoringConsole';
import WagonWheelSVG, { CANONICAL_ZONES, CANONICAL_ZONE_COORDS } from '../components/WagonWheelSVG';
import PitchMapCanvas from '../components/PitchMapCanvas';
import { useCricketSocket } from '../socket/useCricketSocket';
import {
  resolveBattingTeamId,
  resolveBowlingTeamId,
  getBattingXIPlayers,
  getEligibleStrikers,
  getEligibleNonStrikers,
  getEligibleIncomingBatters
} from '../utils/battingEligibility';
import {
  Play,
  Settings,
  Target,
  CheckCircle2,
  AlertCircle,
  Activity,
  Loader2,
  Key,
  ShieldCheck,
  RefreshCw,
  Trophy,
  Users,
  ChevronRight,
  Flame,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import Skeleton from '../components/Skeleton';

export default function DedicatedScorerConsole() {
  const { token, scoringCode } = useParams();
  const rawToken = token || scoringCode || '';
  const activeToken = rawToken ? decodeURIComponent(rawToken.trim()) : '';

  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState(null);
  const [liveDetails, setLiveDetails] = useState(null);
  const [scorecardDetails, setScorecardDetails] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  // Pre-match Toss Form State
  const [tossWinnerId, setTossWinnerId] = useState('');
  const [tossDecision, setTossDecision] = useState('BAT');
  const [strikerId, setStrikerId] = useState('');
  const [nonStrikerId, setNonStrikerId] = useState('');
  const [bowlerId, setBowlerId] = useState('');

  // Active Players Override State during scoring
  const [activeStrikerId, setActiveStrikerId] = useState('');
  const [activeNonStrikerId, setActiveNonStrikerId] = useState('');
  const [activeBowlerId, setActiveBowlerId] = useState('');

  // Ball Form State
  const [batRuns, setBatRuns] = useState(0);
  const [extraRuns, setExtraRuns] = useState(0);
  const [extraType, setExtraType] = useState('NONE');
  const [isWicket, setIsWicket] = useState(false);
  const [wicketType, setWicketType] = useState('BOWLED');
  const [dismissedPlayerId, setDismissedPlayerId] = useState('');
  const [newBatsmanId, setNewBatsmanId] = useState('');
  const [fielderId, setFielderId] = useState('');
  const [commentary, setCommentary] = useState('');
  const [shotZone, setShotZone] = useState('Mid Wicket');
  const [shotX, setShotX] = useState(95);
  const [shotY, setShotY] = useState(45);
  const [pitchLength, setPitchLength] = useState('Good');
  const [pitchLine, setPitchLine] = useState('Stumps');

  // Save scoring token to session storage so all requests send x-scoring-token
  useEffect(() => {
    if (activeToken) {
      sessionStorage.setItem('activeScoringToken', activeToken);
    }
  }, [activeToken]);

  const loadSession = useCallback(async () => {
    if (!activeToken) {
      setErrorMsg('No scoring access token provided.');
      setLoading(false);
      return;
    }
    try {
      setErrorMsg(null);
      const res = await api.get(`/matches/score-session/${encodeURIComponent(activeToken)}`);
      const data = res.data.data;
      setSessionData(data);

      if (data?.match?.id) {
        // Also fetch live match scorecard & live details
        const [liveRes, cardRes] = await Promise.all([
          api.get(`/matches/${data.match.id}/live`).catch(() => ({ data: { data: null } })),
          api.get(`/matches/${data.match.id}/scorecard`).catch(() => ({ data: { data: null } }))
        ]);

        const live = liveRes.data.data;
        const card = cardRes.data.data;
        setLiveDetails(live);
        setScorecardDetails(card);

        if (live?.currentBatters?.striker?.id) {
          setActiveStrikerId(live.currentBatters.striker.id);
          setDismissedPlayerId(live.currentBatters.striker.id);
        }
        if (live?.currentBatters?.nonStriker?.id) {
          setActiveNonStrikerId(live.currentBatters.nonStriker.id);
        }
        if (live?.currentBowling?.id) {
          setActiveBowlerId(live.currentBowling.id);
        }

        // Set default pre-match toss values if UPCOMING
        if (data.match.status === 'UPCOMING') {
          if (!tossWinnerId) setTossWinnerId(data.match.teamAId);
          if (data.match.tossWinnerId) {
            setTossWinnerId(data.match.tossWinnerId);
            setTossDecision(data.match.tossDecision || 'BAT');
          }
        }
      }
    } catch (err) {
      console.error('Failed to load match scoring session:', err);
      setErrorMsg(err.response?.data?.message || 'Invalid or revoked scoring access link.');
    } finally {
      setLoading(false);
    }
  }, [activeToken]);

  useEffect(() => {
    loadSession();
    // Auto-refresh poll every 10 seconds
    const interval = setInterval(loadSession, 10000);
    return () => clearInterval(interval);
  }, [loadSession]);

  const handleShotZoneSelect = ({ zone, x = 0, y = 0 }) => {
    setShotZone(zone);
    setShotX(x);
    setShotY(y);
  };

  const handlePitchSelect = ({ pitchLength: len, pitchLine: line }) => {
    if (len) setPitchLength(len);
    if (line) setPitchLine(line);
  };

  // Toss & Start Match
  async function handleStartMatch() {
    if (!sessionData?.match?.id) return;
    const matchId = sessionData.match.id;

    if (!tossWinnerId) {
      setStatusMsg({ type: 'error', text: 'Please select the toss winner.' });
      return;
    }
    if (!strikerId || !nonStrikerId || !bowlerId) {
      setStatusMsg({ type: 'error', text: 'Please select opening Striker, Non-Striker, and Bowler.' });
      return;
    }
    if (strikerId === nonStrikerId) {
      setStatusMsg({ type: 'error', text: 'Striker and Non-Striker must be different players.' });
      return;
    }

    setActionLoading(true);
    setStatusMsg(null);

    try {
      // 1. Record Toss
      if (!sessionData.match.tossWinnerId) {
        await api.post(
          `/matches/${matchId}/toss`,
          {
            winnerTeamId: tossWinnerId,
            decision: tossDecision
          },
          { headers: { 'x-scoring-token': activeToken } }
        );
      }

      // 2. Start Match
      await api.post(
        `/matches/${matchId}/start`,
        {
          strikerId,
          nonStrikerId,
          bowlerId
        },
        { headers: { 'x-scoring-token': activeToken } }
      );

      setStatusMsg({ type: 'success', text: 'Match started successfully! Live scoring is now active.' });
      await loadSession();
    } catch (err) {
      console.error('Failed to start match:', err);
      setStatusMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to start match.'
      });
    } finally {
      setActionLoading(false);
    }
  }

  // Record Ball
  async function handleRecordBall(e) {
    if (e) e.preventDefault();
    if (actionLoading) return;

    const inningsId = liveDetails?.innings?.id || sessionData?.activeInnings?.id;
    if (!inningsId) {
      setStatusMsg({ type: 'error', text: 'No active live innings found for this match.' });
      return;
    }

    const currentStriker = activeStrikerId || liveDetails?.currentBatters?.striker?.id;
    const currentNonStriker = activeNonStrikerId || liveDetails?.currentBatters?.nonStriker?.id;
    const currentBowler = activeBowlerId || liveDetails?.currentBowling?.id;

    if (!currentStriker || !currentBowler) {
      setStatusMsg({ type: 'error', text: 'Please ensure Striker and Bowler are selected.' });
      return;
    }

    if (currentStriker === currentNonStriker) {
      setStatusMsg({ type: 'error', text: 'Striker and non-striker cannot be the same player.' });
      return;
    }

    setActionLoading(true);
    setStatusMsg(null);

    try {
      const isByeType = extraType === 'BYE' || extraType === 'LEG_BYE' || extraType === 'WIDE';
      const actualBatRuns = isByeType ? 0 : Number(batRuns) || 0;
      const actualExtraRuns = Number(extraRuns) || 0;

      const payload = {
        inningsId,
        batsmanId: currentStriker,
        nonStrikerId: currentNonStriker,
        bowlerId: currentBowler,
        batRuns: actualBatRuns,
        extraRuns: actualExtraRuns,
        extraType,
        isFreeHit: Boolean(isFreeHit),
        isWicket,
        wicketType: isWicket ? wicketType : null,
        dismissedPlayerId: isWicket ? (dismissedPlayerId || currentStriker) : null,
        newBatsmanId: isWicket ? (newBatsmanId || null) : null,
        fielderId: (isWicket && fielderId) ? fielderId : null,
        commentary: commentary || (
          extraType === 'BYE'
            ? `${actualExtraRuns} Bye runs`
            : extraType === 'LEG_BYE'
            ? `${actualExtraRuns} Leg Bye runs`
            : `${actualBatRuns} run${actualBatRuns === 1 ? '' : 's'} scored to ${shotZone}`
        ),
        shotZone,
        shotX,
        shotY,
        pitchLength,
        pitchLine
      };

      await api.post(`/innings/${inningsId}/balls`, payload, {
        headers: { 'x-scoring-token': activeToken }
      });

      setStatusMsg({
        type: 'success',
        text: `Ball recorded ✓ (${extraType === 'BYE' ? `${actualExtraRuns}B` : extraType === 'LEG_BYE' ? `${actualExtraRuns}LB` : `${actualBatRuns}r`} to ${shotZone}${isWicket ? ' - WICKET!' : ''})`
      });

      // Reset Ball Inputs
      setBatRuns(0);
      setExtraRuns(0);
      setExtraType('NONE');
      setIsWicket(false);
      setNewBatsmanId('');
      setFielderId('');
      setCommentary('');

      await loadSession();
    } catch (err) {
      console.error('Failed to record ball:', err);
      setStatusMsg({
        type: 'error',
        text: err.response?.data?.message || 'Error recording ball.'
      });
    } finally {
      setActionLoading(false);
    }
  }

  // End Innings
  async function handleEndInnings() {
    const inningsId = liveDetails?.innings?.id || sessionData?.activeInnings?.id;
    if (!inningsId) return;

    if (!window.confirm('Are you sure you want to conclude this innings?')) return;

    setActionLoading(true);
    setStatusMsg(null);
    try {
      await api.post(
        `/innings/${inningsId}/end`,
        {},
        { headers: { 'x-scoring-token': activeToken } }
      );
      setStatusMsg({ type: 'success', text: 'Innings concluded successfully.' });
      await loadSession();
    } catch (err) {
      console.error('Failed to end innings:', err);
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Failed to end innings.' });
    } finally {
      setActionLoading(false);
    }
  }

  // Undo Last Delivery
  async function handleUndoLastDelivery() {
    const matchId = match?.id;
    if (!matchId) return;

    const confirmUndo = window.confirm(
      "Undo Last Delivery?\nThis will revert the latest delivery and all dependent match statistics."
    );
    if (!confirmUndo) return;

    setActionLoading(true);
    setStatusMsg(null);
    try {
      await api.post(
        `/matches/${matchId}/undo-last-ball`,
        {},
        { headers: { 'x-scoring-token': activeToken } }
      );
      setStatusMsg({
        type: 'success',
        text: 'Last delivery undone successfully ✓'
      });
      await loadSession();
    } catch (err) {
      console.error('Failed to undo last ball:', err);
      setStatusMsg({
        type: 'error',
        text: err.response?.data?.message || 'Error undoing last delivery.'
      });
    } finally {
      setActionLoading(false);
    }
  }

  // Derived Match State
  const match = sessionData?.match;
  const playingXI = sessionData?.playingXI;
  const teamAXI = playingXI?.teamA || [];
  const teamBXI = playingXI?.teamB || [];
  const isPlayingXIReady = playingXI?.isReady;

  // Real-time socket sync
  const socketData = useCricketSocket(match?.id);

  useEffect(() => {
    if (socketData.liveScore) {
      setLiveDetails(prev => ({
        ...prev,
        ...socketData.liveScore,
        innings: socketData.liveScore.innings || prev?.innings
      }));
    }
    if (socketData.scorecard) {
      setScorecardDetails(socketData.scorecard);
    }
  }, [socketData.liveScore, socketData.scorecard]);

  // Active Innings & Batting Team derivations
  const currentInnings = liveDetails?.innings || scorecardDetails?.innings || null;

  const activeBattingTeamId = resolveBattingTeamId({
    innings: currentInnings,
    match,
    tossWinnerId,
    tossDecision
  });

  const activeBowlingTeamId = resolveBowlingTeamId({
    innings: currentInnings,
    match,
    tossWinnerId,
    tossDecision
  });

  // Pre-match Playing XI lists
  const preMatchBattingXI = getBattingXIPlayers({
    battingTeamId: activeBattingTeamId,
    playingXI,
    match
  });

  const preMatchBowlingXI = getBattingXIPlayers({
    battingTeamId: activeBowlingTeamId,
    playingXI,
    match
  });

  // Live match full batting Playing XI enriched with scorecard
  const liveBattingXI = getBattingXIPlayers({
    battingTeamId: activeBattingTeamId,
    playingXI,
    scorecardBatting: scorecardDetails?.batting,
    match
  });

  const currentStriker = activeStrikerId || liveDetails?.currentBatters?.striker?.id;
  const currentNonStriker = activeNonStrikerId || liveDetails?.currentBatters?.nonStriker?.id;

  const eligibleStrikers = getEligibleStrikers({
    battingXIPlayers: liveBattingXI,
    currentNonStrikerId: currentNonStriker,
    currentStrikerId: currentStriker
  });

  const eligibleNonStrikers = getEligibleNonStrikers({
    battingXIPlayers: liveBattingXI,
    currentStrikerId: currentStriker,
    currentNonStrikerId: currentNonStriker
  });

  const eligibleIncomingBatters = getEligibleIncomingBatters({
    battingXIPlayers: liveBattingXI,
    currentStrikerId: currentStriker,
    currentNonStrikerId: currentNonStriker,
    dismissedPlayerId: (dismissedPlayerId || currentStriker)
  });

  const availableBowlers = scorecardDetails?.allBowlers || scorecardDetails?.bowling || [];

  const isFreeHit = Boolean(
    liveDetails?.score?.isFreeHit ||
    liveDetails?.isFreeHit ||
    liveDetails?.score?.freeHitNextDelivery ||
    liveDetails?.freeHitNextDelivery ||
    (liveDetails?.recentBalls && liveDetails.recentBalls.length > 0 && liveDetails.recentBalls[0]?.extraType === 'NO_BALL')
  );

  if (loading) {
    return (
      <div className="py-20 max-w-4xl mx-auto space-y-6 text-center">
        <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto" />
        <p className="text-gray-400 text-sm font-semibold">Validating match scoring access link...</p>
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (errorMsg || !match) {
    return (
      <div className="py-16 max-w-xl mx-auto text-center space-y-6">
        <div className="p-6 bg-red-950/40 border border-red-500/40 rounded-3xl space-y-4">
          <div className="w-14 h-14 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white">Scoring Link Invalid or Expired</h2>
          <p className="text-xs text-red-200/90 leading-relaxed">
            {errorMsg || 'This match scoring access link has been revoked or is no longer valid. Please contact the tournament organizer to receive an updated link.'}
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 border border-gray-700"
            >
              Return to CricLive Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (match.tournament?.sport?.code === 'BADMINTON') {
    return <BadmintonScoringConsole matchId={match.id} />;
  }

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Top Security & Match Header Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full font-mono text-[10px] font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> SECURE MATCH SCORER LINK
            </span>
            <span className="text-[11px] text-gray-400 font-mono">
              Tournament: {match.tournament?.name || 'Championship'}
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {match.teamA?.name} <span className="text-emerald-400 font-mono">vs</span> {match.teamB?.name}
          </h1>
          <p className="text-xs text-gray-400">
            Venue: <span className="text-white font-semibold">{match.venue}</span> • Date:{' '}
            <span className="text-white font-semibold">{new Date(match.matchDate).toLocaleString()}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <span
            className={`px-3 py-1 text-xs font-black rounded-full border tracking-wide uppercase ${
              match.status === 'LIVE'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 glow-emerald'
                : match.status === 'COMPLETED'
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
            }`}
          >
            {match.status}
          </span>
          <button
            onClick={loadSession}
            disabled={actionLoading}
            className="p-2 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded-xl border border-gray-700"
            title="Refresh Session"
          >
            <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status Notifications */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
              : 'bg-red-950/80 border border-red-500/50 text-red-300'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Free Hit Banner */}
      {isFreeHit && match.status === 'LIVE' && (
        <div className="p-4 bg-amber-500/20 border border-amber-500/60 rounded-2xl flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-amber-400 fill-amber-400" />
            <div>
              <h4 className="text-sm font-black text-amber-300 uppercase tracking-wider">
                FREE HIT ACTIVE!
              </h4>
              <p className="text-xs text-amber-200/80">
                Batter cannot be dismissed except via Run Out, Obstructing the Field, or Hit the Ball Twice.
              </p>
            </div>
          </div>
          <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/60 px-3 py-1 rounded-lg border border-amber-500/40">
            NEXT BALL FREE HIT
          </span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STAGE 1: UPCOMING MATCH — PLAYING XI VERIFICATION & TOSS SETUP */}
      {/* ------------------------------------------------------------- */}
      {match.status === 'UPCOMING' && (
        <div className="space-y-6">
          {/* Playing XI Verification Notice */}
          <div className="glass-panel p-6 rounded-3xl border border-gray-800 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" /> Playing XI Readiness Status
                </h3>
                <p className="text-xs text-gray-400">
                  Each Team Manager must submit their 11-player lineup before match start.
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  isPlayingXIReady
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                }`}
              >
                {isPlayingXIReady ? 'READY TO PLAY' : 'AWAITING TEAM MANAGERS'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Team A Lineup Card */}
              <div className="p-4 bg-gray-900/90 rounded-2xl border border-gray-800 space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-white text-sm">{match.teamA?.name}</h4>
                  <span
                    className={`text-xs font-mono px-2 py-0.5 rounded font-bold ${
                      teamAXI.length === 11
                        ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800'
                        : 'text-amber-400 bg-amber-950/60 border border-amber-800'
                    }`}
                  >
                    {teamAXI.length}/11 Selected
                  </span>
                </div>
                {teamAXI.length === 0 ? (
                  <p className="text-[11px] text-gray-500 italic">No lineup submitted yet.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1 text-xs text-gray-300 font-mono pr-2">
                    {teamAXI.map((p, idx) => (
                      <div key={p.id} className="flex justify-between py-0.5 border-b border-gray-800">
                        <span>
                          {idx + 1}. {p.player?.firstName} {p.player?.lastName}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {p.isCaptain ? '(C)' : ''} {p.isWicketKeeper ? '(WK)' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Team B Lineup Card */}
              <div className="p-4 bg-gray-900/90 rounded-2xl border border-gray-800 space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-white text-sm">{match.teamB?.name}</h4>
                  <span
                    className={`text-xs font-mono px-2 py-0.5 rounded font-bold ${
                      teamBXI.length === 11
                        ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800'
                        : 'text-amber-400 bg-amber-950/60 border border-amber-800'
                    }`}
                  >
                    {teamBXI.length}/11 Selected
                  </span>
                </div>
                {teamBXI.length === 0 ? (
                  <p className="text-[11px] text-gray-500 italic">No lineup submitted yet.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1 text-xs text-gray-300 font-mono pr-2">
                    {teamBXI.map((p, idx) => (
                      <div key={p.id} className="flex justify-between py-0.5 border-b border-gray-800">
                        <span>
                          {idx + 1}. {p.player?.firstName} {p.player?.lastName}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {p.isCaptain ? '(C)' : ''} {p.isWicketKeeper ? '(WK)' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pre-Match Toss & Openers Form */}
          {isPlayingXIReady ? (
            <div className="glass-panel p-6 rounded-3xl border border-gray-800 space-y-6">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" /> Match Toss & Opening Deliveries
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Toss Winner */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-bold block">Toss Winner Team:</label>
                  <select
                    value={tossWinnerId}
                    onChange={(e) => setTossWinnerId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl p-3 text-xs font-semibold focus:border-emerald-500"
                  >
                    <option value={match.teamAId}>{match.teamA?.name}</option>
                    <option value={match.teamBId}>{match.teamB?.name}</option>
                  </select>
                </div>

                {/* Toss Decision */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-bold block">Elected To:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTossDecision('BAT')}
                      className={`py-3 rounded-xl font-bold transition-all ${
                        tossDecision === 'BAT'
                          ? 'bg-emerald-600 text-white shadow-lg glow-emerald'
                          : 'bg-gray-900 text-gray-400 border border-gray-800 hover:text-white'
                      }`}
                    >
                      BAT FIRST
                    </button>
                    <button
                      type="button"
                      onClick={() => setTossDecision('BOWL')}
                      className={`py-3 rounded-xl font-bold transition-all ${
                        tossDecision === 'BOWL'
                          ? 'bg-emerald-600 text-white shadow-lg glow-emerald'
                          : 'bg-gray-900 text-gray-400 border border-gray-800 hover:text-white'
                      }`}
                    >
                      BOWL FIRST
                    </button>
                  </div>
                </div>
              </div>

              {/* Openers Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
                <div className="space-y-1.5">
                  <label className="text-emerald-400 font-bold block">Opening Striker (Batting):</label>
                  <select
                    value={strikerId}
                    onChange={(e) => setStrikerId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl p-3 text-xs font-semibold focus:border-emerald-500"
                  >
                    <option value="">-- Select Striker --</option>
                    {preMatchBattingXI.map((p) => {
                      const pid = p.playerId || p.id;
                      return (
                        <option key={pid} value={pid} disabled={pid === nonStrikerId}>
                          {p.name} #{p.jerseyNumber || ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-emerald-400 font-bold block">Opening Non-Striker (Batting):</label>
                  <select
                    value={nonStrikerId}
                    onChange={(e) => setNonStrikerId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl p-3 text-xs font-semibold focus:border-emerald-500"
                  >
                    <option value="">-- Select Non-Striker --</option>
                    {preMatchBattingXI.map((p) => {
                      const pid = p.playerId || p.id;
                      return (
                        <option key={pid} value={pid} disabled={pid === strikerId}>
                          {p.name} #{p.jerseyNumber || ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-blue-400 font-bold block">Opening Bowler (Bowling):</label>
                  <select
                    value={bowlerId}
                    onChange={(e) => setBowlerId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl p-3 text-xs font-semibold focus:border-blue-500"
                  >
                    <option value="">-- Select Bowler --</option>
                    {preMatchBowlingXI.map((p) => {
                      const pid = p.playerId || p.id;
                      return (
                        <option key={pid} value={pid}>
                          {p.name} #{p.jerseyNumber || ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Start Match Action Button */}
              <button
                type="button"
                onClick={handleStartMatch}
                disabled={actionLoading || !strikerId || !nonStrikerId || !bowlerId}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-xl glow-emerald disabled:opacity-40 transition-all"
              >
                {actionLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-white" /> START MATCH & OPEN LIVE SCORING CONSOLE
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="p-6 bg-gray-900/60 border border-gray-800 rounded-3xl text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">Lineups Incomplete</h4>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Once both Team Managers submit their 11 players, the Toss and Opening Ball controls will
                unlock automatically.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STAGE 2: LIVE MATCH SCORING CONSOLE */}
      {/* ------------------------------------------------------------- */}
      {match.status === 'LIVE' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Ball Entry Column (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Scoreboard Ribbon */}
            <div className="glass-panel p-5 rounded-2xl border border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4" /> Innings {liveDetails?.innings?.inningsNumber || 1} •{' '}
                  {liveDetails?.innings?.battingTeam?.name || 'Batting Team'}
                </span>
                <div className="text-3xl font-black text-white font-mono mt-1">
                  {liveDetails?.score?.runs || 0}/{liveDetails?.score?.wickets || 0}
                  <span className="text-sm font-normal text-gray-400 ml-2">
                    ({liveDetails?.score?.overs || '0.0'} Overs)
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                <div className="p-2.5 bg-gray-900/80 rounded-xl border border-gray-800">
                  <span className="text-gray-400 text-[10px] block">CRR</span>
                  <span className="text-white font-bold text-sm">
                    {liveDetails?.score?.currentRunRate?.toFixed(2) || '0.00'}
                  </span>
                </div>
                {liveDetails?.score?.target && (
                  <div className="p-2.5 bg-gray-900/80 rounded-xl border border-gray-800">
                    <span className="text-gray-400 text-[10px] block">TARGET</span>
                    <span className="text-emerald-400 font-bold text-sm">
                      {liveDetails.score.target}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleEndInnings}
                  disabled={actionLoading}
                  className="px-3 py-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 rounded-xl font-bold text-xs"
                >
                  Conclude Innings
                </button>
              </div>
            </div>

            {/* Active Players Selector Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="glass-panel p-3 rounded-xl border border-gray-800 space-y-1">
                <label className="text-emerald-400 font-bold block">Striker (*):</label>
                <select
                  value={activeStrikerId || currentStriker || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setActiveStrikerId(val);
                    setDismissedPlayerId(val);
                  }}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2 font-semibold text-xs focus:border-emerald-500"
                >
                  {eligibleStrikers.length > 0 ? (
                    eligibleStrikers.map((b) => {
                      const pid = b.id || b.playerId;
                      return (
                        <option key={pid} value={pid}>
                          {b.name} ({b.runs || 0}r, {b.balls || 0}b)
                        </option>
                      );
                    })
                  ) : (
                    <option value={currentStriker || ''}>
                      {liveDetails?.currentBatters?.striker?.name || 'No eligible striker'}
                    </option>
                  )}
                </select>
              </div>

              <div className="glass-panel p-3 rounded-xl border border-gray-800 space-y-1">
                <label className="text-gray-400 font-bold block">Non-Striker (*):</label>
                <select
                  value={activeNonStrikerId || currentNonStriker || ''}
                  onChange={(e) => setActiveNonStrikerId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2 font-semibold text-xs focus:border-gray-500"
                >
                  {eligibleNonStrikers.length > 0 ? (
                    eligibleNonStrikers.map((b) => {
                      const pid = b.id || b.playerId;
                      return (
                        <option key={pid} value={pid}>
                          {b.name} ({b.runs || 0}r, {b.balls || 0}b)
                        </option>
                      );
                    })
                  ) : (
                    <option value={currentNonStriker || ''}>
                      {liveDetails?.currentBatters?.nonStriker?.name || 'No eligible non-striker'}
                    </option>
                  )}
                </select>
              </div>

              <div className="glass-panel p-3 rounded-xl border border-gray-800 space-y-1">
                <label className="text-blue-400 font-bold block">Active Bowler (*):</label>
                <select
                  value={activeBowlerId || liveDetails?.currentBowling?.id || ''}
                  onChange={(e) => setActiveBowlerId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2 font-semibold text-xs focus:border-blue-500"
                >
                  <option value="">-- Select Eligible Bowler --</option>
                  {availableBowlers.map((bw) => {
                    const bid = bw.bowlerId || bw.id;
                    const isPrev = Boolean(
                      liveDetails?.score?.legalBalls > 0 &&
                      liveDetails.score.legalBalls % 6 === 0 &&
                      liveDetails.currentBowling?.id &&
                      bid === liveDetails.currentBowling.id
                    );
                    return (
                      <option key={bid} value={bid} disabled={isPrev}>
                        {bw.name} ({bw.overs || '0.0'} ov, {bw.wickets || 0}w, {bw.runs || 0}r){isPrev ? ' (Consecutive - cannot bowl)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Ball-by-Ball Form */}
            <form
              onSubmit={handleRecordBall}
              className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-6"
            >
              {/* Extras Selector */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                    Extras:
                  </label>
                  {isFreeHit && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40 animate-pulse">
                      FREE HIT ACTIVE
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { type: 'NONE', label: 'None' },
                    { type: 'WIDE', label: 'Wide (+1)' },
                    { type: 'NO_BALL', label: 'No Ball (+1)' },
                    { type: 'BYE', label: 'Bye' },
                    { type: 'LEG_BYE', label: 'Leg Bye' }
                  ].map((ext) => (
                    <button
                      type="button"
                      key={ext.type}
                      onClick={() => {
                        setExtraType(ext.type);
                        if (ext.type === 'WIDE') {
                          setBatRuns(0);
                          setExtraRuns(1);
                        } else if (ext.type === 'NO_BALL') {
                          setExtraRuns(1);
                        } else if (ext.type === 'BYE' || ext.type === 'LEG_BYE') {
                          setBatRuns(0);
                          if (!extraRuns || Number(extraRuns) === 0) setExtraRuns(1);
                        } else {
                          setExtraRuns(0);
                        }
                      }}
                      className={`py-2 px-3 rounded-xl font-bold text-xs transition-all ${
                        extraType === ext.type
                          ? 'bg-amber-600 text-white shadow-lg glow-amber'
                          : 'bg-gray-900 text-gray-400 border border-gray-800 hover:text-white'
                      }`}
                    >
                      {ext.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Run Keypad Based on Extra Type */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                  {extraType === 'NONE'
                    ? 'Runs Scored Off Bat:'
                    : extraType === 'BYE'
                    ? 'Bye Runs (Extras):'
                    : extraType === 'LEG_BYE'
                    ? 'Leg Bye Runs (Extras):'
                    : extraType === 'WIDE'
                    ? 'Wide Runs (Penalty + Extras):'
                    : 'No Ball Runs (Bat Runs + 1 Nb):'}
                </label>

                {extraType === 'NONE' && (
                  <div className="grid grid-cols-6 gap-2">
                    {[0, 1, 2, 3, 4, 6].map((r) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => {
                          setBatRuns(r);
                          setExtraRuns(0);
                        }}
                        className={`py-3 rounded-xl font-mono font-black text-base transition-all ${
                          batRuns === r
                            ? r === 4
                              ? 'bg-blue-600 text-white shadow-lg glow-blue'
                              : r === 6
                              ? 'bg-purple-600 text-white shadow-lg glow-purple'
                              : 'bg-emerald-600 text-white shadow-lg glow-emerald'
                            : 'bg-gray-900 text-gray-300 border border-gray-800 hover:border-gray-600'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}

                {extraType === 'BYE' && (
                  <div className="grid grid-cols-6 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((r) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => {
                          setBatRuns(0);
                          setExtraRuns(r);
                        }}
                        className={`py-3 rounded-xl font-mono font-black text-base transition-all ${
                          Number(extraRuns) === r
                            ? 'bg-cyan-600 text-white shadow-lg glow-cyan'
                            : 'bg-gray-900 text-cyan-400 border border-cyan-800/40 hover:border-cyan-600'
                        }`}
                      >
                        {r}B
                      </button>
                    ))}
                  </div>
                )}

                {extraType === 'LEG_BYE' && (
                  <div className="grid grid-cols-6 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((r) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => {
                          setBatRuns(0);
                          setExtraRuns(r);
                        }}
                        className={`py-3 rounded-xl font-mono font-black text-base transition-all ${
                          Number(extraRuns) === r
                            ? 'bg-cyan-600 text-white shadow-lg glow-cyan'
                            : 'bg-gray-900 text-cyan-400 border border-cyan-800/40 hover:border-cyan-600'
                        }`}
                      >
                        {r}LB
                      </button>
                    ))}
                  </div>
                )}

                {extraType === 'WIDE' && (
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => {
                          setBatRuns(0);
                          setExtraRuns(r);
                        }}
                        className={`py-3 rounded-xl font-mono font-black text-base transition-all ${
                          Number(extraRuns) === r
                            ? 'bg-purple-600 text-white shadow-lg glow-purple'
                            : 'bg-gray-900 text-purple-400 border border-purple-800/40 hover:border-purple-600'
                        }`}
                      >
                        {r === 1 ? '1Wd' : `${r}Wd`}
                      </button>
                    ))}
                  </div>
                )}

                {extraType === 'NO_BALL' && (
                  <div className="grid grid-cols-6 gap-2">
                    {[0, 1, 2, 3, 4, 6].map((r) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => {
                          setBatRuns(r);
                          setExtraRuns(1);
                        }}
                        className={`py-3 rounded-xl font-mono font-black text-base transition-all ${
                          batRuns === r
                            ? 'bg-purple-600 text-white shadow-lg glow-purple'
                            : 'bg-gray-900 text-purple-400 border border-purple-800/40 hover:border-purple-600'
                        }`}
                      >
                        {r === 0 ? 'Nb' : `${r + 1}Nb`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Wicket Drawer */}
              <div className="p-4 bg-gray-900/90 rounded-2xl border border-gray-800 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-red-400 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isWicket}
                      onChange={(e) => {
                        setIsWicket(e.target.checked);
                        if (!e.target.checked) {
                          setNewBatsmanId('');
                        }
                      }}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-gray-800 border-gray-700"
                    />
                    WICKET ON THIS BALL
                  </label>
                  {isWicket && (
                    <span className="text-[10px] text-red-400 font-mono font-bold bg-red-950/80 px-2 py-0.5 rounded border border-red-800">
                      DISMISSAL ACTIVE
                    </span>
                  )}
                </div>

                {isWicket && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
                    <div>
                      <label className="text-gray-400 font-semibold block mb-1">Dismissal Type:</label>
                      <select
                        value={wicketType}
                        onChange={(e) => setWicketType(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl p-2 font-semibold focus:border-red-500"
                      >
                        <option value="BOWLED">Bowled</option>
                        <option value="CAUGHT">Caught</option>
                        <option value="LBW">LBW</option>
                        <option value="RUN_OUT">Run Out</option>
                        <option value="STUMPED">Stumped</option>
                        <option value="HIT_WICKET">Hit Wicket</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-gray-400 font-semibold block mb-1">Dismissed Player:</label>
                      <select
                        value={dismissedPlayerId}
                        onChange={(e) => setDismissedPlayerId(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl p-2 font-semibold focus:border-red-500"
                      >
                        <option value={currentStriker}>
                          Striker ({eligibleStrikers.find(b => (b.id || b.playerId) === currentStriker)?.name || 'Active'})
                        </option>
                        {currentNonStriker && (
                          <option value={currentNonStriker}>
                            Non-Striker ({eligibleNonStrikers.find(b => (b.id || b.playerId) === currentNonStriker)?.name || 'Active'})
                          </option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="text-gray-400 font-semibold block mb-1">Incoming Next Batter:</label>
                      <select
                        value={newBatsmanId}
                        onChange={(e) => setNewBatsmanId(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl p-2 font-semibold focus:border-emerald-500"
                      >
                        <option value="">-- Select Next Batter --</option>
                        {eligibleIncomingBatters.length > 0 ? (
                          eligibleIncomingBatters.map((p) => {
                            const pid = p.id || p.playerId;
                            return (
                              <option key={pid} value={pid}>
                                {p.name} (#{p.jerseyNumber || p.battingOrder})
                              </option>
                            );
                          })
                        ) : (
                          <option value="" disabled>No eligible batters available (All Out)</option>
                        )}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Spatial Vector Coordinates (Wagon Wheel & Pitch Map) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-400 block uppercase">
                      Wagon Wheel (Shot Placement):
                    </span>
                    {shotZone && (
                      <span className="text-[10px] font-bold text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                        {shotZone}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block">
                      Shot Placement / Wagon Wheel Zone
                    </label>
                    <select
                      value={shotZone}
                      onChange={(e) => {
                        const zone = e.target.value;
                        const coords = CANONICAL_ZONE_COORDS[zone] || { x: 0, y: 0 };
                        handleShotZoneSelect({ zone, x: coords.x, y: coords.y });
                      }}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl p-2 font-semibold text-xs focus:border-emerald-500"
                    >
                      <option value="">-- Select Zone --</option>
                      {CANONICAL_ZONES.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>
                  </div>

                  <WagonWheelSVG
                    onSelectZone={handleShotZoneSelect}
                    selectedZone={shotZone}
                    selectedX={shotX}
                    selectedY={shotY}
                    isInteractive={true}
                  />
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-gray-400 block uppercase">
                    Pitch Map (Length & Line):
                  </span>
                  <PitchMapCanvas
                    onSelectPitch={handlePitchSelect}
                    selectedLength={pitchLength}
                    selectedLine={pitchLine}
                    isInteractive={true}
                  />
                  <div className="text-[10px] font-mono text-gray-400 text-center">
                    Length: <span className="text-blue-400 font-bold">{pitchLength}</span> • Line:{' '}
                    <span className="text-blue-400 font-bold">{pitchLine}</span>
                  </div>
                </div>
              </div>

              {/* Ball Submission & Undo Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-xl glow-emerald disabled:opacity-40 transition-all"
                >
                  {actionLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" /> RECORD BALL & BROADCAST REAL-TIME
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleUndoLastDelivery}
                  disabled={actionLoading || !(liveDetails?.score?.totalBalls > 0 || (liveDetails?.recentBalls && liveDetails.recentBalls.length > 0))}
                  className="px-5 py-4 bg-amber-950/70 hover:bg-amber-900/80 border border-amber-500/50 hover:border-amber-400 text-amber-300 hover:text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title="Undo the latest ball delivery"
                >
                  <RotateCcw className="w-4 h-4" /> Undo Last Delivery
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Over Timeline & Match Summary Card */}
          <div className="space-y-6">
            {/* Recent Deliveries */}
            <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Recent Deliveries Feed
              </h4>
              {liveDetails?.recentBalls && liveDetails.recentBalls.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {liveDetails.recentBalls.slice(0, 12).map((b, idx) => {
                    let badgeStyle = 'bg-gray-800 text-gray-300 border-gray-700';
                    let label = String(b.batRuns || 0);

                    if (b.isWicket) {
                      badgeStyle = 'bg-red-500/20 text-red-400 border-red-500/40 font-black';
                      label = 'W';
                    } else if (b.extraType === 'BYE') {
                      badgeStyle = 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 font-bold';
                      label = `${b.extraRuns || b.totalRuns || 1}B`;
                    } else if (b.extraType === 'LEG_BYE') {
                      badgeStyle = 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 font-bold';
                      label = `${b.extraRuns || b.totalRuns || 1}LB`;
                    } else if (b.batRuns === 6 || b.totalRuns === 6) {
                      badgeStyle = 'bg-purple-500/20 text-purple-400 border-purple-500/40 font-black';
                      label = '6';
                    } else if (b.batRuns === 4 || b.totalRuns === 4) {
                      badgeStyle = 'bg-blue-500/20 text-blue-400 border-blue-500/40 font-black';
                      label = '4';
                    } else if (b.extraType === 'WIDE') {
                      badgeStyle = 'bg-purple-500/20 text-purple-400 border-purple-500/40 font-bold';
                      label = b.extraRuns > 1 ? `${b.extraRuns}Wd` : 'Wd';
                    } else if (b.extraType === 'NO_BALL') {
                      badgeStyle = 'bg-purple-500/20 text-purple-400 border-purple-500/40 font-bold';
                      label = b.batRuns > 0 ? `${b.batRuns + 1}Nb` : 'Nb';
                    }

                    return (
                      <span
                        key={idx}
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs border ${badgeStyle}`}
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">No balls recorded in this over yet.</p>
              )}
            </div>

            {/* Match Info & Read-Only Live Center Link */}
            <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Audience Live View
              </h4>
              <p className="text-[11px] text-gray-400">
                Viewers are watching this match live on CricLive Match Center.
              </p>
              <Link
                to={`/matches/${match.id}`}
                target="_blank"
                className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-emerald-400 border border-gray-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
              >
                Open Live Match Center <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STAGE 3: COMPLETED MATCH SUMMARY */}
      {/* ------------------------------------------------------------- */}
      {match.status === 'COMPLETED' && (
        <div className="glass-panel p-8 rounded-3xl border border-gray-800 text-center space-y-4 max-w-2xl mx-auto">
          <Trophy className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-2xl font-black text-white">Match Completed</h2>
          <p className="text-sm text-emerald-400 font-bold">
            {match.result || 'Official Result Logged & Points Table Updated'}
          </p>
          <div className="pt-4">
            <Link
              to={`/matches/${match.id}`}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow glow-emerald inline-flex items-center gap-2"
            >
              View Full Match Scorecard & Standings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
