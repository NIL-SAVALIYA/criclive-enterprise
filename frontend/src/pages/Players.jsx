import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSport } from '../context/SportContext';
import Skeleton from '../components/Skeleton';
import { Users, Plus, Search, Filter, Edit, Trash2, Shield, Award, Activity, AlertCircle, X, CheckCircle2 } from 'lucide-react';

export default function Players() {
  const { user, hasRole } = useAuth();

  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Search, Filter & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modals State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    firstName: '',
    lastName: '',
    jerseyNumber: '',
    playerType: 'BATSMAN',
    battingStyle: 'RIGHT_HAND',
    bowlingStyle: 'RIGHT_ARM_MEDIUM',
    isCaptain: false,
    isViceCaptain: false,
    teamId: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const { currentSport } = useSport();

  useEffect(() => {
    fetchInitialData();
  }, [currentSport]);

  async function fetchInitialData() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [pRes, tRes] = await Promise.all([
        api.get('/players', { params: { sport: currentSport } }),
        api.get('/teams', { params: { sport: currentSport } })
      ]);
      const playerList = pRes.data.data || [];
      const teamList = tRes.data.data || [];
      setPlayers(playerList);
      setTeams(teamList);
      if (teamList.length > 0) {
        setFormData((prev) => ({ ...prev, teamId: teamList[0].id }));
      }
    } catch (err) {
      console.error('Failed to fetch players data:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to load players list.');
    } finally {
      setLoading(false);
    }
  }

  async function openPlayerStats(player) {
    setSelectedPlayer(player);
    setShowStatsModal(true);
    setStatsLoading(true);
    try {
      const res = await api.get(`/players/${player.id}/statistics`);
      setPlayerStats(res.data.data);
    } catch (err) {
      console.error('Failed to load player stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }

  // Filter & Search Logic
  const filteredPlayers = players.filter((p) => {
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    const teamName = p.team?.name?.toLowerCase() || '';
    const q = searchQuery.toLowerCase();

    const matchesSearch = fullName.includes(q) || teamName.includes(q) || (p.jerseyNumber && String(p.jerseyNumber).includes(q));
    const matchesType = typeFilter === 'ALL' || p.playerType === typeFilter;
    const matchesTeam = teamFilter === 'ALL' || p.teamId === teamFilter;

    return matchesSearch && matchesType && matchesTeam;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredPlayers.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPlayers = filteredPlayers.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Modal Handlers
  const handleOpenCreate = () => {
    setFormData({
      id: '',
      firstName: '',
      lastName: '',
      jerseyNumber: '',
      playerType: 'BATSMAN',
      battingStyle: 'RIGHT_HAND',
      bowlingStyle: 'RIGHT_ARM_MEDIUM',
      isCaptain: false,
      isViceCaptain: false,
      teamId: teams[0]?.id || ''
    });
    setShowCreateModal(true);
  };

  const handleOpenEdit = (p) => {
    setFormData({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      jerseyNumber: p.jerseyNumber || '',
      playerType: p.playerType,
      battingStyle: p.battingStyle || 'RIGHT_HAND',
      bowlingStyle: p.bowlingStyle || 'RIGHT_ARM_MEDIUM',
      isCaptain: !!p.isCaptain,
      isViceCaptain: !!p.isViceCaptain,
      teamId: p.teamId
    });
    setShowEditModal(true);
  };

  const handleOpenDelete = (p) => {
    setFormData({ ...formData, id: p.id, firstName: p.firstName, lastName: p.lastName });
    setShowDeleteModal(true);
  };

  async function handleCreateSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        jerseyNumber: formData.jerseyNumber ? Number(formData.jerseyNumber) : undefined,
        playerType: currentSport === 'BADMINTON' ? undefined : formData.playerType,
        battingStyle: currentSport === 'BADMINTON' ? undefined : (formData.battingStyle || undefined),
        bowlingStyle: currentSport === 'BADMINTON' ? undefined : (formData.bowlingStyle || undefined),
        isCaptain: Boolean(formData.isCaptain),
        isViceCaptain: Boolean(formData.isViceCaptain),
        teamId: formData.teamId,
        sport: currentSport
      };
      await api.post('/players', payload);
      setSuccessMsg('Player created successfully!');
      setShowCreateModal(false);
      setSearchQuery('');
      setTypeFilter('ALL');
      setTeamFilter('ALL');
      setCurrentPage(1);
      fetchInitialData();
    } catch (err) {
      console.error('Create player error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to create player.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        jerseyNumber: formData.jerseyNumber ? Number(formData.jerseyNumber) : undefined,
        playerType: currentSport === 'BADMINTON' ? undefined : formData.playerType,
        battingStyle: currentSport === 'BADMINTON' ? undefined : (formData.battingStyle || undefined),
        bowlingStyle: currentSport === 'BADMINTON' ? undefined : (formData.bowlingStyle || undefined),
        isCaptain: Boolean(formData.isCaptain),
        isViceCaptain: Boolean(formData.isViceCaptain),
        teamId: formData.teamId
      };
      await api.put(`/players/${formData.id}`, payload);
      setSuccessMsg('Player updated successfully!');
      setShowEditModal(false);
      fetchInitialData();
    } catch (err) {
      console.error('Update player error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to update player.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteSubmit() {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.delete(`/players/${formData.id}`);
      setSuccessMsg('Player deleted successfully!');
      setShowDeleteModal(false);
      fetchInitialData();
    } catch (err) {
      console.error('Delete player error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to delete player.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <Users className="w-8 h-8 text-emerald-400" /> Player Directory & Statistics
          </h1>
          <p className="text-gray-400 text-xs mt-1">Official league players roster, captain designations, and career statistics</p>
        </div>

        {/* Action Button */}
        {hasRole(['ADMIN', 'ORGANIZER']) && (
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg glow-emerald transition-all"
          >
            <Plus className="w-4 h-4" /> Add New Player
          </button>
        )}
      </div>

      {/* User Alerts */}
      {successMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs font-bold text-emerald-300 flex items-center justify-between">
          <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4 text-emerald-400" /></button>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-xs font-bold text-red-300 flex items-center justify-between">
          <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)}><X className="w-4 h-4 text-red-400" /></button>
        </div>
      )}

      {/* Search & Filters Bar */}
      <div className="glass-panel p-4 rounded-xl border border-gray-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by player name, jersey #..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl pl-9 pr-3 py-2 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {currentSport !== 'BADMINTON' && (
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-bold text-gray-400">Role:</span>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                className="bg-gray-900 border border-gray-700 text-white text-xs font-semibold rounded-lg p-2"
              >
                <option value="ALL">All Roles</option>
                <option value="BATSMAN">BATSMAN</option>
                <option value="BOWLER">BOWLER</option>
                <option value="ALL_ROUNDER">ALL ROUNDER</option>
                <option value="WICKET_KEEPER">WICKET KEEPER</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400">Team:</span>
            <select
              value={teamFilter}
              onChange={(e) => { setTeamFilter(e.target.value); setCurrentPage(1); }}
              className="bg-gray-900 border border-gray-700 text-white text-xs font-semibold rounded-lg p-2"
            >
              <option value="ALL">All Teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Players Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : paginatedPlayers.length === 0 ? (
        <div className="glass-panel p-8 rounded-2xl text-center text-gray-400 space-y-2 border border-gray-800">
          <p className="font-bold text-base text-gray-200">No players found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedPlayers.map((p) => (
            <div
              key={p.id}
              className="glass-panel p-5 rounded-2xl border border-gray-800 hover:border-emerald-500/50 transition-all flex flex-col justify-between gap-4 shadow-lg"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                      {p.firstName} {p.lastName}
                      {/* Captain Badges */}
                      {p.isCaptain && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-mono font-extrabold border border-amber-500/30">
                          C
                        </span>
                      )}
                      {p.isViceCaptain && (
                        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-mono font-extrabold border border-blue-500/30">
                          VC
                        </span>
                      )}
                    </h3>
                    <div className="text-xs text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-emerald-400" /> {p.team?.name || 'Unassigned Team'}
                    </div>
                  </div>
                  {p.jerseyNumber && (
                    <span className="font-mono text-sm font-black text-amber-400 bg-amber-950/50 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                      #{p.jerseyNumber}
                    </span>
                  )}
                </div>

                <div className="text-xs text-gray-400 pt-1 space-y-1">
                  {currentSport !== 'BADMINTON' && p.playerType && (
                    <div>Role: <span className="text-gray-200 font-semibold">{p.playerType}</span></div>
                  )}
                  {currentSport !== 'BADMINTON' && (
                    <div className="text-[11px]">Bat: {p.battingStyle || 'Right Hand'} • Bowl: {p.bowlingStyle || 'None'}</div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-800 flex justify-between items-center text-xs">
                <button
                  onClick={() => openPlayerStats(p)}
                  className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-bold rounded-lg border border-emerald-500/30 transition-all flex items-center gap-1.5"
                >
                  <Activity className="w-3.5 h-3.5" /> View Stats
                </button>

                {/* Admin Controls */}
                {hasRole(['ADMIN', 'ORGANIZER']) && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="p-1.5 bg-gray-900 hover:bg-gray-800 text-blue-400 rounded-lg border border-gray-800"
                      title="Edit Player"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {hasRole(['ADMIN']) && (
                      <button
                        onClick={() => handleOpenDelete(p)}
                        className="p-1.5 bg-gray-900 hover:bg-gray-800 text-red-400 rounded-lg border border-gray-800"
                        title="Delete Player"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-2 text-xs font-semibold text-gray-400">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg disabled:opacity-40 hover:text-white"
            >
              Previous
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg disabled:opacity-40 hover:text-white"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* STATS MODAL */}
      {showStatsModal && selectedPlayer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 w-full max-w-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  {selectedPlayer.firstName} {selectedPlayer.lastName}
                  {selectedPlayer.jerseyNumber && <span className="text-amber-400 font-mono">#{selectedPlayer.jerseyNumber}</span>}
                </h2>
                <div className="text-xs text-emerald-400 font-semibold">{selectedPlayer.team?.name} • {selectedPlayer.playerType}</div>
              </div>
              <button onClick={() => setShowStatsModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            {statsLoading ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : playerStats ? (
              <div className="space-y-6 text-xs font-mono">
                {/* Batting Stats */}
                <div className="space-y-2">
                  <h3 className="font-bold text-amber-400 flex items-center gap-1.5 font-sans">🏏 Batting Statistics</h3>
                  <div className="grid grid-cols-3 gap-2 bg-gray-900 p-3 rounded-xl border border-gray-800">
                    <div><span className="text-gray-400 block text-[10px]">Innings</span> <span className="text-white font-bold">{playerStats.batting?.innings || 0}</span></div>
                    <div><span className="text-gray-400 block text-[10px]">Runs</span> <span className="text-emerald-400 font-bold">{playerStats.batting?.runs || 0}</span></div>
                    <div><span className="text-gray-400 block text-[10px]">Highest</span> <span className="text-white font-bold">{playerStats.batting?.highestScore || 0}</span></div>
                    <div><span className="text-gray-400 block text-[10px]">Average</span> <span className="text-blue-400 font-bold">{playerStats.batting?.average || 0}</span></div>
                    <div><span className="text-gray-400 block text-[10px]">Strike Rate</span> <span className="text-blue-400 font-bold">{playerStats.batting?.strikeRate || 0}</span></div>
                    <div><span className="text-gray-400 block text-[10px]">50s / 100s</span> <span className="text-amber-400 font-bold">{playerStats.batting?.fifties || 0} / {playerStats.batting?.hundreds || 0}</span></div>
                  </div>
                </div>

                {/* Bowling Stats */}
                <div className="space-y-2">
                  <h3 className="font-bold text-purple-400 flex items-center gap-1.5 font-sans">🎯 Bowling Statistics</h3>
                  <div className="grid grid-cols-3 gap-2 bg-gray-900 p-3 rounded-xl border border-gray-800">
                    <div><span className="text-gray-400 block text-[10px]">Overs</span> <span className="text-white font-bold">{playerStats.bowling?.overs || 0}</span></div>
                    <div><span className="text-gray-400 block text-[10px]">Wickets</span> <span className="text-purple-400 font-bold">{playerStats.bowling?.wickets || 0}</span></div>
                    <div><span className="text-gray-400 block text-[10px]">Economy</span> <span className="text-blue-400 font-bold">{playerStats.bowling?.economy || 0}</span></div>
                    <div><span className="text-gray-400 block text-[10px]">Maidens</span> <span className="text-white font-bold">{playerStats.bowling?.maidens || 0}</span></div>
                    <div><span className="text-gray-400 block text-[10px]">3W / 5W</span> <span className="text-purple-300 font-bold">{playerStats.bowling?.threeWickets || 0} / {playerStats.bowling?.fiveWickets || 0}</span></div>
                    <div><span className="text-gray-400 block text-[10px]">Best</span> <span className="text-emerald-400 font-bold">{playerStats.bowling?.bestBowling ? `${playerStats.bowling.bestBowling.wickets}/${playerStats.bowling.bestBowling.runs}` : '-'}</span></div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 p-4 text-center">No statistical records available for this player.</p>
            )}
          </div>
        </div>
      )}

      {/* CREATE PLAYER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 w-full max-w-lg space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Add New Player</h2>
              <button onClick={() => setShowCreateModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1">Assigned Team *</label>
                  <select
                    value={formData.teamId}
                    onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Jersey Number</label>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={formData.jerseyNumber}
                    onChange={(e) => setFormData({ ...formData, jerseyNumber: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                  />
                </div>
              </div>

              {currentSport !== 'BADMINTON' && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-gray-300 mb-1">Role *</label>
                    <select
                      value={formData.playerType}
                      onChange={(e) => setFormData({ ...formData, playerType: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2"
                    >
                      <option value="BATSMAN">BATSMAN</option>
                      <option value="BOWLER">BOWLER</option>
                      <option value="ALL_ROUNDER">ALL ROUNDER</option>
                      <option value="WICKET_KEEPER">WICKET KEEPER</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-1">Batting Style</label>
                    <select
                      value={formData.battingStyle}
                      onChange={(e) => setFormData({ ...formData, battingStyle: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2"
                    >
                      <option value="RIGHT_HAND">RIGHT HAND</option>
                      <option value="LEFT_HAND">LEFT HAND</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-1">Bowling Style</label>
                    <select
                      value={formData.bowlingStyle}
                      onChange={(e) => setFormData({ ...formData, bowlingStyle: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2"
                    >
                      <option value="RIGHT_ARM_FAST">RIGHT ARM FAST</option>
                      <option value="LEFT_ARM_FAST">LEFT ARM FAST</option>
                      <option value="RIGHT_ARM_MEDIUM">RIGHT ARM MEDIUM</option>
                      <option value="LEFT_ARM_MEDIUM">LEFT ARM MEDIUM</option>
                      <option value="RIGHT_ARM_SPIN">RIGHT ARM SPIN</option>
                      <option value="LEFT_ARM_SPIN">LEFT ARM SPIN</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isCaptain}
                    onChange={(e) => setFormData({ ...formData, isCaptain: e.target.checked })}
                    className="accent-amber-500"
                  />
                  <span className="text-amber-400 font-bold">Team Captain (C)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isViceCaptain}
                    onChange={(e) => setFormData({ ...formData, isViceCaptain: e.target.checked })}
                    className="accent-blue-500"
                  />
                  <span className="text-blue-400 font-bold">Vice Captain (VC)</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg glow-emerald"
              >
                {submitting ? 'Adding...' : 'Add Player to Squad'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PLAYER MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 w-full max-w-lg space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Edit Player</h2>
              <button onClick={() => setShowEditModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1">Assigned Team</label>
                  <select
                    value={formData.teamId}
                    onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Jersey Number</label>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={formData.jerseyNumber}
                    onChange={(e) => setFormData({ ...formData, jerseyNumber: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                  />
                </div>
              </div>

              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isCaptain}
                    onChange={(e) => setFormData({ ...formData, isCaptain: e.target.checked })}
                    className="accent-amber-500"
                  />
                  <span className="text-amber-400 font-bold">Team Captain (C)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isViceCaptain}
                    onChange={(e) => setFormData({ ...formData, isViceCaptain: e.target.checked })}
                    className="accent-blue-500"
                  />
                  <span className="text-blue-400 font-bold">Vice Captain (VC)</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg"
              >
                {submitting ? 'Updating...' : 'Save Player Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-red-500/40 w-full max-w-md space-y-4 text-center">
            <h2 className="text-lg font-bold text-red-400">Delete Player</h2>
            <p className="text-xs text-gray-300">
              Are you sure you want to delete <span className="font-bold text-white">{formData.firstName} {formData.lastName}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg"
              >
                {submitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
