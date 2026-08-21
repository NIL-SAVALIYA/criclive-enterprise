import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Trophy, Users, CheckCircle, ArrowRight, Save, Flag, Activity } from 'lucide-react';
import Skeleton from '../components/Skeleton';
import BadmintonScoringConsole from '../components/BadmintonScoringConsole';

export default function MatchControlCenter() {
  const { matchId } = useParams();
  const navigate = useNavigate();

  const [match, setMatch] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [tossWinnerId, setTossWinnerId] = useState('');
  const [tossDecision, setTossDecision] = useState('BAT');

  // Playing XI states
  const [teamAXI, setTeamAXI] = useState([]);
  const [teamBXI, setTeamBXI] = useState([]);

  // Opening players
  const [strikerId, setStrikerId] = useState('');
  const [nonStrikerId, setNonStrikerId] = useState('');
  const [bowlerId, setBowlerId] = useState('');

  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [matchId]);

  async function fetchData() {
    setLoading(true);
    try {
      const [matchRes, playersRes, playingXIRes] = await Promise.all([
        api.get(`/matches/${matchId}`),
        api.get('/players'),
        api.get(`/matches/${matchId}/playing-xi`).catch(() => ({ data: { data: null } }))
      ]);
      const matchData = matchRes.data.data;
      setMatch(matchData);
      setPlayers(playersRes.data.data);

      if (matchData.tossWinnerId) {
        setTossWinnerId(matchData.tossWinnerId);
        setTossDecision(matchData.tossDecision || 'BAT');
      }

      const xiData = playingXIRes?.data?.data;
      if (xiData) {
        // Restore Team A XI if saved
        const teamAPlayersList = xiData.teamA?.players || (Array.isArray(xiData.playingXI) ? xiData.playingXI.filter(p => p.teamId === matchData.teamAId) : []);
        if (teamAPlayersList && teamAPlayersList.length > 0) {
          const sortedTeamA = [...teamAPlayersList].sort((a, b) => a.battingOrder - b.battingOrder);
          setTeamAXI(sortedTeamA.map(p => p.playerId));
        }

        // Restore Team B XI if saved
        const teamBPlayersList = xiData.teamB?.players || (Array.isArray(xiData.playingXI) ? xiData.playingXI.filter(p => p.teamId === matchData.teamBId) : []);
        if (teamBPlayersList && teamBPlayersList.length > 0) {
          const sortedTeamB = [...teamBPlayersList].sort((a, b) => a.battingOrder - b.battingOrder);
          setTeamBXI(sortedTeamB.map(p => p.playerId));
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch match details');
    } finally {
      setLoading(false);
    }
  }

  // Derived data
  const teamAPlayers = match ? players.filter(p => p.teamId === match.teamAId) : [];
  const teamBPlayers = match ? players.filter(p => p.teamId === match.teamBId) : [];

  const battingTeamId = tossDecision === 'BAT'
    ? tossWinnerId
    : (tossWinnerId === match?.teamAId ? match?.teamBId : match?.teamAId);

  const bowlingTeamId = tossDecision === 'BOWL'
    ? tossWinnerId
    : (tossWinnerId === match?.teamAId ? match?.teamBId : match?.teamAId);

  const battingTeamXI = battingTeamId === match?.teamAId ? teamAXI : teamBXI;
  const bowlingTeamXI = bowlingTeamId === match?.teamAId ? teamAXI : teamBXI;

  const togglePlayer = (team, playerId) => {
    if (team === 'A') {
      if (teamAXI.includes(playerId)) {
        setTeamAXI(teamAXI.filter(id => id !== playerId));
      } else if (teamAXI.length < 11) {
        setTeamAXI([...teamAXI, playerId]);
      }
    } else {
      if (teamBXI.includes(playerId)) {
        setTeamBXI(teamBXI.filter(id => id !== playerId));
      } else if (teamBXI.length < 11) {
        setTeamBXI([...teamBXI, playerId]);
      }
    }
  };

  async function handleStartMatch() {
    if (!tossWinnerId) return setError("Please select toss winner");
    if (teamAXI.length !== 11 || teamBXI.length !== 11) return setError("Both teams must select exactly 11 players");
    if (!strikerId || !nonStrikerId || !bowlerId) return setError("Please select opening players");
    if (strikerId === nonStrikerId) return setError("Striker and Non-Striker must be different");

    setSubmitting(true);
    setError('');

    try {
      // 1. Save Toss (only if not already recorded on the match)
      if (!match.tossWinnerId) {
        await api.post(`/matches/${matchId}/toss`, {
          winnerTeamId: tossWinnerId,
          decision: tossDecision
        });
      }

      // 2. Save/Update Playing XI for Team A & Team B separately (11 players per team, exactly 1 captain)
      const formatXI = (xi) => xi.map((playerId, i) => ({
        playerId,
        battingOrder: i + 1,
        isCaptain: i === 0,
        isWicketKeeper: i === 1
      }));

      await api.put(`/matches/${matchId}/playing-xi`, {
        teamId: match.teamAId,
        players: formatXI(teamAXI)
      });

      await api.put(`/matches/${matchId}/playing-xi`, {
        teamId: match.teamBId,
        players: formatXI(teamBXI)
      });

      // 3. Start Match
      await api.post(`/matches/${matchId}/start`, {
        strikerId,
        nonStrikerId,
        bowlerId
      });

      navigate(`/admin/scorer?matchId=${matchId}`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to start match');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-8 space-y-4"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-32" /></div>;
  }

  if (!match) {
    return <div className="p-8 text-white">Match not found</div>;
  }

  if (match.tournament?.sport?.code === 'BADMINTON') {
    return <BadmintonScoringConsole matchId={matchId} />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
          <Activity className="w-8 h-8 text-emerald-400" /> Match Control Center
        </h1>
        <p className="text-gray-400 text-sm mt-1">Configure match settings, toss, playing XI, and opening players before starting</p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm font-semibold">
          {error}
        </div>
      )}

      {/* SECTION 1: Match Info */}
      <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-2">
          <Trophy className="w-5 h-5 text-amber-400" /> Match Information
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-xs text-gray-400 font-semibold uppercase">Teams</div>
            <div className="font-bold text-white mt-1">{match.teamA?.shortName} vs {match.teamB?.shortName}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 font-semibold uppercase">Venue</div>
            <div className="font-bold text-white mt-1">{match.venue}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 font-semibold uppercase">Status</div>
            <div className="font-bold text-emerald-400 mt-1">{match.status}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 font-semibold uppercase">Scheduled Time</div>
            <div className="font-bold text-white mt-1">{new Date(match.matchDate).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Toss */}
      <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-2">
          <Flag className="w-5 h-5 text-blue-400" /> Toss Management
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Toss Winner</label>
            <select
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 outline-none focus:border-emerald-500"
              value={tossWinnerId}
              onChange={(e) => setTossWinnerId(e.target.value)}
            >
              <option value="">Select Toss Winner</option>
              <option value={match.teamAId}>{match.teamA?.name}</option>
              <option value={match.teamBId}>{match.teamB?.name}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Decision</label>
            <div className="flex gap-4">
              <label className="flex-1">
                <input
                  type="radio"
                  name="tossDecision"
                  value="BAT"
                  checked={tossDecision === 'BAT'}
                  onChange={() => setTossDecision('BAT')}
                  className="hidden peer"
                />
                <div className="w-full p-3 text-center rounded-lg border border-gray-700 text-gray-400 font-bold peer-checked:bg-blue-600 peer-checked:border-blue-500 peer-checked:text-white cursor-pointer transition-all">
                  BAT
                </div>
              </label>
              <label className="flex-1">
                <input
                  type="radio"
                  name="tossDecision"
                  value="BOWL"
                  checked={tossDecision === 'BOWL'}
                  onChange={() => setTossDecision('BOWL')}
                  className="hidden peer"
                />
                <div className="w-full p-3 text-center rounded-lg border border-gray-700 text-gray-400 font-bold peer-checked:bg-blue-600 peer-checked:border-blue-500 peer-checked:text-white cursor-pointer transition-all">
                  Bowl First
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Playing XI */}
      <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-2">
          <Users className="w-5 h-5 text-purple-400" /> Playing XI Selection
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Team A XI */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-white">{match.teamA?.name}</h3>
              <span className={`text-xs font-bold px-2 py-1 rounded-md ${teamAXI.length === 11 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-400'}`}>
                {teamAXI.length} / 11 Selected
              </span>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {teamAPlayers.map(p => (
                <div
                  key={p.id}
                  onClick={() => togglePlayer('A', p.id)}
                  className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center transition-all ${teamAXI.includes(p.id) ? 'bg-emerald-900/30 border-emerald-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600'}`}
                >
                  <div className="font-semibold text-sm">{p.firstName} {p.lastName}</div>
                  {teamAXI.includes(p.id) && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                </div>
              ))}
            </div>
          </div>

          {/* Team B XI */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-white">{match.teamB?.name}</h3>
              <span className={`text-xs font-bold px-2 py-1 rounded-md ${teamBXI.length === 11 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-400'}`}>
                {teamBXI.length} / 11 Selected
              </span>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {teamBPlayers.map(p => (
                <div
                  key={p.id}
                  onClick={() => togglePlayer('B', p.id)}
                  className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center transition-all ${teamBXI.includes(p.id) ? 'bg-emerald-900/30 border-emerald-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600'}`}
                >
                  <div className="font-semibold text-sm">{p.firstName} {p.lastName}</div>
                  {teamBXI.includes(p.id) && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 4: Opening Players */}
      {tossWinnerId && teamAXI.length === 11 && teamBXI.length === 11 && (
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-2">
            <Activity className="w-5 h-5 text-emerald-400" /> Opening Players
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Striker</label>
              <select
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 outline-none focus:border-emerald-500"
                value={strikerId}
                onChange={(e) => setStrikerId(e.target.value)}
              >
                <option value="">Select Striker</option>
                {players.filter(p => battingTeamXI.includes(p.id)).map(p => (
                  <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Non-Striker</label>
              <select
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 outline-none focus:border-emerald-500"
                value={nonStrikerId}
                onChange={(e) => setNonStrikerId(e.target.value)}
              >
                <option value="">Select Non-Striker</option>
                {players.filter(p => battingTeamXI.includes(p.id)).map(p => (
                  <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Opening Bowler</label>
              <select
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 outline-none focus:border-emerald-500"
                value={bowlerId}
                onChange={(e) => setBowlerId(e.target.value)}
              >
                <option value="">Select Bowler</option>
                {players.filter(p => bowlingTeamXI.includes(p.id)).map(p => (
                  <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: Start Match */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleStartMatch}
          disabled={submitting || !tossWinnerId || teamAXI.length !== 11 || teamBXI.length !== 11 || !strikerId || !nonStrikerId || !bowlerId}
          className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all"
        >
          {submitting ? 'Starting Match...' : 'START MATCH'}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

    </div>
  );
}
