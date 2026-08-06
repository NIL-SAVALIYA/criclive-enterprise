import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import WagonWheelSVG from '../components/WagonWheelSVG';
import PitchMapCanvas from '../components/PitchMapCanvas';
import { Play, Settings, Shield, Target, PieChart, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminScoringConsole() {
  const [searchParams] = useSearchParams();
  const urlMatchId = searchParams.get('matchId');

  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [matchDetails, setMatchDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  // Ball Form State
  const [batRuns, setBatRuns] = useState(0);
  const [extraRuns, setExtraRuns] = useState(0);
  const [extraType, setExtraType] = useState('NONE');
  const [isWicket, setIsWicket] = useState(false);
  const [wicketType, setWicketType] = useState('BOWLED');
  const [commentary, setCommentary] = useState('');
  const [shotZone, setShotZone] = useState('Mid Wicket');
  const [shotX, setShotX] = useState(0);
  const [shotY, setShotY] = useState(0);
  const [pitchLength, setPitchLength] = useState('Good');
  const [pitchLine, setPitchLine] = useState('Stumps');

  useEffect(() => {
    async function loadMatches() {
      try {
        const res = await api.get('/matches');
        const list = res.data.data || [];
        setMatches(list);

        if (list.length > 0) {
          // Priority 1: Match ID from URL parameter
          let targetMatch = urlMatchId ? list.find(m => m.id === urlMatchId) : null;

          // Priority 2: First LIVE match
          if (!targetMatch) {
            targetMatch = list.find(m => m.status === 'LIVE');
          }

          // Priority 3: First UPCOMING match
          if (!targetMatch) {
            targetMatch = list.find(m => m.status === 'UPCOMING');
          }

          // Priority 4: First match in returned list
          if (!targetMatch) {
            targetMatch = list[0];
          }

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
      loadMatchDetails(selectedMatchId);
    }
  }, [selectedMatchId]);

  async function loadMatchDetails(mId) {
    try {
      const res = await api.get(`/matches/${mId}/live`);
      console.log("LIVE MATCH DATA:", res.data.data);
      setMatchDetails(res.data.data);
    } catch (err) {
      console.error('Failed to load match live status:', err);
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

  async function handleRecordBall(e) {
    e.preventDefault();
    if (!matchDetails || !matchDetails.innings) {
      setStatusMsg({
        type: 'error',
        text: 'No active live innings found for this match.'
      });
      return;
    }

    const inningsId = matchDetails.innings.id;

    const strikerId = matchDetails.currentBatters?.striker?.id;

    const nonStrikerId = matchDetails.currentBatters?.nonStriker?.id;

    const bowlerId = matchDetails.currentBowling?.id;

    if (!strikerId || !bowlerId) {
      setStatusMsg({ type: 'error', text: 'Please ensure Striker and Bowler are assigned in Playing XI.' });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    try {
      const payload = {
        inningsId,
        batsmanId: strikerId,
        nonStrikerId: nonStrikerId || strikerId,
        bowlerId,
        batRuns: Number(batRuns),
        extraRuns: Number(extraRuns),
        extraType,
        isWicket,
        wicketType: isWicket ? wicketType : null,
        commentary: commentary || `${batRuns} runs scored to ${shotZone}`,
        shotZone,
        shotX,
        shotY,
        pitchLength,
        pitchLine
      };

      await api.post(`/innings/${inningsId}/balls`, payload);
      setStatusMsg({ type: 'success', text: `Ball recorded successfully! (${batRuns} runs to ${shotZone})` });

      // Reset Form Defaults
      setBatRuns(0);
      setExtraRuns(0);
      setExtraType('NONE');
      setIsWicket(false);
      setCommentary('');

      // Refresh Live Match Details
      loadMatchDetails(selectedMatchId);
    } catch (err) {
      console.error('Failed to record ball:', err);
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Error recording ball' });
    } finally {
      setLoading(false);
    }
  }

  const innings = matchDetails?.innings || {};
  const score = matchDetails?.score || {};
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
            className="bg-gray-900 border border-gray-700 text-white rounded-lg p-2 text-xs font-semibold"
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

      {/* Main Scorer Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Scoring Control Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleRecordBall} className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-6">
            {/* Live Score Strip */}
            <div className="p-4 bg-gray-900/90 rounded-xl border border-gray-800 flex justify-between items-center">
              <div>
                <span className="text-xs text-emerald-400 font-bold uppercase">Innings {innings.inningsNumber || 1}</span>
                <div className="text-2xl font-black text-white font-mono">
                  {score.runs || 0}/{score.wickets || 0}
                  <span className="text-sm font-normal text-gray-400 ml-2">({score.overs || "0.0"} Overs)</span>
                </div>
              </div>
              <div className="text-right text-xs font-mono">
                <div className="text-gray-300"></div>
              </div>
            </div>

            {/* Run Buttons */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">Runs Scored</label>
              <div className="grid grid-cols-6 gap-2">
                {[0, 1, 2, 3, 4, 6].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setBatRuns(r)}
                    className={`py-3 rounded-xl font-mono font-black text-base border transition-all ${batRuns === r
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
            </div>

            {/* Extras Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Extra Type</label>
                <select
                  value={extraType}
                  onChange={(e) => setExtraType(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 text-xs font-semibold"
                >
                  <option value="NONE">NONE (Legal Delivery)</option>
                  <option value="WIDE">WIDE</option>
                  <option value="NO_BALL">NO BALL</option>
                  <option value="BYE">BYE</option>
                  <option value="LEG_BYE">LEG BYE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Extra Runs</label>
                <input
                  type="number"
                  min="0"
                  value={extraRuns}
                  onChange={(e) => setExtraRuns(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 text-xs font-semibold"
                />
              </div>
            </div>

            {/* Wicket Toggle */}
            <div className="p-4 bg-red-950/20 rounded-xl border border-red-500/30 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isWicket}
                  onChange={(e) => setIsWicket(e.target.checked)}
                  className="w-4 h-4 accent-red-500 rounded"
                />
                <span className="text-xs font-extrabold text-red-400 uppercase tracking-wider">Is Delivery A Wicket?</span>
              </label>

              {isWicket && (
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm uppercase tracking-wider shadow-lg glow-emerald transition-all flex justify-center items-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" /> Submit & Broadcast Ball Delivery
            </button>
          </form>
        </div>

        {/* Right 1 Col: Wagon Wheel & Pitch Map Vector Pickers */}
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-3">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 uppercase">
              <PieChart className="w-4 h-4" /> Interactive Wagon Wheel Field Zone
            </h3>
            <WagonWheelSVG selectedZone={shotZone} onSelectZone={handleShotZoneSelect} isInteractive={true} />
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
    </div>
  );
}
