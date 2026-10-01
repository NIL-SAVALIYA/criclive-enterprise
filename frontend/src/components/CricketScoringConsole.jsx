import React, { useEffect, useState } from 'react';
import api from '../api/client';
import WagonWheelSVG, { CANONICAL_ZONES, CANONICAL_ZONE_COORDS } from './WagonWheelSVG';
import PitchMapCanvas from './PitchMapCanvas';
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

export default function CricketScoringConsole({ matchId, initialMatch }) {
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
  const socketData = useCricketSocket(matchId);

  useEffect(() => {
    if (socketData.liveScore) {
      setMatchDetails((prev) => ({
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
    if (matchId) {
      loadMatchData(matchId);
    }
  }, [matchId]);

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
      console.error('Failed to load cricket match data:', err);
    }
  }

  async function handleUndoDelivery() {
    if (!matchId) return;
    setLoading(true);
    setStatusMsg(null);
    try {
      await api.post(`/matches/${matchId}/undo-last-ball`);
      setStatusMsg({ type: 'success', text: 'Most recent delivery undone successfully!' });
      await loadMatchData(matchId);
    } catch (err) {
      console.error('Undo delivery failed:', err);
      setStatusMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to undo last delivery.'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRecordBall(e) {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    try {
      const inningsId = matchDetails?.innings?.id || scorecardDetails?.innings?.id;
      if (!inningsId) {
        setStatusMsg({ type: 'error', text: 'No active innings found for scoring.' });
        setLoading(false);
        return;
      }

      const payload = {
        batsmanId: effectiveStrikerId,
        nonStrikerId: effectiveNonStrikerId,
        bowlerId: activeBowlerId || matchDetails?.currentBowling?.id,
        batRuns: Number(batRuns),
        extraRuns: Number(extraRuns),
        extraType,
        isWicket: Boolean(isWicket),
        wicketType: isWicket ? wicketType : undefined,
        dismissedPlayerId: isWicket ? (dismissedPlayerId || effectiveStrikerId) : undefined,
        newBatsmanId: isWicket ? (newBatsmanId || undefined) : undefined,
        fielderId: isWicket && ['CAUGHT', 'RUN_OUT', 'STUMPED'].includes(wicketType) && fielderId ? fielderId : undefined,
        commentary: commentary.trim() || undefined,
        shotZone,
        shotX: Number(shotX),
        shotY: Number(shotY),
        pitchLength,
        pitchLine
      };

      if (!payload.batsmanId || !payload.nonStrikerId || !payload.bowlerId) {
        setStatusMsg({ type: 'error', text: 'Please ensure Striker, Non-Striker and Bowler are assigned.' });
        setLoading(false);
        return;
      }

      await api.post(`/innings/${inningsId}/balls`, payload);
      setStatusMsg({ type: 'success', text: 'Ball recorded successfully!' });

      // Reset Ball Specific Inputs
      setBatRuns(0);
      setExtraRuns(0);
      setExtraType('NONE');
      setIsWicket(false);
      setNewBatsmanId('');
      setFielderId('');
      setCommentary('');

      await loadMatchData(matchId);
    } catch (err) {
      console.error('Failed to record ball:', err);
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Error recording ball' });
    } finally {
      setLoading(false);
    }
  }

  const selectedMatch = initialMatch || matchDetails?.match;
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
    <div className="space-y-6">
      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
              : 'bg-red-950/80 border border-red-500/50 text-red-300'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {statusMsg.text}
        </div>
      )}

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
                  {score.runs ?? 0}/{score.wickets ?? 0}
                  <span className="text-sm text-gray-400 font-sans ml-2">({score.overs ?? 0} Overs)</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isFreeHit && (
                  <span className="px-3 py-1 bg-emerald-600 border border-emerald-400 text-white font-mono font-bold text-xs rounded-full shadow-lg glow-emerald animate-pulse">
                    🟢 FREE HIT NEXT
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleUndoDelivery}
                  disabled={loading}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                  title="Undo last recorded delivery"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> Undo Last Ball
                </button>
              </div>
            </div>

            {/* Active Players Assignment Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-gray-950/40 border border-gray-800/80">
              {/* Striker Select */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                  ⚡ Striker Batter
                </label>
                <select
                  value={effectiveStrikerId || ''}
                  onChange={(e) => setActiveStrikerId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs font-semibold text-white focus:border-emerald-500"
                >
                  {eligibleStrikers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} {p.jerseyNumber ? `(#${p.jerseyNumber})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Non-Striker Select */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-blue-400 flex items-center gap-1">
                  🛡️ Non-Striker Batter
                </label>
                <select
                  value={effectiveNonStrikerId || ''}
                  onChange={(e) => setActiveNonStrikerId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs font-semibold text-white focus:border-blue-500"
                >
                  {eligibleNonStrikers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} {p.jerseyNumber ? `(#${p.jerseyNumber})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Active Bowler Select */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                  🎯 Active Bowler
                </label>
                <select
                  value={activeBowlerId || matchDetails?.currentBowling?.id || ''}
                  onChange={(e) => setActiveBowlerId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs font-semibold text-white focus:border-amber-500"
                >
                  {availableBowlers.map((b) => {
                    const bPlayer = b.player || b;
                    const isPrev = previousBowlerId === bPlayer.id;
                    return (
                      <option key={bPlayer.id} value={bPlayer.id} disabled={isPrev}>
                        {bPlayer.firstName} {bPlayer.lastName} {isPrev ? '(Just Bowled)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Runs & Boundaries Fast Buttons */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300">Bat Runs Off Delivery</label>
              <div className="grid grid-cols-7 gap-2">
                {[0, 1, 2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setBatRuns(num)}
                    className={`py-3 rounded-xl font-mono text-sm font-bold border transition-all ${
                      batRuns === num
                        ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg glow-emerald scale-105'
                        : 'bg-gray-900/80 border-gray-800 text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Extras Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-300">Extra Type</label>
                <select
                  value={extraType}
                  onChange={(e) => setExtraType(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-xs text-white"
                >
                  <option value="NONE">None</option>
                  <option value="WIDE">Wide</option>
                  <option value="NO_BALL">No Ball</option>
                  <option value="BYE">Bye</option>
                  <option value="LEG_BYE">Leg Bye</option>
                  <option value="PENALTY">Penalty</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-300">Extra Runs</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={extraRuns}
                  onChange={(e) => setExtraRuns(Number(e.target.value))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-xs text-white"
                />
              </div>
            </div>

            {/* Dismissal Toggle & Options */}
            <div className="p-4 rounded-xl border border-gray-800 bg-gray-900/40 space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="wicket-toggle"
                  checked={isWicket}
                  onChange={(e) => setIsWicket(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-gray-800 border-gray-700"
                />
                <label htmlFor="wicket-toggle" className="text-xs font-bold text-red-400 cursor-pointer">
                  Wicket Dismissal Occurred on Delivery
                </label>
              </div>

              {isWicket && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-400">Dismissal Type</label>
                    <select
                      value={wicketType}
                      onChange={(e) => setWicketType(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white"
                    >
                      <option value="BOWLED">Bowled</option>
                      <option value="CAUGHT">Caught</option>
                      <option value="LBW">LBW</option>
                      <option value="RUN_OUT">Run Out</option>
                      <option value="STUMPED">Stumped</option>
                      <option value="HIT_WICKET">Hit Wicket</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-400">Dismissed Batter</label>
                    <select
                      value={dismissedPlayerId || effectiveStrikerId || ''}
                      onChange={(e) => setDismissedPlayerId(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white"
                    >
                      <option value={effectiveStrikerId}>Striker</option>
                      <option value={effectiveNonStrikerId}>Non-Striker</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-400">Incoming Batter</label>
                    <select
                      value={newBatsmanId}
                      onChange={(e) => setNewBatsmanId(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white"
                    >
                      <option value="">Select Next Batter...</option>
                      {eligibleIncomingBatters.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.firstName} {p.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Commentary */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-300">Live Commentary Line</label>
              <input
                type="text"
                placeholder="e.g. Edged and taken! Magnificent delivery outside off stump."
                value={commentary}
                onChange={(e) => setCommentary(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-xs text-white placeholder-gray-500 focus:border-emerald-500"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg glow-emerald transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />} Record Delivery
            </button>
          </form>
        </div>

        {/* Right 1 Col: Vector Mapping Inputs (Wagon Wheel & Pitch Map) */}
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-400" /> Wagon Wheel Vector Input
            </h3>
            <div className="flex justify-center">
              <WagonWheelSVG
                interactive={true}
                selectedZone={shotZone}
                selectedCoords={{ x: shotX, y: shotY }}
                onSelectCoord={({ zone, x, y }) => {
                  setShotZone(zone);
                  setShotX(Math.round(x));
                  setShotY(Math.round(y));
                }}
              />
            </div>
            <div className="text-[11px] text-gray-400 flex justify-between font-mono bg-gray-900/60 p-2 rounded-lg border border-gray-800">
              <span>Zone: <strong className="text-emerald-400 font-sans">{shotZone}</strong></span>
              <span>Coord: [{shotX}, {shotY}]</span>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-blue-400" /> Pitch Map Vector Input
            </h3>
            <div className="flex justify-center">
              <PitchMapCanvas
                interactive={true}
                selectedLength={pitchLength}
                selectedLine={pitchLine}
                onSelectLocation={({ length, line }) => {
                  setPitchLength(length);
                  setPitchLine(line);
                }}
              />
            </div>
            <div className="text-[11px] text-gray-400 flex justify-between font-mono bg-gray-900/60 p-2 rounded-lg border border-gray-800">
              <span>Length: <strong className="text-blue-400 font-sans">{pitchLength}</strong></span>
              <span>Line: <strong className="text-blue-400 font-sans">{pitchLine}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
