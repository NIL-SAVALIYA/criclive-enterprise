import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Skeleton from '../components/Skeleton';
import {
  Trophy,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Calendar,
  Award,
  BarChart2,
  AlertCircle,
  X,
  CheckCircle2,
  Settings,
  Users,
  Shield,
  ShieldCheck,
  UserCheck,
  Play,
  RefreshCw,
  ChevronRight,
  UserPlus,
  Clock,
  MapPin,
  ExternalLink,
  Link2,
  Copy,
  Check,
  Key
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Tournaments() {
  const { user, hasRole } = useAuth();

  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [pointsTable, setPointsTable] = useState([]);
  const [caps, setCaps] = useState(null);

  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Search, Filter & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modals State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Operations Workspace Modal State
  const [showManageModal, setShowManageModal] = useState(false);
  const [manageDashboard, setManageDashboard] = useState(null);
  const [manageLoading, setManageLoading] = useState(false);
  const [manageTab, setManageTab] = useState('overview'); // overview, teams, managers, fixtures, scorers, standings, staff
  const [selectedTeamToAdd, setSelectedTeamToAdd] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('LEAGUE');
  const [fixtureVenue, setFixtureVenue] = useState('National Cricket Stadium');
  const [fixtureStartDate, setFixtureStartDate] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedMatchId, setCopiedMatchId] = useState(null);

  // Match Manager Assignment Search Modal State
  const [managerModal, setManagerModal] = useState({
    open: false,
    match: null,
    team: null,
    searchQuery: '',
    searchResults: [],
    loading: false
  });

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    format: 'LEAGUE',
    startDate: '',
    endDate: '',
    status: 'UPCOMING'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTournaments();
  }, []);

  async function fetchTournaments(preferredSelectedId = null) {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/tournaments');
      const list = res.data.data || [];
      setTournaments(list);
      const targetId = preferredSelectedId || (selectedTournament?.id && list.some(t => t.id === selectedTournament.id) ? selectedTournament.id : list[0]?.id);
      if (targetId) {
        selectTournament(targetId);
      }
    } catch (err) {
      console.error('Failed to fetch tournaments:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to load tournaments. Please check connection.');
    } finally {
      setLoading(false);
    }
  }

  async function selectTournament(id) {
    setDetailsLoading(true);
    try {
      const [tRes, ptRes, capRes] = await Promise.all([
        api.get(`/tournaments/${id}`),
        api.get(`/points-table/${id}`).catch(() => ({ data: { data: [] } })),
        api.get(`/records/caps-and-leaders?tournamentId=${id}`).catch(() => ({ data: { data: null } }))
      ]);
      setSelectedTournament(tRes.data.data);
      setPointsTable(ptRes.data.data || []);
      setCaps(capRes.data.data || null);
    } catch (err) {
      console.error('Failed to load tournament details:', err);
    } finally {
      setDetailsLoading(false);
    }
  }

  async function openManageWorkspace(tournamentId) {
    setShowManageModal(true);
    setManageLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get(`/tournaments/${tournamentId}/dashboard`);
      setManageDashboard(res.data.data);
      setSelectedFormat(res.data.data?.tournament?.format || 'LEAGUE');
      setFixtureStartDate(
        res.data.data?.tournament?.startDate
          ? new Date(res.data.data.tournament.startDate).toISOString().slice(0, 16)
          : ''
      );
    } catch (err) {
      console.error('Failed to fetch tournament dashboard:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to open tournament management workspace.');
    } finally {
      setManageLoading(false);
    }
  }

  async function reloadManageDashboard(tournamentId) {
    if (!tournamentId) return;
    try {
      const res = await api.get(`/tournaments/${tournamentId}/dashboard`);
      setManageDashboard(res.data.data);
    } catch (err) {
      console.error('Failed to reload dashboard:', err);
    }
  }

  // Filter & Search Logic
  const filteredTournaments = tournaments.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFormat = formatFilter === 'ALL' || t.format === formatFilter;
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;

    return matchesSearch && matchesFormat && matchesStatus;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredTournaments.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTournaments = filteredTournaments.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Form Handlers
  const handleOpenCreate = () => {
    const now = new Date();
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    setFormData({
      id: '',
      name: '',
      description: '',
      format: 'LEAGUE',
      startDate: now.toISOString().slice(0, 16),
      endDate: future.toISOString().slice(0, 16),
      status: 'UPCOMING'
    });
    setShowCreateModal(true);
  };

  const handleOpenEdit = (t) => {
    setFormData({
      id: t.id,
      name: t.name,
      description: t.description || '',
      format: t.format,
      startDate: new Date(t.startDate).toISOString().slice(0, 16),
      endDate: new Date(t.endDate).toISOString().slice(0, 16),
      status: t.status
    });
    setShowEditModal(true);
  };

  const handleOpenDelete = (t) => {
    setFormData({ ...formData, id: t.id, name: t.name });
    setShowDeleteModal(true);
  };

  async function handleCreateSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        format: formData.format,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        status: formData.status
      };
      const res = await api.post('/tournaments', payload);
      setSuccessMsg('Tournament created successfully!');
      setShowCreateModal(false);
      setSearchQuery('');
      setFormatFilter('ALL');
      setStatusFilter('ALL');
      setCurrentPage(1);
      const createdTournament = res.data.data;
      await fetchTournaments(createdTournament?.id);
    } catch (err) {
      console.error('Create error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to create tournament.');
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
        name: formData.name,
        description: formData.description || undefined,
        format: formData.format,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        status: formData.status
      };
      await api.put(`/tournaments/${formData.id}`, payload);
      setSuccessMsg('Tournament updated successfully!');
      setShowEditModal(false);
      fetchTournaments();
    } catch (err) {
      console.error('Update error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to update tournament.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteSubmit() {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.delete(`/tournaments/${formData.id}`);
      setSuccessMsg('Tournament deleted successfully!');
      setShowDeleteModal(false);
      fetchTournaments();
    } catch (err) {
      console.error('Delete error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to delete tournament.');
    } finally {
      setSubmitting(false);
    }
  }

  // Operations Handlers
  async function handleAddTeamToTournament() {
    if (!selectedTeamToAdd || !manageDashboard?.tournament?.id) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await api.post('/tournament-teams', {
        tournamentId: manageDashboard.tournament.id,
        teamId: selectedTeamToAdd
      });
      setSuccessMsg('Team added to tournament successfully.');
      setSelectedTeamToAdd('');
      await reloadManageDashboard(manageDashboard.tournament.id);
      fetchTournaments();
    } catch (err) {
      console.error('Add team error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to add team to tournament.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemoveTeamFromTournament(registrationId) {
    if (!registrationId) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await api.delete(`/tournament-teams/${registrationId}`);
      setSuccessMsg('Team removed from tournament.');
      await reloadManageDashboard(manageDashboard.tournament.id);
      fetchTournaments();
    } catch (err) {
      console.error('Remove team error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to remove team from tournament.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAssignTeamManager(teamId, managerId) {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await api.put(`/teams/${teamId}`, {
        managerId: managerId || null
      });
      setSuccessMsg(managerId ? 'Team manager assigned successfully.' : 'Team manager removed.');
      await reloadManageDashboard(manageDashboard.tournament.id);
    } catch (err) {
      console.error('Assign manager error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to assign team manager.');
    } finally {
      setActionLoading(false);
    }
  }

  function handleOpenManagerModal(match, team) {
    setManagerModal({
      open: true,
      match,
      team,
      searchQuery: '',
      searchResults: manageDashboard?.eligibleManagers || [],
      loading: false
    });
  }

  async function handleSearchManagersQuery(query) {
    setManagerModal((prev) => ({ ...prev, searchQuery: query, loading: true }));
    try {
      const res = await api.get(`/managers/search?query=${encodeURIComponent(query || '')}`);
      setManagerModal((prev) => ({ ...prev, searchResults: res.data.data || [], loading: false }));
    } catch {
      setManagerModal((prev) => ({ ...prev, loading: false }));
    }
  }

  async function handleSendManagerRequest(matchId, teamId, managerIdentifier) {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await api.post(`/matches/${matchId}/manager-assignments`, {
        teamId,
        managerIdentifier
      });
      setSuccessMsg('Manager assignment request sent successfully!');
      setManagerModal({ open: false, match: null, team: null, searchQuery: '', searchResults: [], loading: false });
      setTimeout(() => setSuccessMsg(null), 4000);
      await reloadManageDashboard(manageDashboard.tournament.id);
    } catch (err) {
      console.error('Manager assignment request error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to send manager assignment request.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancelManagerAssignment(assignmentId) {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await api.post(`/manager-assignments/${assignmentId}/cancel`);
      setSuccessMsg('Manager assignment request cancelled.');
      setTimeout(() => setSuccessMsg(null), 4000);
      await reloadManageDashboard(manageDashboard.tournament.id);
    } catch (err) {
      console.error('Cancel assignment error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to cancel assignment.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRevokeManagerAssignment(assignmentId) {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await api.post(`/manager-assignments/${assignmentId}/revoke`);
      setSuccessMsg('Manager assignment revoked.');
      setTimeout(() => setSuccessMsg(null), 4000);
      await reloadManageDashboard(manageDashboard.tournament.id);
    } catch (err) {
      console.error('Revoke assignment error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to revoke assignment.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleGenerateSchedule() {
    if (!manageDashboard?.tournament?.id) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.post(`/fixtures/generate/${manageDashboard.tournament.id}`, {
        venue: fixtureVenue || 'National Cricket Stadium',
        startDate: fixtureStartDate ? new Date(fixtureStartDate).toISOString() : undefined,
        format: selectedFormat,
        regenerate: true
      });
      setSuccessMsg(`Generated ${res.data.totalMatches || res.data.data?.length || 0} match fixtures!`);
      await reloadManageDashboard(manageDashboard.tournament.id);
      fetchTournaments();
    } catch (err) {
      console.error('Generate fixtures error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to generate schedule.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAssignMatchScorer(matchId, scorerId) {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await api.put(`/matches/${matchId}`, {
        scorerId: scorerId || null
      });
      setSuccessMsg(scorerId ? 'Match scorer assigned successfully.' : 'Match scorer removed.');
      await reloadManageDashboard(manageDashboard.tournament.id);
    } catch (err) {
      console.error('Assign scorer error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to assign match scorer.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleGenerateScoringLink(matchId) {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await api.post(`/matches/${matchId}/scoring-token/generate`);
      setSuccessMsg('Match-specific scoring access link generated successfully.');
      await reloadManageDashboard(manageDashboard.tournament.id);
    } catch (err) {
      console.error('Generate scoring token error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to generate scoring access link.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRevokeScoringLink(matchId) {
    if (!window.confirm('Are you sure you want to revoke the scoring link for this match? Scorers using the link will lose scoring access immediately.')) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await api.post(`/matches/${matchId}/scoring-token/revoke`);
      setSuccessMsg('Scoring access link revoked.');
      await reloadManageDashboard(manageDashboard.tournament.id);
    } catch (err) {
      console.error('Revoke scoring token error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to revoke scoring access link.');
    } finally {
      setActionLoading(false);
    }
  }

  function handleCopyScoringLink(matchId, token) {
    const fullUrl = `${window.location.origin}/score/${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedMatchId(matchId);
    setSuccessMsg('Scoring link copied to clipboard!');
    setTimeout(() => setCopiedMatchId(null), 3000);
  }

  async function handleUpdateTournamentStatus(status) {
    if (!manageDashboard?.tournament?.id) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await api.put(`/tournaments/${manageDashboard.tournament.id}`, { status });
      setSuccessMsg(`Tournament status changed to ${status}.`);
      await reloadManageDashboard(manageDashboard.tournament.id);
      fetchTournaments();
    } catch (err) {
      console.error('Status update error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to update tournament status.');
    } finally {
      setActionLoading(false);
    }
  }

  const canManageTournament = (t) => {
    if (!user) return false;
    if (hasRole(['ADMIN', 'TOURNAMENT_ADMIN'])) return true;
    if (hasRole(['ORGANIZER']) && t.organizerId === user.id) return true;
    return false;
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <Trophy className="w-8 h-8 text-amber-400" /> Tournament League Management
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            Official tournaments, operational workspace, team rosters, fixture generator, scorers & standings
          </p>
        </div>

        {/* Action Button for Authorized Users */}
        {hasRole(['ADMIN', 'ORGANIZER']) && (
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg glow-emerald transition-all"
          >
            <Plus className="w-4 h-4" /> Create New Tournament
          </button>
        )}
      </div>

      {/* User Alerts */}
      {successMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs font-bold text-emerald-300 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {successMsg}
          </span>
          <button onClick={() => setSuccessMsg(null)}>
            <X className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-xs font-bold text-red-300 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {errorMsg}
          </span>
          <button onClick={() => setErrorMsg(null)}>
            <X className="w-4 h-4 text-red-400" />
          </button>
        </div>
      )}

      {/* Search & Filters Controls */}
      <div className="glass-panel p-4 rounded-xl border border-gray-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search tournament name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl pl-9 pr-3 py-2 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-bold text-gray-400">Format:</span>
            <select
              value={formatFilter}
              onChange={(e) => {
                setFormatFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-gray-900 border border-gray-700 text-white text-xs font-semibold rounded-lg p-2"
            >
              <option value="ALL">All Formats</option>
              <option value="LEAGUE">LEAGUE</option>
              <option value="KNOCKOUT">KNOCKOUT</option>
              <option value="ROUND_ROBIN">ROUND ROBIN</option>
              <option value="HYBRID">HYBRID</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-gray-900 border border-gray-700 text-white text-xs font-semibold rounded-lg p-2"
            >
              <option value="ALL">All Statuses</option>
              <option value="UPCOMING">UPCOMING</option>
              <option value="LIVE">LIVE</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Tournament List Cards & Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Tournaments Cards & Pagination */}
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : paginatedTournaments.length === 0 ? (
            <div className="glass-panel p-8 rounded-2xl text-center text-gray-400 space-y-2 border border-gray-800">
              <p className="font-bold text-base text-gray-200">No tournaments match your search or filter criteria.</p>
              <p className="text-xs text-gray-400">Try adjusting your filters or create a new tournament.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedTournaments.map((t) => {
                const isSelected = selectedTournament?.id === t.id;
                const canManage = canManageTournament(t);
                return (
                  <div
                    key={t.id}
                    onClick={() => selectTournament(t.id)}
                    className={`glass-panel p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-950/30 glow-emerald scale-[1.02]'
                        : 'border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-extrabold text-base text-white leading-snug">{t.name}</h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            t.status === 'LIVE'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse'
                              : t.status === 'COMPLETED'
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2">
                        {t.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-gray-800/80 flex flex-wrap justify-between items-center gap-2 text-xs">
                      <span className="font-mono text-emerald-400 font-bold bg-gray-900 px-2 py-1 rounded">
                        {t.format}
                      </span>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {/* Manage Tournament Button */}
                        {canManage && (
                          <button
                            onClick={() => openManageWorkspace(t.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1.5 shadow glow-emerald transition-all"
                            title="Manage Tournament Operations"
                          >
                            <Settings className="w-3.5 h-3.5" /> Manage
                          </button>
                        )}

                        {/* Admin Edit/Delete */}
                        {hasRole(['ADMIN', 'ORGANIZER']) && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(t)}
                              className="p-1.5 bg-gray-900 hover:bg-gray-800 text-blue-400 rounded-lg border border-gray-800"
                              title="Edit Tournament Info"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {hasRole(['ADMIN']) && (
                              <button
                                onClick={() => handleOpenDelete(t)}
                                className="p-1.5 bg-gray-900 hover:bg-gray-800 text-red-400 rounded-lg border border-gray-800"
                                title="Delete Tournament"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-2 text-xs font-semibold text-gray-400">
              <span>
                Page {currentPage} of {totalPages}
              </span>
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
        </div>

        {/* Right 1 Col: Selected Tournament Details Drawer */}
        <div className="space-y-6">
          {detailsLoading ? (
            <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : selectedTournament ? (
            <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-6">
              <div className="space-y-3 border-b border-gray-800 pb-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">
                    {selectedTournament.format} FORMAT
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      selectedTournament.status === 'LIVE'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : selectedTournament.status === 'COMPLETED'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {selectedTournament.status}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-white">{selectedTournament.name}</h2>
                <p className="text-xs text-gray-400">
                  {selectedTournament.description || 'Tournament overview and standings.'}
                </p>
                <div className="flex gap-4 text-xs font-mono text-gray-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" /> Start:{' '}
                    {new Date(selectedTournament.startDate).toLocaleDateString()}
                  </span>
                </div>

                {canManageTournament(selectedTournament) && (
                  <button
                    onClick={() => openManageWorkspace(selectedTournament.id)}
                    className="w-full mt-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg glow-emerald transition-all"
                  >
                    <Settings className="w-4 h-4" /> Manage Tournament Workspace
                  </button>
                )}
              </div>

              {/* Points Table Summary */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-emerald-400" /> Standings Table
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-gray-900 text-gray-400 uppercase">
                      <tr>
                        <th className="p-2">Team</th>
                        <th className="p-2">P</th>
                        <th className="p-2">W</th>
                        <th className="p-2">NRR</th>
                        <th className="p-2 text-emerald-400 font-bold">Pts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {pointsTable.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="p-3 text-center text-gray-500 font-sans">
                            No points logged.
                          </td>
                        </tr>
                      ) : (
                        pointsTable.map((row) => (
                          <tr key={row.id}>
                            <td className="p-2 font-bold text-white font-sans">
                              {row.team?.shortName || row.team?.name}
                            </td>
                            <td className="p-2 text-gray-300">{row.played}</td>
                            <td className="p-2 text-emerald-400">{row.won}</td>
                            <td className="p-2 text-gray-400">{Number(row.netRunRate || 0).toFixed(3)}</td>
                            <td className="p-2 font-bold text-emerald-400">{row.points}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-6 rounded-2xl border border-gray-800 text-center text-xs text-gray-400">
              Select a tournament to view details & standings.
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TOURNAMENT OPERATIONS WORKSPACE MODAL */}
      {/* ========================================================================= */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 md:p-6 overflow-y-auto">
          <div className="glass-panel w-full max-w-5xl rounded-3xl border border-emerald-500/40 p-6 space-y-6 shadow-2xl my-auto">
            {/* Modal Top Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-950 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    {manageDashboard?.tournament?.format || 'LEAGUE'}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      manageDashboard?.tournament?.status === 'LIVE'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse'
                        : manageDashboard?.tournament?.status === 'COMPLETED'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {manageDashboard?.tournament?.status}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-white mt-1">
                  {manageDashboard?.tournament?.name || 'Tournament Operations'}
                </h2>
                <p className="text-xs text-gray-400">
                  Organizer:{' '}
                  <span className="text-gray-200 font-semibold">
                    {manageDashboard?.tournament?.organizer
                      ? `${manageDashboard.tournament.organizer.firstName} ${manageDashboard.tournament.organizer.lastName} (${manageDashboard.tournament.organizer.email})`
                      : 'Unassigned'}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center">
                {/* Status Quick Actions */}
                {manageDashboard?.tournament?.status === 'UPCOMING' && (
                  <button
                    onClick={() => handleUpdateTournamentStatus('LIVE')}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow"
                  >
                    <Play className="w-3.5 h-3.5" /> Start Tournament (LIVE)
                  </button>
                )}
                {manageDashboard?.tournament?.status === 'LIVE' && (
                  <button
                    onClick={() => handleUpdateTournamentStatus('COMPLETED')}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Complete Tournament
                  </button>
                )}

                <button
                  onClick={() => reloadManageDashboard(manageDashboard?.tournament?.id)}
                  className="p-2 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded-xl border border-gray-800"
                  title="Refresh Workspace"
                >
                  <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setShowManageModal(false)}
                  className="p-2 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white rounded-xl border border-gray-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-gray-800/80 pb-2 text-xs font-bold">
              {[
                { id: 'overview', label: 'Overview & Status', icon: Trophy },
                {
                  id: 'teams',
                  label: `Teams & Rosters (${manageDashboard?.registeredTeams?.length || 0})`,
                  icon: Users
                },
                { id: 'managers', label: 'Team Managers', icon: Shield },
                {
                  id: 'fixtures',
                  label: `Fixtures & Matches (${manageDashboard?.matches?.length || 0})`,
                  icon: Calendar
                },
                { id: 'scorers', label: 'Scoring Links', icon: Link2 },
                { id: 'standings', label: 'Standings', icon: BarChart2 },
                { id: 'staff', label: 'Staff Summary', icon: Users }
              ].map((tab) => {
                const Icon = tab.icon;
                const active = manageTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setManageTab(tab.id)}
                    className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all ${
                      active
                        ? 'bg-emerald-600 text-white shadow-lg glow-emerald'
                        : 'bg-gray-900/80 text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Modal Body / Tab Content */}
            {manageLoading ? (
              <div className="py-12 space-y-4 text-center">
                <Skeleton className="h-8 w-1/3 mx-auto" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <div className="space-y-6 min-h-[360px]">
                {/* ------------------------------------------------------------- */}
                {/* TAB 1: OVERVIEW */}
                {/* ------------------------------------------------------------- */}
                {manageTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Operational Summary Metric Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="glass-panel p-4 rounded-2xl border border-gray-800 text-center space-y-1">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                          Registered Teams
                        </span>
                        <div className="text-2xl font-black text-emerald-400">
                          {manageDashboard?.summary?.totalTeams || 0}
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {manageDashboard?.summary?.readyTeams || 0} Rosters Ready
                        </span>
                      </div>

                      <div className="glass-panel p-4 rounded-2xl border border-gray-800 text-center space-y-1">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                          Total Matches
                        </span>
                        <div className="text-2xl font-black text-blue-400">
                          {manageDashboard?.summary?.totalMatches || 0}
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {manageDashboard?.summary?.upcomingMatches || 0} Upcoming
                        </span>
                      </div>

                      <div className="glass-panel p-4 rounded-2xl border border-gray-800 text-center space-y-1">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                          Live Matches
                        </span>
                        <div className="text-2xl font-black text-amber-400">
                          {manageDashboard?.summary?.liveMatches || 0}
                        </div>
                        <span className="text-[10px] text-gray-400">Underway</span>
                      </div>

                      <div className="glass-panel p-4 rounded-2xl border border-gray-800 text-center space-y-1">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                          Completed
                        </span>
                        <div className="text-2xl font-black text-purple-400">
                          {manageDashboard?.summary?.completedMatches || 0}
                        </div>
                        <span className="text-[10px] text-gray-400">Results Logged</span>
                      </div>
                    </div>

                    {/* Operational Warnings / Status Check */}
                    {manageDashboard?.warnings && manageDashboard.warnings.length > 0 && (
                      <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-2xl space-y-2">
                        <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4" /> Operational Checklist & Readiness Notices
                        </h4>
                        <ul className="list-disc list-inside text-xs text-amber-200/90 space-y-1">
                          {manageDashboard.warnings.map((w, idx) => (
                            <li key={idx}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Next Steps Guide */}
                    <div className="glass-panel p-4 rounded-2xl border border-gray-800 space-y-3">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Recommended Operational Workflow
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                        <div
                          onClick={() => setManageTab('teams')}
                          className="p-3 bg-gray-900 rounded-xl border border-gray-800 hover:border-emerald-500 cursor-pointer space-y-1"
                        >
                          <span className="font-bold text-emerald-400">1. Teams & Rosters</span>
                          <p className="text-[11px] text-gray-400">Add teams & ensure 11+ players per squad.</p>
                        </div>
                        <div
                          onClick={() => setManageTab('managers')}
                          className="p-3 bg-gray-900 rounded-xl border border-gray-800 hover:border-emerald-500 cursor-pointer space-y-1"
                        >
                          <span className="font-bold text-emerald-400">2. Assign Managers</span>
                          <p className="text-[11px] text-gray-400">Assign TEAM_MANAGER users to squads.</p>
                        </div>
                        <div
                          onClick={() => setManageTab('fixtures')}
                          className="p-3 bg-gray-900 rounded-xl border border-gray-800 hover:border-emerald-500 cursor-pointer space-y-1"
                        >
                          <span className="font-bold text-emerald-400">3. Generate Fixtures</span>
                          <p className="text-[11px] text-gray-400">Auto-generate Round-Robin or Knockout bracket.</p>
                        </div>
                        <div
                          onClick={() => setManageTab('scorers')}
                          className="p-3 bg-gray-900 rounded-xl border border-gray-800 hover:border-emerald-500 cursor-pointer space-y-1"
                        >
                          <span className="font-bold text-emerald-400">4. Assign Scorers</span>
                          <p className="text-[11px] text-gray-400">Assign SCORER users to scheduled fixtures.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 2: TEAMS & ROSTERS */}
                {/* ------------------------------------------------------------- */}
                {manageTab === 'teams' && (
                  <div className="space-y-4">
                    {/* Add Existing Team Action */}
                    <div className="glass-panel p-4 rounded-2xl border border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="w-full sm:w-auto">
                        <h4 className="text-xs font-bold text-white">Add Existing Team to Tournament</h4>
                        <p className="text-[11px] text-gray-400">
                          Select from registered club teams in the platform database.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <select
                          value={selectedTeamToAdd}
                          onChange={(e) => setSelectedTeamToAdd(e.target.value)}
                          className="bg-gray-900 border border-gray-700 text-white text-xs rounded-xl p-2.5 flex-1 sm:w-64"
                        >
                          <option value="">-- Choose Team to Register --</option>
                          {manageDashboard?.availableTeams?.map((tm) => (
                            <option key={tm.id} value={tm.id}>
                              {tm.name} ({tm.shortName}) - {tm.playerCount} Players
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleAddTeamToTournament}
                          disabled={!selectedTeamToAdd || actionLoading}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow glow-emerald"
                        >
                          <Plus className="w-4 h-4" /> Add Team
                        </button>
                      </div>
                    </div>

                    {/* Registered Teams Table */}
                    <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-gray-900 text-gray-400 uppercase">
                            <tr>
                              <th className="p-3">Team Name</th>
                              <th className="p-3">City</th>
                              <th className="p-3">Players</th>
                              <th className="p-3">Roster Status</th>
                              <th className="p-3">Team Manager</th>
                              <th className="p-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800">
                            {manageDashboard?.registeredTeams?.length === 0 ? (
                              <tr>
                                <td colSpan="6" className="p-6 text-center text-gray-500 font-sans">
                                  No teams have been registered to this tournament yet.
                                </td>
                              </tr>
                            ) : (
                              manageDashboard.registeredTeams.map((reg) => (
                                <tr key={reg.registrationId} className="hover:bg-gray-900/40">
                                  <td className="p-3 font-sans font-bold text-white flex items-center gap-2">
                                    <span className="w-6 h-6 rounded bg-emerald-950 text-emerald-400 font-mono text-[10px] flex items-center justify-center font-bold">
                                      {reg.shortName}
                                    </span>
                                    {reg.name}
                                  </td>
                                  <td className="p-3 text-gray-300 font-sans">{reg.city}</td>
                                  <td className="p-3 font-bold text-gray-200">{reg.playerCount}</td>
                                  <td className="p-3 font-sans">
                                    <span
                                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                        reg.rosterStatus === 'READY'
                                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                          : reg.rosterStatus === 'INCOMPLETE'
                                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                                      }`}
                                    >
                                      {reg.rosterStatus === 'READY'
                                        ? 'READY (11+)'
                                        : reg.rosterStatus === 'INCOMPLETE'
                                        ? `INCOMPLETE (${reg.playerCount}/11)`
                                        : 'NO PLAYERS'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-gray-300 font-sans">
                                    {reg.manager
                                      ? `${reg.manager.firstName} ${reg.manager.lastName}`
                                      : 'Not Assigned'}
                                  </td>
                                  <td className="p-3 text-right">
                                    <button
                                      onClick={() => handleRemoveTeamFromTournament(reg.registrationId)}
                                      disabled={actionLoading}
                                      className="p-1.5 bg-gray-900 hover:bg-red-950/60 text-red-400 rounded-lg border border-gray-800"
                                      title="Remove Team from Tournament"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* ------------------------------------------------------------- */}
                {/* TAB 3: TEAM MANAGERS & MATCH ASSIGNMENTS */}
                {/* ------------------------------------------------------------- */}
                {manageTab === 'managers' && (
                  <div className="space-y-4">
                    <div className="glass-panel p-4 rounded-2xl border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          Match-Specific Manager Assignments
                        </h4>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Search registered managers by @nickname to invite them to manage squads for individual matches.
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-mono text-gray-400">
                          Active Managers in System:{' '}
                          <span className="text-emerald-400 font-bold">
                            {manageDashboard?.eligibleManagers?.length || 0}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Match Fixture Manager Assignments */}
                    <div className="space-y-3">
                      {manageDashboard?.matches?.length === 0 ? (
                        <div className="p-8 text-center rounded-2xl bg-gray-900/40 border border-gray-800 space-y-2">
                          <Shield className="w-8 h-8 text-gray-600 mx-auto" />
                          <p className="text-xs text-gray-400">
                            No match fixtures generated yet. Generate tournament fixtures in the Fixtures tab to assign managers.
                          </p>
                          <button
                            onClick={() => setManageTab('fixtures')}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                          >
                            Go to Fixtures
                          </button>
                        </div>
                      ) : (
                        manageDashboard?.matches?.map((match) => {
                          const teamA = match.teamA;
                          const teamB = match.teamB;

                          const teamAMgr = match.teamAManager;
                          const teamBMgr = match.teamBManager;
                          const teamAPendingMgr = match.teamAPendingManager;
                          const teamBPendingMgr = match.teamBPendingManager;

                          const teamAStatus = match.teamAManagerStatus;
                          const teamBStatus = match.teamBManagerStatus;

                          return (
                            <div
                              key={match.id}
                              className="p-4 rounded-2xl bg-gray-900/70 border border-gray-800 space-y-3 hover:border-gray-700 transition-all"
                            >
                              {/* Fixture Header */}
                              <div className="flex items-center justify-between border-b border-gray-800/80 pb-2 text-xs">
                                <span className="font-mono text-[11px] text-gray-400 font-semibold">
                                  {match.matchDate ? new Date(match.matchDate).toLocaleDateString() : 'Scheduled'} • {match.venue || 'TBD'}
                                </span>

                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                    match.isReadyToScore
                                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/40'
                                      : 'bg-gray-800 text-gray-400 border-gray-700'
                                  }`}>
                                    {match.isReadyToScore ? '✓ READY TO SCORE' : 'SQUAD SETUP INCOMPLETE'}
                                  </span>
                                </div>
                              </div>

                              {/* Dual Team Manager Cards */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Team A Manager Card */}
                                <div className="p-3 rounded-xl bg-gray-950/60 border border-gray-850 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                      {teamA.name} ({teamA.shortName})
                                    </span>

                                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                      teamAStatus === 'ACCEPTED'
                                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                        : teamAStatus === 'PENDING'
                                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                        : 'bg-gray-900 text-gray-400 border border-gray-800'
                                    }`}>
                                      {teamAStatus}
                                    </span>
                                  </div>

                                  <div className="text-xs">
                                    {teamAStatus === 'ACCEPTED' && teamAMgr ? (
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="font-semibold text-gray-200">
                                            {teamAMgr.displayName || teamAMgr.nickname}
                                          </p>
                                          <p className="text-[10px] font-mono text-emerald-400">
                                            @{teamAMgr.nickname}
                                          </p>
                                        </div>
                                        <button
                                          onClick={() => handleOpenManagerModal(match, teamA)}
                                          className="text-[10px] font-bold text-gray-400 hover:text-white px-2 py-1 rounded bg-gray-900 hover:bg-gray-800 border border-gray-700"
                                        >
                                          Reassign
                                        </button>
                                      </div>
                                    ) : teamAStatus === 'PENDING' && teamAPendingMgr ? (
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="font-semibold text-amber-200">
                                            Request Sent to @{teamAPendingMgr.nickname}
                                          </p>
                                          <p className="text-[10px] text-gray-400">
                                            Waiting for manager acceptance...
                                          </p>
                                        </div>
                                        <button
                                          onClick={() => handleOpenManagerModal(match, teamA)}
                                          className="text-[10px] font-bold text-gray-400 hover:text-white px-2 py-1 rounded bg-gray-900 hover:bg-gray-800 border border-gray-700"
                                        >
                                          Change
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between">
                                        <span className="text-gray-500 text-[11px]">No manager assigned</span>
                                        <button
                                          onClick={() => handleOpenManagerModal(match, teamA)}
                                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm"
                                        >
                                          <Plus className="w-3 h-3" /> Assign Manager
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Team B Manager Card */}
                                <div className="p-3 rounded-xl bg-gray-950/60 border border-gray-850 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-teal-400" />
                                      {teamB.name} ({teamB.shortName})
                                    </span>

                                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                      teamBStatus === 'ACCEPTED'
                                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                        : teamBStatus === 'PENDING'
                                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                        : 'bg-gray-900 text-gray-400 border border-gray-800'
                                    }`}>
                                      {teamBStatus}
                                    </span>
                                  </div>

                                  <div className="text-xs">
                                    {teamBStatus === 'ACCEPTED' && teamBMgr ? (
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="font-semibold text-gray-200">
                                            {teamBMgr.displayName || teamBMgr.nickname}
                                          </p>
                                          <p className="text-[10px] font-mono text-teal-400">
                                            @{teamBMgr.nickname}
                                          </p>
                                        </div>
                                        <button
                                          onClick={() => handleOpenManagerModal(match, teamB)}
                                          className="text-[10px] font-bold text-gray-400 hover:text-white px-2 py-1 rounded bg-gray-900 hover:bg-gray-800 border border-gray-700"
                                        >
                                          Reassign
                                        </button>
                                      </div>
                                    ) : teamBStatus === 'PENDING' && teamBPendingMgr ? (
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="font-semibold text-amber-200">
                                            Request Sent to @{teamBPendingMgr.nickname}
                                          </p>
                                          <p className="text-[10px] text-gray-400">
                                            Waiting for manager acceptance...
                                          </p>
                                        </div>
                                        <button
                                          onClick={() => handleOpenManagerModal(match, teamB)}
                                          className="text-[10px] font-bold text-gray-400 hover:text-white px-2 py-1 rounded bg-gray-900 hover:bg-gray-800 border border-gray-700"
                                        >
                                          Change
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between">
                                        <span className="text-gray-500 text-[11px]">No manager assigned</span>
                                        <button
                                          onClick={() => handleOpenManagerModal(match, teamB)}
                                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm"
                                        >
                                          <Plus className="w-3 h-3" /> Assign Manager
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 4: FIXTURES & SCHEDULE */}
                {/* ------------------------------------------------------------- */}
                {manageTab === 'fixtures' && (
                  <div className="space-y-4">
                    {/* Fixture Generator Control Bar */}
                    <div className="glass-panel p-4 rounded-2xl border border-gray-800 space-y-3">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Generate / Schedule Matches
                          </h4>
                          <p className="text-[11px] text-gray-400">
                            Tournament format algorithm pairs all registered teams into match fixtures.
                          </p>
                        </div>

                        <button
                          onClick={handleGenerateSchedule}
                          disabled={
                            actionLoading || (manageDashboard?.registeredTeams?.length || 0) < 2
                          }
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow glow-emerald"
                        >
                          <Calendar className="w-4 h-4" /> Generate Match Schedule
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                        <div>
                          <label className="text-[11px] text-gray-400 block mb-1">Format</label>
                          <select
                            value={selectedFormat}
                            onChange={(e) => setSelectedFormat(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl p-2"
                          >
                            <option value="LEAGUE">Round-Robin (LEAGUE)</option>
                            <option value="KNOCKOUT">Knockout Bracket</option>
                            <option value="ROUND_ROBIN">Round Robin</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] text-gray-400 block mb-1">Default Venue</label>
                          <input
                            type="text"
                            value={fixtureVenue}
                            onChange={(e) => setFixtureVenue(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl p-2"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-gray-400 block mb-1">Start Date</label>
                          <input
                            type="datetime-local"
                            value={fixtureStartDate}
                            onChange={(e) => setFixtureStartDate(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl p-2"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Matches List */}
                    <div className="space-y-2">
                      {manageDashboard?.matches?.length === 0 ? (
                        <div className="glass-panel p-8 text-center text-gray-400 rounded-2xl border border-gray-800 text-xs">
                          No fixtures have been generated yet. Click 'Generate Match Schedule' above.
                        </div>
                      ) : (
                        manageDashboard.matches.map((m, idx) => (
                          <div
                            key={m.id}
                            className="glass-panel p-3.5 rounded-xl border border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-gray-700 text-xs font-semibold"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-gray-500 text-[10px] w-6">
                                #{idx + 1}
                              </span>
                              <span className="text-white font-bold">
                                {m.teamA?.name} <span className="text-emerald-400 font-mono">vs</span>{' '}
                                {m.teamB?.name}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-gray-400 text-[11px]">
                              <span className="flex items-center gap-1 font-mono">
                                <Clock className="w-3.5 h-3.5 text-blue-400" />
                                {new Date(m.matchDate).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                                {m.venue}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  m.status === 'LIVE'
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                    : m.status === 'COMPLETED'
                                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                }`}
                              >
                                {m.status}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 5: SCORING ACCESS LINKS & PLAYING XI READINESS */}
                {/* ------------------------------------------------------------- */}
                {manageTab === 'scorers' && (
                  <div className="space-y-4">
                    <div className="glass-panel p-4 rounded-2xl border border-gray-800">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-emerald-400" /> Match Scoring Links & Staffing
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Generate cryptographically secure, random, match-specific Scoring Access Links. Copy and share each link with the designated match scorer. Scorers access only their specific match scoring console without needing admin or system accounts.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {manageDashboard?.matches?.length === 0 ? (
                        <div className="glass-panel p-8 text-center text-gray-400 rounded-2xl border border-gray-800 text-xs">
                          No fixtures available. Please generate match fixtures first.
                        </div>
                      ) : (
                        manageDashboard.matches.map((m) => {
                          const scoringUrl = m.scoringToken
                            ? `${window.location.origin}/score/${m.scoringToken}`
                            : '';
                          const isCopied = copiedMatchId === m.id;

                          return (
                            <div
                              key={m.id}
                              className="glass-panel p-4 rounded-2xl border border-gray-800 space-y-3 text-xs"
                            >
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-800/80 pb-3">
                                <div>
                                  <h5 className="font-bold text-white text-sm flex items-center gap-2">
                                    {m.teamA?.name}{' '}
                                    <span className="text-emerald-400 font-mono">vs</span>{' '}
                                    {m.teamB?.name}
                                  </h5>
                                  <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                                    {new Date(m.matchDate).toLocaleDateString()} | {m.venue}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  {/* Playing XI Readiness Badge */}
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border ${
                                      m.isPlayingXIReady
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                        : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                    }`}
                                  >
                                    Lineups: {m.teamAPlayingXICount || 0}/11 vs {m.teamBPlayingXICount || 0}/11{' '}
                                    {m.isPlayingXIReady ? '(Ready)' : '(Pending)'}
                                  </span>

                                  {/* Match Status Badge */}
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border ${
                                      m.status === 'LIVE'
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 glow-emerald'
                                        : m.status === 'COMPLETED'
                                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                    }`}
                                  >
                                    {m.status}
                                  </span>
                                </div>
                              </div>

                              {/* Scoring Link Widget */}
                              <div className="pt-1">
                                {m.scoringToken ? (
                                  <div className="space-y-2">
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                      <div className="flex-1 bg-gray-900 border border-gray-700/80 rounded-xl px-3 py-2 text-[11px] font-mono text-emerald-300 flex items-center gap-2 overflow-x-auto select-all">
                                        <Key className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                        <span className="truncate">{scoringUrl}</span>
                                      </div>

                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => handleCopyScoringLink(m.id, m.scoringToken)}
                                          className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                                            isCopied
                                              ? 'bg-emerald-600 text-white shadow-lg glow-emerald'
                                              : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700'
                                          }`}
                                          title="Copy scoring link to clipboard"
                                        >
                                          {isCopied ? (
                                            <>
                                              <Check className="w-3.5 h-3.5" /> Copied!
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="w-3.5 h-3.5" /> Copy Link
                                            </>
                                          )}
                                        </button>

                                        <Link
                                          to={`/score/${m.scoringToken}`}
                                          target="_blank"
                                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow glow-emerald"
                                          title="Open Scorer Console"
                                        >
                                          Console <ExternalLink className="w-3.5 h-3.5" />
                                        </Link>

                                        <button
                                          type="button"
                                          onClick={() => handleGenerateScoringLink(m.id)}
                                          disabled={actionLoading}
                                          className="px-2.5 py-2 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white rounded-xl border border-gray-700 font-bold text-[11px]"
                                          title="Regenerate a new secure token (invalidates previous link)"
                                        >
                                          Regen
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleRevokeScoringLink(m.id)}
                                          disabled={actionLoading}
                                          className="px-2.5 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-xl border border-red-800/60 font-bold text-[11px]"
                                          title="Revoke scoring access link"
                                        >
                                          Revoke
                                        </button>
                                      </div>
                                    </div>

                                    {m.scoringTokenGeneratedAt && (
                                      <span className="text-[10px] text-gray-500 font-mono block">
                                        Token generated: {new Date(m.scoringTokenGeneratedAt).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 bg-gray-900/80 rounded-xl border border-gray-800">
                                    <span className="text-[11px] text-gray-400 italic">
                                      No scoring link active for this fixture.
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleGenerateScoringLink(m.id)}
                                      disabled={actionLoading}
                                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow glow-emerald"
                                    >
                                      <Link2 className="w-3.5 h-3.5" /> Generate Scoring Link
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 6: STANDINGS */}
                {/* ------------------------------------------------------------- */}
                {manageTab === 'standings' && (
                  <div className="space-y-4">
                    <div className="glass-panel p-4 rounded-2xl border border-gray-800">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Official Points Table Standings
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Points & Net Run Rate (NRR) updated automatically upon match conclusion.
                      </p>
                    </div>

                    <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-gray-900 text-gray-400 uppercase">
                            <tr>
                              <th className="p-3">Pos</th>
                              <th className="p-3">Team</th>
                              <th className="p-3">P</th>
                              <th className="p-3">W</th>
                              <th className="p-3">L</th>
                              <th className="p-3">T/NR</th>
                              <th className="p-3">NRR</th>
                              <th className="p-3 text-emerald-400 font-bold">Pts</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800">
                            {manageDashboard?.standings?.length === 0 ? (
                              <tr>
                                <td colSpan="8" className="p-6 text-center text-gray-500 font-sans">
                                  No standing records initialized.
                                </td>
                              </tr>
                            ) : (
                              manageDashboard.standings.map((row, idx) => (
                                <tr key={row.id} className="hover:bg-gray-900/40">
                                  <td className="p-3 font-bold text-gray-400">{idx + 1}</td>
                                  <td className="p-3 font-sans font-bold text-white">
                                    {row.team?.name} ({row.team?.shortName})
                                  </td>
                                  <td className="p-3 text-gray-300">{row.played}</td>
                                  <td className="p-3 text-emerald-400 font-bold">{row.won}</td>
                                  <td className="p-3 text-red-400">{row.lost}</td>
                                  <td className="p-3 text-gray-400">{row.tied + (row.noResult || 0)}</td>
                                  <td className="p-3 text-gray-300">
                                    {Number(row.netRunRate || 0).toFixed(3)}
                                  </td>
                                  <td className="p-3 text-emerald-400 font-black text-sm">
                                    {row.points}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 7: STAFF SUMMARY */}
                {/* ------------------------------------------------------------- */}
                {manageTab === 'staff' && (
                  <div className="space-y-4">
                    <div className="glass-panel p-4 rounded-2xl border border-gray-800">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Operational Staff Directory
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Overview of Organizer, Team Managers, and Match Scorers for this tournament.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Organizer Card */}
                      <div className="glass-panel p-4 rounded-2xl border border-gray-800 space-y-2">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950 px-2 py-0.5 rounded">
                          Tournament Organizer
                        </span>
                        <h5 className="font-bold text-white text-sm">
                          {manageDashboard?.staff?.organizer?.name || 'Not Configured'}
                        </h5>
                        <p className="text-xs text-gray-400">
                          Email: {manageDashboard?.staff?.organizer?.email || 'N/A'}
                        </p>
                      </div>

                      {/* Team Managers Card */}
                      <div className="glass-panel p-4 rounded-2xl border border-gray-800 space-y-2">
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-950 px-2 py-0.5 rounded">
                          Team Managers ({manageDashboard?.staff?.teamManagers?.length || 0})
                        </span>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
                          {manageDashboard?.staff?.teamManagers?.map((tm) => (
                            <div
                              key={tm.teamId}
                              className="p-2 bg-gray-900/60 rounded-lg flex justify-between items-center"
                            >
                              <span className="text-white font-bold">{tm.teamName}</span>
                              <span className="text-gray-400">{tm.managerName}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Match Scorers Card */}
                      <div className="glass-panel p-4 rounded-2xl border border-gray-800 space-y-2 md:col-span-2">
                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest bg-purple-950 px-2 py-0.5 rounded">
                          Match Scorers ({manageDashboard?.staff?.matchScorers?.length || 0})
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {manageDashboard?.staff?.matchScorers?.map((sc) => (
                            <div
                              key={sc.matchId}
                              className="p-2.5 bg-gray-900/60 rounded-lg flex justify-between items-center"
                            >
                              <div>
                                <div className="text-white font-bold">{sc.matchTitle}</div>
                                <div className="text-[10px] text-gray-500">{sc.status}</div>
                              </div>
                              <span
                                className={`text-[11px] font-semibold ${
                                  sc.isAssigned ? 'text-emerald-400' : 'text-amber-400'
                                }`}
                              >
                                {sc.scorerName}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 w-full max-w-lg space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Create New Tournament</h2>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-gray-300 mb-1">Tournament Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Description</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1">Format *</label>
                  <select
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                  >
                    <option value="LEAGUE">LEAGUE</option>
                    <option value="KNOCKOUT">KNOCKOUT</option>
                    <option value="ROUND_ROBIN">ROUND ROBIN</option>
                    <option value="HYBRID">HYBRID</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                  >
                    <option value="UPCOMING">UPCOMING</option>
                    <option value="LIVE">LIVE</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1">Start Date *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">End Date *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg glow-emerald"
              >
                {submitting ? 'Creating...' : 'Create Tournament'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 w-full max-w-lg space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Edit Tournament</h2>
              <button onClick={() => setShowEditModal(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-gray-300 mb-1">Tournament Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Description</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1">Format</label>
                  <select
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                  >
                    <option value="LEAGUE">LEAGUE</option>
                    <option value="KNOCKOUT">KNOCKOUT</option>
                    <option value="ROUND_ROBIN">ROUND ROBIN</option>
                    <option value="HYBRID">HYBRID</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                  >
                    <option value="UPCOMING">UPCOMING</option>
                    <option value="LIVE">LIVE</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg"
              >
                {submitting ? 'Updating...' : 'Save Tournament Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MANAGER ASSIGNMENT SEARCH & REQUEST MODAL */}
      {managerModal.open && managerModal.match && managerModal.team && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 w-full max-w-lg space-y-4 animate-in fade-in scale-95 duration-150">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-gray-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                  Assign Match Manager
                </span>
                <h3 className="text-base font-bold text-white">
                  {managerModal.team.name} ({managerModal.team.shortName})
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Fixture: vs {managerModal.match.teamAId === managerModal.team.id ? managerModal.match.teamB?.name : managerModal.match.teamA?.name}
                </p>
              </div>

              <button
                onClick={() => setManagerModal({ open: false, match: null, team: null, searchQuery: '', searchResults: [], loading: false })}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 block">
                Search Registered Managers by @Nickname or Name:
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. MikeManager or John..."
                  value={managerModal.searchQuery}
                  onChange={(e) => handleSearchManagersQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-gray-950 border border-gray-800 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Manager Search Results List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {managerModal.loading ? (
                <div className="py-6 text-center text-xs text-gray-400">Searching active managers...</div>
              ) : managerModal.searchResults.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400 space-y-1">
                  <p>No active registered managers found matching this search.</p>
                  <p className="text-[10px] text-gray-500">Only users with an active Manager Profile can receive match assignments.</p>
                </div>
              ) : (
                managerModal.searchResults.map((mgr) => {
                  return (
                    <div
                      key={mgr.id || mgr.managerProfileId}
                      className="p-3 rounded-xl bg-gray-950/60 border border-gray-800 hover:border-emerald-600/50 flex items-center justify-between gap-3 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400 font-bold text-xs flex-shrink-0">
                          {mgr.displayName?.[0] || mgr.firstName?.[0] || 'M'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {mgr.displayName || `${mgr.firstName || ''} ${mgr.lastName || ''}`.trim()}
                          </p>
                          <span className="text-[10px] font-mono text-emerald-400 font-semibold block">
                            @{mgr.nickname}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          handleSendManagerRequest(
                            managerModal.match.id,
                            managerModal.team.id,
                            mgr.id || mgr.managerProfileId
                          )
                        }
                        disabled={actionLoading}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm glow-emerald transition-all"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Send Request
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Notice */}
            <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-[11px] text-gray-400">
              <span>Selected manager will receive a request in their fixtures console.</span>
              <button
                onClick={() => setManagerModal({ open: false, match: null, team: null, searchQuery: '', searchResults: [], loading: false })}
                className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-red-500/40 w-full max-w-md space-y-4 text-center">
            <h2 className="text-lg font-bold text-red-400">Delete Tournament</h2>
            <p className="text-xs text-gray-300">
              Are you sure you want to delete <span className="font-bold text-white">{formData.name}</span>?
              This action cannot be undone.
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
