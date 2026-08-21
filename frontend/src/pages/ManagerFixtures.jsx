import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Skeleton from '../components/Skeleton';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Filter,
  Trophy,
  Award,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Edit3,
  Check,
  Radio,
  ArrowRight,
  PlusCircle,
  CheckCircle,
  XCircle,
  Activity,
  Send
} from 'lucide-react';

export default function ManagerFixtures() {
  const { user, isManager } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [fixturesData, setFixturesData] = useState({
    pending: [],
    upcoming: [],
    live: [],
    completed: [],
    counts: { pending: 0, upcoming: 0, live: 0, completed: 0 }
  });

  const [activeTab, setActiveTab] = useState('upcoming'); // 'pending' | 'upcoming' | 'live' | 'completed'
  const [playingXIStatusMap, setPlayingXIStatusMap] = useState({});

  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Decline Dialog Modal State
  const [declineModal, setDeclineModal] = useState({ open: false, assignmentId: null, reason: '' });
  const [actionLoading, setActionLoading] = useState(false);

  // Playing XI Modal State
  const [showXIModal, setShowXIModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamRoster, setTeamRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [savingXI, setSavingXI] = useState(false);
  const [xiSelection, setXiSelection] = useState({});

  useEffect(() => {
    fetchManagerFixtures();
  }, [user]);

  async function fetchManagerFixtures() {
    if (!user) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/managers/me/fixtures');
      const data = res.data.data;
      setFixturesData(data);

      // Auto switch to pending tab if there are pending requests and no upcoming
      if (data.counts.pending > 0 && data.counts.upcoming === 0) {
        setActiveTab('pending');
      }

      // Fetch Playing XI status for all upcoming and live assignments
      const activeAssignments = [...data.upcoming, ...data.live];
      fetchPlayingXIStatuses(activeAssignments);
    } catch (err) {
      console.error('Failed to load manager fixtures:', err);
      // If 404, user doesn't have a manager profile
      if (err.response?.status === 404) {
        navigate('/manager/register');
      } else {
        setErrorMsg(err.response?.data?.message || 'Failed to load manager fixtures.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchPlayingXIStatuses(assignments) {
    const statusMap = {};
    await Promise.all(
      assignments.map(async (assignment) => {
        const matchId = assignment.matchId;
        const teamId = assignment.teamId;
        try {
          const res = await api.get(`/matches/${matchId}/playing-xi`);
          const xiData = res.data.data;
          const isTeamA = assignment.match.teamAId === teamId;
          const myTeamXI = isTeamA ? xiData?.teamA?.players : xiData?.teamB?.players;
          const opponentXI = isTeamA ? xiData?.teamB?.players : xiData?.teamA?.players;

          statusMap[matchId] = {
            myTeamCount: myTeamXI?.length || 0,
            myTeamReady: myTeamXI?.length === 11,
            myTeamPlayers: myTeamXI || [],
            opponentCount: opponentXI?.length || 0,
            opponentReady: opponentXI?.length === 11,
            isReady: xiData?.isReady || false
          };
        } catch {
          statusMap[matchId] = {
            myTeamCount: 0,
            myTeamReady: false,
            myTeamPlayers: [],
            opponentCount: 0,
            opponentReady: false,
            isReady: false
          };
        }
      })
    );
    setPlayingXIStatusMap(statusMap);
  }

  async function handleAcceptAssignment(assignmentId) {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await api.post(`/manager-assignments/${assignmentId}/accept`);
      setSuccessMsg('Manager assignment accepted successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
      await fetchManagerFixtures();
    } catch (err) {
      console.error('Accept assignment error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to accept assignment.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeclineAssignment() {
    if (!declineModal.assignmentId) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await api.post(`/manager-assignments/${declineModal.assignmentId}/decline`, {
        reason: declineModal.reason || undefined
      });
      setSuccessMsg('Manager assignment request declined.');
      setDeclineModal({ open: false, assignmentId: null, reason: '' });
      setTimeout(() => setSuccessMsg(null), 4000);
      await fetchManagerFixtures();
    } catch (err) {
      console.error('Decline assignment error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to decline assignment.');
    } finally {
      setActionLoading(false);
    }
  }

  async function openPlayingXIModal(assignment) {
    const match = assignment.match;
    const team = assignment.team;
    setSelectedMatch(match);
    setSelectedTeam(team);
    setShowXIModal(true);
    setRosterLoading(true);
    setErrorMsg(null);

    try {
      // 1. Fetch team players
      const teamRes = await api.get(`/teams/${team.id}`);
      const players = teamRes.data.data?.players || [];
      setTeamRoster(players);

      // 2. Fetch existing Playing XI
      const xiRes = await api.get(`/matches/${match.id}/playing-xi`);
      const isTeamA = match.teamAId === team.id;
      const existingXI = isTeamA
        ? xiRes.data.data?.teamA?.players || []
        : xiRes.data.data?.teamB?.players || [];

      // 3. Populate selection state
      const initialSelection = {};
      players.forEach((player) => {
        const found = existingXI.find((p) => p.playerId === player.id);
        if (found) {
          initialSelection[player.id] = {
            selected: true,
            battingOrder: found.battingOrder || 1,
            isCaptain: Boolean(found.isCaptain),
            isWicketKeeper: Boolean(found.isWicketKeeper)
          };
        } else {
          initialSelection[player.id] = {
            selected: false,
            battingOrder: 1,
            isCaptain: false,
            isWicketKeeper: false
          };
        }
      });

      setXiSelection(initialSelection);
    } catch (err) {
      console.error('Failed to load roster:', err);
      setErrorMsg('Failed to load team roster or existing Playing XI.');
    } finally {
      setRosterLoading(false);
    }
  }

  function handleTogglePlayer(playerId) {
    const current = xiSelection[playerId] || { selected: false };
    const currentlySelectedCount = Object.values(xiSelection).filter((s) => s.selected).length;

    if (!current.selected && currentlySelectedCount >= 11) {
      setErrorMsg('You can select a maximum of 11 players for the Playing XI.');
      return;
    }

    setErrorMsg(null);
    setXiSelection((prev) => {
      const nextSelected = !current.selected;
      let newBattingOrder = current.battingOrder;
      if (nextSelected) {
        // Auto assign next available batting order
        const usedOrders = new Set(
          Object.values(prev)
            .filter((s) => s.selected)
            .map((s) => s.battingOrder)
        );
        for (let i = 1; i <= 11; i++) {
          if (!usedOrders.has(i)) {
            newBattingOrder = i;
            break;
          }
        }
      }

      return {
        ...prev,
        [playerId]: {
          ...current,
          selected: nextSelected,
          battingOrder: newBattingOrder,
          isCaptain: nextSelected ? current.isCaptain : false,
          isWicketKeeper: nextSelected ? current.isWicketKeeper : false
        }
      };
    });
  }

  function handleSetCaptain(playerId) {
    setXiSelection((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        next[id] = { ...next[id], isCaptain: id === playerId };
      });
      return next;
    });
  }

  function handleSetWicketKeeper(playerId) {
    setXiSelection((prev) => {
      const next = { ...prev };
      const currentVal = next[playerId]?.isWicketKeeper;
      Object.keys(next).forEach((id) => {
        next[id] = { ...next[id], isWicketKeeper: id === playerId ? !currentVal : false };
      });
      return next;
    });
  }

  function handleBattingOrderChange(playerId, newOrder) {
    const orderNum = parseInt(newOrder, 10);
    if (isNaN(orderNum) || orderNum < 1 || orderNum > 11) return;

    setXiSelection((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        battingOrder: orderNum
      }
    }));
  }

  // Validate Playing XI
  const selectedPlayersList = Object.entries(xiSelection)
    .filter(([, s]) => s.selected)
    .map(([id, s]) => ({ playerId: id, ...s }));

  const selectedCount = selectedPlayersList.length;
  const captainCount = selectedPlayersList.filter((p) => p.isCaptain).length;
  const wkCount = selectedPlayersList.filter((p) => p.isWicketKeeper).length;
  const battingOrders = selectedPlayersList.map((p) => p.battingOrder);
  const uniqueBattingOrders = new Set(battingOrders);
  const hasDuplicateOrders = uniqueBattingOrders.size !== selectedPlayersList.length;

  const isFormValid =
    selectedCount === 11 &&
    captainCount === 1 &&
    wkCount <= 1 &&
    !hasDuplicateOrders;

  async function handleSavePlayingXI() {
    if (!isFormValid || !selectedMatch || !selectedTeam) return;
    setSavingXI(true);
    setErrorMsg(null);

    const payload = {
      teamId: selectedTeam.id,
      players: selectedPlayersList.map((p) => ({
        playerId: p.playerId,
        battingOrder: p.battingOrder,
        isCaptain: p.isCaptain,
        isWicketKeeper: p.isWicketKeeper
      }))
    };

    try {
      await api.post(`/matches/${selectedMatch.id}/playing-xi`, payload);
      setSuccessMsg(`Playing XI for ${selectedTeam.name} saved successfully!`);
      setShowXIModal(false);
      setTimeout(() => setSuccessMsg(null), 4000);
      await fetchManagerFixtures();
    } catch (err) {
      console.error('Save Playing XI error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to submit Playing XI.');
    } finally {
      setSavingXI(false);
    }
  }

  // Filter current tab assignments by search
  const currentList = fixturesData[activeTab] || [];
  const filteredList = currentList.filter((a) => {
    const q = searchQuery.toLowerCase();
    const tournamentName = a.match?.tournament?.name || '';
    const teamAName = a.match?.teamA?.name || '';
    const teamBName = a.match?.teamB?.name || '';
    const managedTeam = a.team?.name || '';
    return (
      tournamentName.toLowerCase().includes(q) ||
      teamAName.toLowerCase().includes(q) ||
      teamBName.toLowerCase().includes(q) ||
      managedTeam.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-gray-900 via-gray-900/90 to-emerald-950/40 border border-gray-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-emerald-400">
              Team Manager Console
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            My Match Fixtures & Squad Management
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Accept match assignments, review opponents, and submit the authoritative 11-player Playing XI before match start.
          </p>
        </div>

        <Link
          to="/manager/profile"
          className="self-start md:self-auto px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-xs font-semibold flex items-center gap-2 transition-all"
        >
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Manager Profile</span>
        </Link>
      </div>

      {/* Success / Error Alerts */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Tabs & Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-900/80 border border-gray-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'pending'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
            }`}
          >
            <span>Pending Requests</span>
            {fixturesData.counts.pending > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'pending' ? 'bg-black/30 text-white' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {fixturesData.counts.pending}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('upcoming')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'upcoming'
                ? 'bg-emerald-600 text-white shadow-md glow-emerald'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
            }`}
          >
            <span>Upcoming Matches</span>
            <span className="text-[10px] opacity-70">({fixturesData.counts.upcoming})</span>
          </button>

          <button
            onClick={() => setActiveTab('live')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'live'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
            }`}
          >
            <Radio className="w-3 h-3 text-teal-300 animate-pulse" />
            <span>Live Matches</span>
            <span className="text-[10px] opacity-70">({fixturesData.counts.live})</span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'completed'
                ? 'bg-gray-700 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
            }`}
          >
            <span>Completed</span>
            <span className="text-[10px] opacity-70">({fixturesData.counts.completed})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search teams or tournaments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-gray-900/80 border border-gray-800 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Content Section */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton height="160px" />
          <Skeleton height="160px" />
          <Skeleton height="160px" />
          <Skeleton height="160px" />
        </div>
      ) : filteredList.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-gray-900/40 border border-gray-800/80 space-y-3">
          <Shield className="w-12 h-12 text-gray-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">No {activeTab} fixtures found</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            {activeTab === 'pending'
              ? 'You have no pending manager requests from tournament organizers.'
              : activeTab === 'upcoming'
              ? 'No upcoming matches scheduled for your managed squads.'
              : activeTab === 'live'
              ? 'None of your managed matches are currently in progress.'
              : 'No completed match records for your manager profile.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredList.map((assignment) => {
            const match = assignment.match;
            const managedTeam = assignment.team;
            const opponentTeam =
              match.teamAId === managedTeam.id ? match.teamB : match.teamA;
            const xiInfo = playingXIStatusMap[match.id] || { myTeamCount: 0, myTeamReady: false };
            const isPending = assignment.status === 'PENDING';

            return (
              <div
                key={assignment.id}
                className="p-5 rounded-2xl bg-gray-900/80 border border-gray-800 hover:border-gray-700 transition-all flex flex-col justify-between space-y-4 relative group"
              >
                {/* Header: Tournament and Status Badges */}
                <div className="flex items-start justify-between gap-2 border-b border-gray-800/80 pb-3">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block truncate">
                      {match.tournament?.name || 'Tournament'}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3 h-3 text-gray-500" />
                      {match.matchDate ? new Date(match.matchDate).toLocaleDateString() : 'TBD'}
                      {match.venue && ` • ${match.venue}`}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                      isPending
                        ? 'bg-amber-950/80 text-amber-300 border-amber-600/40'
                        : match.status === 'LIVE'
                        ? 'bg-teal-950/80 text-teal-300 border-teal-500/40 animate-pulse'
                        : match.status === 'COMPLETED'
                        ? 'bg-gray-800 text-gray-300 border-gray-700'
                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-600/40'
                    }`}
                  >
                    {isPending ? 'ASSIGNMENT REQUEST' : match.status}
                  </span>
                </div>

                {/* Match Teams Faceoff */}
                <div className="grid grid-cols-5 items-center gap-2 py-1">
                  {/* Managed Team */}
                  <div className="col-span-2 flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-700/50 flex items-center justify-center text-emerald-400 font-black text-xs shadow-sm flex-shrink-0">
                      {managedTeam.shortName || managedTeam.name?.[0]}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate">
                        {managedTeam.name}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-semibold block">
                        (Your Team)
                      </span>
                    </div>
                  </div>

                  {/* VS Divider */}
                  <div className="col-span-1 text-center font-mono font-black text-xs text-gray-600">
                    VS
                  </div>

                  {/* Opponent Team */}
                  <div className="col-span-2 flex items-center justify-end gap-2.5 min-w-0 text-right">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-gray-300 block truncate">
                        {opponentTeam?.name || 'Opponent'}
                      </span>
                      <span className="text-[10px] text-gray-500 font-semibold block">
                        (Opponent)
                      </span>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-300 font-black text-xs shadow-sm flex-shrink-0">
                      {opponentTeam?.shortName || opponentTeam?.name?.[0] || 'OP'}
                    </div>
                  </div>
                </div>

                {/* Status Indicator / Playing XI Status */}
                {!isPending && match.status === 'UPCOMING' && (
                  <div className="p-2.5 rounded-xl bg-gray-950/60 border border-gray-850 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-300">Playing XI:</span>
                    </div>
                    <span
                      className={`font-bold flex items-center gap-1 ${
                        xiInfo.myTeamReady ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {xiInfo.myTeamReady ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Submitted (11/11)
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Needs Selection ({xiInfo.myTeamCount}/11)
                        </>
                      )}
                    </span>
                  </div>
                )}

                {/* Pending Request Details */}
                {isPending && (
                  <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs space-y-1">
                    <p className="text-amber-200 font-medium">
                      Requested by Organizer:{' '}
                      <span className="text-white font-bold">
                        {assignment.assignedByUser?.firstName} {assignment.assignedByUser?.lastName}
                      </span>
                    </p>
                    <p className="text-gray-400 text-[11px]">
                      Accept this assignment to submit the Playing XI for {managedTeam.name}.
                    </p>
                  </div>
                )}

                {/* Actions Footer */}
                <div className="pt-3 border-t border-gray-800 flex items-center justify-end gap-2">
                  {isPending ? (
                    <>
                      <button
                        onClick={() =>
                          setDeclineModal({
                            open: true,
                            assignmentId: assignment.id,
                            reason: ''
                          })
                        }
                        disabled={actionLoading}
                        className="px-3.5 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5 text-red-400" /> Decline
                      </button>

                      <button
                        onClick={() => handleAcceptAssignment(assignment.id)}
                        disabled={actionLoading}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md glow-emerald transition-all"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Accept Assignment
                      </button>
                    </>
                  ) : match.status === 'UPCOMING' ? (
                    <button
                      onClick={() => openPlayingXIModal(assignment)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md glow-emerald transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      {xiInfo.myTeamReady ? 'Edit Playing XI' : 'Select Playing XI'}
                    </button>
                  ) : (
                    <Link
                      to={`/matches/${match.id}`}
                      className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-400" /> View Live Match Center
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Decline Dialog Modal */}
      {declineModal.open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0F1422] border border-gray-800 shadow-2xl p-6 space-y-4 animate-in fade-in scale-95 duration-150">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" /> Decline Manager Assignment
            </h3>
            <p className="text-xs text-gray-300">
              Are you sure you want to decline this assignment request? You will not be able to manage this team for this match.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Reason (Optional):
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Scheduling conflict, unable to attend..."
                value={declineModal.reason}
                onChange={(e) =>
                  setDeclineModal({ ...declineModal, reason: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-xl bg-gray-950 border border-gray-800 text-white text-xs focus:outline-none focus:border-red-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() =>
                  setDeclineModal({ open: false, assignmentId: null, reason: '' })
                }
                className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDeclineAssignment}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md"
              >
                {actionLoading ? 'Declining...' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Playing XI Modal */}
      {showXIModal && selectedMatch && selectedTeam && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-[#0F1422] border border-gray-800 shadow-2xl overflow-hidden my-8 animate-in fade-in scale-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-gray-900 to-emerald-950/60 border-b border-gray-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                  {selectedMatch.tournament?.name || 'Tournament'} • Official Playing XI
                </span>
                <h2 className="text-base font-extrabold text-white">
                  Select Playing XI for {selectedTeam.name}
                </h2>
              </div>

              <button
                onClick={() => setShowXIModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selection Summary Bar */}
            <div className="px-5 py-3 bg-gray-950/80 border-b border-gray-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <span className={`font-bold flex items-center gap-1 ${
                  selectedCount === 11 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  Players Selected: {selectedCount} / 11
                </span>
                <span className={`font-semibold ${
                  captainCount === 1 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  Captain: {captainCount === 1 ? '✓ Set' : 'Required (1)'}
                </span>
                <span className={`font-semibold ${
                  wkCount === 1 ? 'text-emerald-400' : 'text-gray-400'
                }`}>
                  Wicketkeeper: {wkCount === 1 ? '✓ Set' : 'Optional (max 1)'}
                </span>
              </div>

              {hasDuplicateOrders && (
                <span className="text-red-400 font-bold">
                  ⚠️ Duplicate batting orders detected
                </span>
              )}
            </div>

            {/* Player Roster Grid */}
            <div className="p-5 max-h-[55vh] overflow-y-auto space-y-2">
              {rosterLoading ? (
                <div className="py-8 text-center text-xs text-gray-400">Loading squad roster...</div>
              ) : teamRoster.length === 0 ? (
                <div className="py-8 text-center text-xs text-amber-400">
                  No players registered for this team yet. Please ask the organizer or add players in Teams management.
                </div>
              ) : (
                teamRoster.map((player) => {
                  const sel = xiSelection[player.id] || { selected: false };

                  return (
                    <div
                      key={player.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        sel.selected
                          ? 'bg-emerald-950/30 border-emerald-600/50 shadow-sm'
                          : 'bg-gray-900/40 border-gray-800/80 opacity-70 hover:opacity-100'
                      }`}
                    >
                      {/* Selection Checkbox & Player Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={sel.selected}
                          onChange={() => handleTogglePlayer(player.id)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-gray-950 border-gray-700 cursor-pointer"
                        />

                        <div>
                          <p className="text-xs font-bold text-white truncate">
                            {player.firstName} {player.lastName}
                            {player.jerseyNumber ? ` (#${player.jerseyNumber})` : ''}
                          </p>
                          <span className="text-[10px] text-gray-400 uppercase font-semibold">
                            {player.playerType} {player.battingStyle ? `• ${player.battingStyle.replace('_', ' ')}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Playing XI Role Configuration */}
                      {sel.selected && (
                        <div className="flex items-center gap-2">
                          {/* Batting Order Input */}
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-gray-400 text-[10px]">Order:</span>
                            <input
                              type="number"
                              min={1}
                              max={11}
                              value={sel.battingOrder || 1}
                              onChange={(e) => handleBattingOrderChange(player.id, e.target.value)}
                              className="w-12 px-1.5 py-1 rounded bg-gray-950 border border-gray-700 text-center text-xs text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          {/* Captain Button */}
                          <button
                            type="button"
                            onClick={() => handleSetCaptain(player.id)}
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                              sel.isCaptain
                                ? 'bg-amber-500 text-black shadow-sm font-black'
                                : 'bg-gray-800 text-gray-400 hover:text-white'
                            }`}
                          >
                            (C)
                          </button>

                          {/* Wicketkeeper Button */}
                          <button
                            type="button"
                            onClick={() => handleSetWicketKeeper(player.id)}
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                              sel.isWicketKeeper
                                ? 'bg-teal-500 text-black shadow-sm font-black'
                                : 'bg-gray-800 text-gray-400 hover:text-white'
                            }`}
                          >
                            (WK)
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-950/80 border-t border-gray-800 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Playing XI will be locked once match scoring commences.
              </span>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowXIModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSavePlayingXI}
                  disabled={!isFormValid || savingXI}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 shadow-md glow-emerald transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  {savingXI ? 'Saving Playing XI...' : 'Submit Playing XI'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
