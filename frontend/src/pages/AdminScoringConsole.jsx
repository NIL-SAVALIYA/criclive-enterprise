import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { Play, Settings, Target, PieChart, CheckCircle2, AlertCircle, User, Activity, Loader2, RotateCcw } from 'lucide-react';

export default function AdminScoringConsole() {
  const [searchParams] = useSearchParams();
  const urlMatchId = searchParams.get('matchId');

  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [matchDetails, setMatchDetails] = useState(null);
  const [scorecardDetails, setScorecardDetails] = useState(null);
  const [playingXIDetails, setPlayingXIDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  // Active Players Override State
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

  // Real-time socket sync
  const socketData = useCricketSocket(selectedMatchId);

  useEffect(() => {
    if (socketData.liveScore) {
      setMatchDetails(prev => ({
        ...prev,
        ...socketData.liveScore,
        innings: socketData.liveScore.innings || prev?.innings
      }));
    }
    if (socketData.scorecard) {
      setScorecardDetails(socketData.scorecard);
    }
  }, [socketData.liveScore, socketData.scorecard]);

  useEffect(() => {
    async function loadMatches() {
      try {
        const res = await api.get('/matches');
        const list = res.data.data || [];
        setMatches(list);

        if (list.length > 0) {
          let targetMatch = urlMatchId ? list.find(m => m.id === urlMatchId) : null;
          if (!targetMatch) targetMatch = list.find(m => m.status === 'LIVE');
          if (!targetMatch) targetMatch = list.find(m => m.status === 'UPCOMING');
          if (!targetMatch) targetMatch = list[0];

          if (targetMatch) {
            setSelectedMatchId(targetMatch.id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch matches:', err);
      }
    }
    loadMatches();
  }, [urlMatchId]);

  useEffect(() => {
    if (selectedMatchId) {
      loadMatchData(selectedMatchId);
    }
  }, [selectedMatchId]);

  async function loadMatchData(mId) {
    try {
      const [liveRes, cardRes, xiRes] = await Promise.all([
        api.get(`/matches/${mId}/live`).catch(() => ({ data: { data: null } })),
        api.get(`/matches/${mId}/scorecard`).catch(() => ({ data: { data: null } })),
        api.get(`/matches/${mId}/playing-xi`).catch(() => ({ data: { data: null } }))
      ]);

      const live = liveRes.data.data;
      const card = cardRes.data.data;
      const xi = xiRes.data.data;

      setMatchDetails(live);
      setScorecardDetails(card);
      setPlayingXIDetails(xi);

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
    } catch (err) {
      console.error('Failed to load match details:', err);
    }
  }

  const handleShotZoneSelect = ({ zone, x = 0, y = 0 }) => {
    setShotZone(zone);
    setShotX(x);
    setShotY(y);
  };

  const handlePitchSelect = ({ pitchLength: len, pitchLine: line }) => {
    if (len) setPitchLength(len);
    if (line) setPitchLine(line);
  };

  async function handleUndoLastBall() {
    if (loading || !selectedMatchId) return;

    const confirmUndo = window.confirm(
      "Undo Last Delivery?\nThis will revert the latest delivery and all dependent match statistics."
    );
    if (!confirmUndo) return;

    setLoading(true);
    setStatusMsg(null);
    try {
      await api.post(`/matches/${selectedMatchId}/undo-last-ball`);
      setStatusMsg({
        type: 'success',
        text: 'Last delivery undone successfully ✓'
      });
      await loadMatchData(selectedMatchId);
    } catch (err) {
      console.error('Failed to undo ball:', err);
      setStatusMsg({
        type: 'error',
        text: err.response?.data?.message || 'Error undoing delivery.'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRecordBall(e) {
    if (e) e.preventDefault();

    if (loading) return; // Prevent double submission

    if (!matchDetails || !matchDetails.innings) {
      setStatusMsg({
        type: 'error',
        text: 'No active live innings found for this match.'
      });
      return;
    }

    const inningsId = matchDetails.innings.id;
    const strikerId = activeStrikerId || matchDetails.currentBatters?.striker?.id;
    const nonStrikerId = activeNonStrikerId || matchDetails.currentBatters?.nonStriker?.id;
    const bowlerId = activeBowlerId || matchDetails.currentBowling?.id;

    if (!strikerId || !bowlerId) {
      setStatusMsg({ type: 'error', text: 'Please ensure Striker and Bowler are selected.' });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    try {
      const isByeType = extraType === 'BYE' || extraType === 'LEG_BYE' || extraType === 'WIDE';
      const actualBatRuns = isByeType ? 0 : Number(batRuns) || 0;
      const actualExtraRuns = Number(extraRuns) || 0;

      const payload = {
        inningsId,
        batsmanId: strikerId,
        nonStrikerId: nonStrikerId || strikerId,
        bowlerId,
        batRuns: actualBatRuns,
        extraRuns: actualExtraRuns,
        extraType,
        isFreeHit: Boolean(isFreeHit),
        isWicket,
        wicketType: isWicket ? wicketType : null,
        dismissedPlayerId: isWicket ? (dismissedPlayerId || strikerId) : null,
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

      await api.post(`/innings/${inningsId}/balls`, payload);
      setStatusMsg({
        type: 'success',
        text: `Ball recorded successfully! (${extraType === 'BYE' ? `${actualExtraRuns}B` : extraType === 'LEG_BYE' ? `${actualExtraRuns}LB` : `${actualBatRuns}r`} to ${shotZone}${isWicket ? ' - WICKET!' : ''})`
      });

      // Reset Form Defaults
      setBatRuns(0);
      setExtraRuns(0);
      setExtraType('NONE');
      setIsWicket(false);
      setNewBatsmanId('');
      setFielderId('');
      setCommentary('');

      // Refresh Live State
      await loadMatchData(selectedMatchId);
    } catch (err) {
      console.error('Failed to record ball:', err);
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Error recording ball' });
    } finally {
      setLoading(false);
    }
  }

  const selectedMatch = matches.find(m => m.id === selectedMatchId) || matchDetails?.match;
  const innings = matchDetails?.innings || scorecardDetails?.innings || {};
  const score = matchDetails?.score || {};

  const battingTeamId = resolveBattingTeamId({
    innings,
    match: selectedMatch
  });

  const battingXIPlayers = getBattingXIPlayers({
    battingTeamId,
    playingXI: playingXIDetails,
    scorecardBatting: scorecardDetails?.batting,
    match: selectedMatch
  });

  const effectiveStrikerId = activeStrikerId || matchDetails?.currentBatters?.striker?.id;
  const effectiveNonStrikerId = activeNonStrikerId || matchDetails?.currentBatters?.nonStriker?.id;

  const eligibleStrikers = getEligibleStrikers({
    battingXIPlayers,
    currentNonStrikerId: effectiveNonStrikerId,
    currentStrikerId: effectiveStrikerId
  });

  const eligibleNonStrikers = getEligibleNonStrikers({
    battingXIPlayers,
    currentStrikerId: effectiveStrikerId,
    currentNonStrikerId: effectiveNonStrikerId
  });

  const eligibleIncomingBatters = getEligibleIncomingBatters({
    battingXIPlayers,
    currentStrikerId: effectiveStrikerId,
    currentNonStrikerId: effectiveNonStrikerId,
    dismissedPlayerId: (dismissedPlayerId || effectiveStrikerId)
  });

  const availableBowlers = scorecardDetails?.allBowlers || scorecardDetails?.bowling || [];

  const isOverEnd = Boolean(score.legalBalls > 0 && score.legalBalls % 6 === 0);
  const previousBowlerId = (isOverEnd && matchDetails?.currentBowling?.id)
    ? matchDetails.currentBowling.id
    : null;

  const isFreeHit = Boolean(
    matchDetails?.score?.isFreeHit ||
    matchDetails?.isFreeHit ||
    matchDetails?.score?.freeHitNextDelivery ||
    matchDetails?.freeHitNextDelivery ||
    (matchDetails?.recentBalls && matchDetails.recentBalls.length > 0 && matchDetails.recentBalls[0]?.extraType === 'NO_BALL')
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <Settings className="w-7 h-7 text-emerald-400" /> Official Ball-by-Ball Scorer Console
          </h1>
          <p className="text-gray-400 text-xs mt-1">Real-time match scoring terminal with Wagon Wheel & Pitch Map vector entry</p>
        </div>

        {/* Select Active Match */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-400">Active Match:</label>
          <select
            value={selectedMatchId}
            onChange={(e) => setSelectedMatchId(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-white rounded-lg p-2 text-xs font-semibold focus:border-emerald-500"
          >
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.teamA?.name} vs {m.teamB?.name} ({m.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${statusMsg.type === 'success'
            ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
            : 'bg-red-950/80 border border-red-500/50 text-red-300'
            }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {statusMsg.text}
        </div>
      )}

      {/* Badminton Match Console */}
      {matchDetails?.match?.tournament?.sport?.code === 'BADMINTON' && (
        <BadmintonScoringConsole matchId={selectedMatchId} />
      )}

      {/* Cricket Match Scoring Grid */}
      {matchDetails && matchDetails?.match?.tournament?.sport?.code !== 'BADMINTON' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Scoring Control Form */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleRecordBall} className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-6">
              {/* Live Score Strip */}
              <div className="p-4 bg-gray-900/90 rounded-xl border border-gray-800 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <span className="text-xs text-emerald-400 font-bold uppercase flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5" /> Innings {innings.inningsNumber || 1} • {innings.battingTeam?.name || (battingTeamId === selectedMatch?.teamAId ? selectedMatch?.teamA?.name : selectedMatch?.teamB?.name) || 'Batting'}
                  </span>
                  <div className="text-2xl font-black text-white font-mono mt-1">
                    {score.runs || 0}/{score.wickets || 0}
                    <span className="text-sm font-normal text-gray-400 ml-2">({score.overs || "0.0"} Overs)</span>
                  </div>
                </div>
                <div className="text-left sm:text-right text-xs font-mono">
                  <div className="text-gray-300 font-bold">CRR: {score.currentRunRate || '0.00'}</div>
                  {score.target && (
                    <div className="text-amber-400 font-bold">Target: {score.target} (RRR: {score.requiredRunRate || '0.00'})</div>
                  )}
                  {matchDetails?.currentBowling && (
                    <div className="text-gray-400 text-[11px] mt-0.5">
                      Bowler: <span className="text-white font-bold">{matchDetails.currentBowling.name}</span> ({matchDetails.currentBowling.overs || '0.0'} Ov | {matchDetails.currentBowling.wickets || 0} W | {matchDetails.currentBowling.runs || 0} R | {matchDetails.currentBowling.noBalls || 0} NB)
                    </div>
                  )}
                </div>
              </div>

              {/* FREE HIT Alert Banner */}
              {isFreeHit && (
                <div className="p-3.5 bg-gradient-to-r from-emerald-950/90 via-emerald-900/60 to-emerald-950/90 border-2 border-emerald-500/80 rounded-xl text-emerald-300 flex items-center justify-between shadow-lg glow-emerald animate-pulse">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="font-extrabold text-xs tracking-wider uppercase text-white flex items-center gap-1.5">
                      🟢 FREE HIT — Next delivery
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-emerald-900/90 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-400/40 uppercase">
                    Free Hit Active
                  </span>
                </div>
              )}

              {/* Active Players Selector Strip */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-gray-950/60 rounded-xl border border-gray-800">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-emerald-400 mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> Striker (*)
                  </label>
                  <select
                    value={activeStrikerId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setActiveStrikerId(val);
                      setDismissedPlayerId(val);
                    }}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded p-1.5 text-xs font-semibold focus:border-emerald-500"
                  >
                    {eligibleStrikers.length > 0 ? (
                      eligibleStrikers.map((b) => (
                        <option key={b.id || b.playerId} value={b.id || b.playerId}>
                          {b.name} ({b.runs}r, {b.balls}b)
                        </option>
                      ))
                    ) : (
                      <option value={activeStrikerId || ''}>
                        {matchDetails?.currentBatters?.striker?.name || 'No eligible striker'}
                      </option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> Non-Striker (*)
                  </label>
                  <select
                    value={activeNonStrikerId}
                    onChange={(e) => setActiveNonStrikerId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded p-1.5 text-xs font-semibold focus:border-gray-500"
                  >
                    {eligibleNonStrikers.length > 0 ? (
                      eligibleNonStrikers.map((b) => (
                        <option key={b.id || b.playerId} value={b.id || b.playerId}>
                          {b.name} ({b.runs}r, {b.balls}b)
                        </option>
                      ))
                    ) : (
                      <option value={activeNonStrikerId || ''}>
                        {matchDetails?.currentBatters?.nonStriker?.name || 'No eligible non-striker'}
                      </option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-amber-400 mb-1 flex items-center gap-1">
                    <Activity className="w-3 h-3" /> Bowler (*)
                  </label>
                  <select
                    value={activeBowlerId}
                    onChange={(e) => setActiveBowlerId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded p-1.5 text-xs font-semibold focus:border-amber-500"
                  >
                    <option value="">-- Select Eligible Bowler --</option>
                    {availableBowlers.length > 0 ? (
                      availableBowlers.map((b) => {
                        const isPrev = Boolean(previousBowlerId && (b.id === previousBowlerId || b.bowlerId === previousBowlerId));
                        return (
                          <option key={b.id || b.bowlerId} value={b.id || b.bowlerId} disabled={isPrev}>
                            {b.name} ({b.overs || '0.0'} ov, {b.wickets || 0}w, {b.runs || 0}r){isPrev ? ' (Consecutive - cannot bowl)' : ''}
                          </option>
                        );
                      })
                    ) : (
                      <option value={matchDetails?.currentBowling?.id || ''}>
                        {matchDetails?.currentBowling?.name || 'Bowler'}
                      </option>
                    )}
                  </select>
                </div>
              </div>

            {/* Extras Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Extras
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
                    className={`py-2 px-2.5 rounded-xl font-bold text-xs transition-all ${
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
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
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
                      key={r}
                      type="button"
                      onClick={() => {
                        setBatRuns(r);
                        setExtraRuns(0);
                      }}
                      className={`py-3 rounded-xl font-mono font-black text-base border transition-all ${
                        batRuns === r
                          ? r === 4 || r === 6
                            ? 'bg-amber-500 border-amber-400 text-black shadow-lg scale-105'
                            : 'bg-emerald-600 border-emerald-400 text-white shadow-lg scale-105'
                          : 'bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-700'
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
                      key={r}
                      type="button"
                      onClick={() => {
                        setBatRuns(0);
                        setExtraRuns(r);
                      }}
                      className={`py-3 rounded-xl font-mono font-black text-base border transition-all ${
                        Number(extraRuns) === r
                          ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg scale-105'
                          : 'bg-gray-900 border-gray-800 text-cyan-400 hover:border-cyan-700'
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
                      key={r}
                      type="button"
                      onClick={() => {
                        setBatRuns(0);
                        setExtraRuns(r);
                      }}
                      className={`py-3 rounded-xl font-mono font-black text-base border transition-all ${
                        Number(extraRuns) === r
                          ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg scale-105'
                          : 'bg-gray-900 border-gray-800 text-cyan-400 hover:border-cyan-700'
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
                      key={r}
                      type="button"
                      onClick={() => {
                        setBatRuns(0);
                        setExtraRuns(r);
                      }}
                      className={`py-3 rounded-xl font-mono font-black text-base border transition-all ${
                        Number(extraRuns) === r
                          ? 'bg-purple-600 border-purple-400 text-white shadow-lg scale-105'
                          : 'bg-gray-900 border-gray-800 text-purple-400 hover:border-purple-700'
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
                      key={r}
                      type="button"
                      onClick={() => {
                        setBatRuns(r);
                        setExtraRuns(1);
                      }}
                      className={`py-3 rounded-xl font-mono font-black text-base border transition-all ${
                        batRuns === r
                          ? 'bg-purple-600 border-purple-400 text-white shadow-lg scale-105'
                          : 'bg-gray-900 border-gray-800 text-purple-400 hover:border-purple-700'
                      }`}
                    >
                      {r === 0 ? 'Nb' : `${r + 1}Nb`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Wicket Toggle & Details */}
            <div className="p-4 bg-red-950/20 rounded-xl border border-red-500/30 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isWicket}
                  onChange={(e) => {
                    setIsWicket(e.target.checked);
                    if (!e.target.checked) {
                      setNewBatsmanId('');
                    }
                  }}
                  className="w-4 h-4 accent-red-500 rounded"
                />
                <span className="text-xs font-extrabold text-red-400 uppercase tracking-wider">Is Delivery A Wicket?</span>
              </label>

              {isWicket && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">Dismissal Type</label>
                    <select
                      value={wicketType}
                      onChange={(e) => setWicketType(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2 text-xs font-semibold"
                    >
                      <option value="BOWLED">BOWLED</option>
                      <option value="CAUGHT">CAUGHT</option>
                      <option value="LBW">LBW</option>
                      <option value="RUN_OUT">RUN OUT</option>
                      <option value="STUMPED">STUMPED</option>
                      <option value="HIT_WICKET">HIT WICKET</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">Dismissed Player</label>
                    <select
                      value={dismissedPlayerId}
                      onChange={(e) => setDismissedPlayerId(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2 text-xs font-semibold"
                    >
                      <option value={effectiveStrikerId}>
                        Striker ({eligibleStrikers.find(b => (b.id || b.playerId) === effectiveStrikerId)?.name || 'Active'})
                      </option>
                      {effectiveNonStrikerId && (
                        <option value={effectiveNonStrikerId}>
                          Non-Striker ({eligibleNonStrikers.find(b => (b.id || b.playerId) === effectiveNonStrikerId)?.name || 'Active'})
                        </option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">Incoming Next Batter</label>
                    <select
                      value={newBatsmanId}
                      onChange={(e) => setNewBatsmanId(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2 text-xs font-semibold focus:border-emerald-500"
                    >
                      <option value="">-- Select Next Batter --</option>
                      {eligibleIncomingBatters.length > 0 ? (
                        eligibleIncomingBatters.map((b) => (
                          <option key={b.id || b.playerId} value={b.id || b.playerId}>
                            {b.name} (#{b.jerseyNumber || b.battingOrder})
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No eligible batters available (All Out)</option>
                      )}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Commentary Field */}
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Custom Commentary Text</label>
              <input
                type="text"
                placeholder="e.g. Smashed over deep mid-wicket for a massive SIX!"
                value={commentary}
                onChange={(e) => setCommentary(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 text-xs font-semibold"
              />
            </div>

            {/* Action Buttons: Submit Delivery & Undo Last Delivery */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 py-4 rounded-xl text-white font-extrabold text-sm uppercase tracking-wider shadow-lg transition-all flex justify-center items-center gap-2 ${loading
                  ? 'bg-gray-700 cursor-not-allowed opacity-70'
                  : 'bg-emerald-600 hover:bg-emerald-500 glow-emerald'
                  }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Recording Ball...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" /> Submit & Broadcast Delivery
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleUndoLastBall}
                disabled={loading || !(score.totalBalls > 0 || (matchDetails?.recentBalls && matchDetails.recentBalls.length > 0))}
                className="px-5 py-4 rounded-xl text-amber-300 hover:text-white bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/40 hover:border-amber-400 font-extrabold text-xs uppercase tracking-wider transition-all flex justify-center items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Undo the most recent ball delivery"
              >
                <RotateCcw className="w-4 h-4" /> Undo Last Delivery
              </button>
            </div>
          </form>
        </div>

        {/* Right 1 Col: Wagon Wheel & Pitch Map Vector Pickers */}
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 uppercase">
                <PieChart className="w-4 h-4" /> Interactive Wagon Wheel
              </h3>
              {shotZone && (
                <span className="text-[11px] font-bold text-emerald-400 font-mono bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-500/30">
                  {shotZone}
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                Shot Placement / Wagon Wheel Zone
              </label>
              <select
                value={shotZone}
                onChange={(e) => {
                  const zone = e.target.value;
                  const coords = CANONICAL_ZONE_COORDS[zone] || { x: 0, y: 0 };
                  handleShotZoneSelect({ zone, x: coords.x, y: coords.y });
                }}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 text-xs font-semibold focus:border-emerald-500"
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
              selectedZone={shotZone}
              selectedX={shotX}
              selectedY={shotY}
              onSelectZone={handleShotZoneSelect}
              isInteractive={true}
            />
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-3">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-1.5 uppercase">
              <Target className="w-4 h-4" /> Pitch Length & Line Vector
            </h3>
            <PitchMapCanvas
              selectedLength={pitchLength}
              selectedLine={pitchLine}
              onSelectPitch={handlePitchSelect}
              isInteractive={true}
            />
          </div>
        </div>
      </div>
      )}
    </div>
  );
}