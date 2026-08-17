import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Skeleton from '../components/Skeleton';
import { Calendar, Radio, CheckCircle2, Clock, Search, Filter, Plus, Edit, Trash2, MapPin, ChevronRight, AlertCircle, X, Wand2 } from 'lucide-react';

export default function Fixtures() {
  const { user, hasRole } = useAuth();

  const [matches, setMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Tab & Filters
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, UPCOMING, LIVE, COMPLETED
  const [searchQuery, setSearchQuery] = useState('');
  const [tournamentFilter, setTournamentFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modals State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    tournamentId: '',
    teamAId: '',
    teamBId: '',
    venue: '',
    matchDate: '',
    status: 'UPCOMING'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [mRes, tRes, tmRes] = await Promise.all([
        api.get('/matches'),
        api.get('/tournaments'),
        api.get('/teams')
      ]);
      const matchData = mRes.data.data || [];
      const tourData = tRes.data.data || [];
      const teamData = tmRes.data.data || [];

      setMatches(matchData);
      setTournaments(tourData);
      setTeams(teamData);

      if (tourData.length > 0 && teamData.length > 1) {
        setFormData((prev) => ({
          ...prev,
          tournamentId: tourData[0].id,
          teamAId: teamData[0].id,
          teamBId: teamData[1].id
        }));
      }

      if (matchData.length > 0) {
        setSelectedMatch(matchData[0]);
      }
    } catch (err) {
      console.error('Failed to load fixtures:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to load fixtures.');
    } finally {
      setLoading(false);
    }
  }

  // Filter & Search Logic
  const filteredMatches = matches.filter((m) => {
    const q = searchQuery.toLowerCase();
    const teamA = m.teamA?.name?.toLowerCase() || '';
    const teamB = m.teamB?.name?.toLowerCase() || '';
    const venue = m.venue?.toLowerCase() || '';
    const tour = m.tournament?.name?.toLowerCase() || '';

    const matchesSearch = teamA.includes(q) || teamB.includes(q) || venue.includes(q) || tour.includes(q);
    const matchesTournament =
      tournamentFilter === 'ALL' ||
      m.tournamentId === tournamentFilter ||
      m.tournament?.id === tournamentFilter;

    return matchesSearch && matchesTab && matchesTournament;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredMatches.length / itemsPerPage) || 1;
  const paginatedMatches = filteredMatches.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Auto Generate Fixtures
  async function handleAutoGenerateFixtures(tournamentId) {
    if (!tournamentId) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.post(`/fixtures/generate/${tournamentId}`);
      setSuccessMsg('Tournament league fixtures generated successfully!');
      fetchData();
    } catch (err) {
      console.error('Generate error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to generate fixtures.');
    } finally {
      setSubmitting(false);
    }
  }

  // Form Handlers
  const handleOpenCreate = () => {
    const defaultDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
    setFormData({
      id: '',
      tournamentId: tournaments[0]?.id || '',
      teamAId: teams[0]?.id || '',
      teamBId: teams[1]?.id || '',
      venue: 'National Cricket Stadium',
      matchDate: defaultDate,
      status: 'UPCOMING'
    });
    setShowCreateModal(true);
  };

  const handleOpenEdit = (m) => {
    setFormData({
      id: m.id,
      tournamentId: m.tournamentId,
      teamAId: m.teamAId,
      teamBId: m.teamBId,
      venue: m.venue,
      matchDate: new Date(m.matchDate).toISOString().slice(0, 16),
      status: m.status
    });
    setShowEditModal(true);
  };

  const handleOpenDelete = (m) => {
    setFormData({ ...formData, id: m.id, venue: m.venue });
    setShowDeleteModal(true);
  };

  async function handleCreateSubmit(e) {
    e.preventDefault();
    if (formData.teamAId === formData.teamBId) {
      setErrorMsg('Team A and Team B cannot be the same.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const payload = {
        tournamentId: formData.tournamentId,
        teamAId: formData.teamAId,
        teamBId: formData.teamBId,
        venue: formData.venue,
        matchDate: new Date(formData.matchDate).toISOString(),
        status: formData.status
      };
      await api.post('/matches', payload);
      setSuccessMsg('Match scheduled successfully!');
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      console.error('Schedule match error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to schedule match.');
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
        venue: formData.venue,
        matchDate: new Date(formData.matchDate).toISOString(),
        status: formData.status
      };
      await api.put(`/matches/${formData.id}`, payload);
      setSuccessMsg('Match details updated!');
      setShowEditModal(false);
      fetchData();
    } catch (err) {
      console.error('Update match error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to update match.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteSubmit() {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.delete(`/matches/${formData.id}`);
      setSuccessMsg('Match cancelled/deleted successfully!');
      setShowDeleteModal(false);
      fetchData();
    } catch (err) {
      console.error('Delete match error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to delete match.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <Calendar className="w-8 h-8 text-blue-400" /> Fixtures & Match Schedule
          </h1>
          <p className="text-gray-400 text-xs mt-1">Live scores, upcoming fixtures, completed results, and automated league generator</p>
        </div>

        {hasRole(['ADMIN', 'ORGANIZER']) && (
          <div className="flex gap-3">
            {tournaments.length > 0 && (
              <button
                onClick={() => handleAutoGenerateFixtures(tournaments[0].id)}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
              >
                <Wand2 className="w-4 h-4" /> Auto-Generate Schedule
              </button>
            )}
            <button
              onClick={handleOpenCreate}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg glow-emerald transition-all"
            >
              <Plus className="w-4 h-4" /> Schedule New Match
            </button>
          </div>
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

      {/* Filter Tabs Header */}
      <div className="flex border-b border-gray-800 overflow-x-auto gap-2 scrollbar-none">
        {[
          { id: 'ALL', label: 'All Fixtures', icon: Calendar },
          { id: 'LIVE', label: 'Live Matches', icon: Radio },
          { id: 'UPCOMING', label: 'Upcoming', icon: Clock },
          { id: 'COMPLETED', label: 'Completed Results', icon: CheckCircle2 }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs transition-all shrink-0 ${
                isActive
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search & Tournament Filter */}
      <div className="glass-panel p-4 rounded-xl border border-gray-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search team, venue, tournament..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl pl-9 pr-3 py-2 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-bold text-gray-400">Tournament:</span>
          <select
            value={tournamentFilter}
            onChange={(e) => { setTournamentFilter(e.target.value); setCurrentPage(1); }}
            className="bg-gray-900 border border-gray-700 text-white text-xs font-semibold rounded-lg p-2"
          >
            <option value="ALL">All Tournaments</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Matches Cards & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Matches Grid & Pagination */}
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : paginatedMatches.length === 0 ? (
            <div className="glass-panel p-8 rounded-2xl text-center text-gray-400 space-y-2 border border-gray-800">
              <p className="font-bold text-base text-gray-200">No fixtures found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedMatches.map((m) => {
                const isSelected = selectedMatch?.id === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMatch(m)}
                    className={`glass-panel p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-950/30 glow-emerald scale-105'
                        : 'border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-[10px] text-gray-400">
                        <span className="font-bold text-blue-400">{m.tournament?.name || 'League Match'}</span>
                        <span className={`font-bold px-2 py-0.5 rounded-full border ${
                          m.status === 'LIVE'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse'
                            : m.status === 'COMPLETED'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }`}>
                          {m.status}
                        </span>
                      </div>

                      {/* Teams vs Header */}
                      <div className="flex justify-between items-center my-1 font-bold text-base">
                        <span className="text-white flex items-center gap-1.5">{m.teamA?.name}</span>
                        <span className="text-emerald-400 font-mono text-xs">VS</span>
                        <span className="text-white flex items-center gap-1.5">{m.teamB?.name}</span>
                      </div>

                      <div className="text-xs text-gray-400 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" /> {m.venue}
                      </div>
                      <div className="text-xs font-mono text-gray-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-400" /> {new Date(m.matchDate).toLocaleString()}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-800 flex justify-between items-center text-xs">
                      <Link
                        to={`/matches/${m.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-emerald-400 hover:underline font-bold flex items-center gap-1"
                      >
                        Match Center <ChevronRight className="w-3.5 h-3.5" />
                      </Link>

                      {hasRole(['ADMIN', 'ORGANIZER']) && (
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenEdit(m)}
                            className="p-1.5 bg-gray-900 hover:bg-gray-800 text-blue-400 rounded-lg border border-gray-800"
                            title="Edit Match"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {hasRole(['ADMIN']) && (
                            <button
                              onClick={() => handleOpenDelete(m)}
                              className="p-1.5 bg-gray-900 hover:bg-gray-800 text-red-400 rounded-lg border border-gray-800"
                              title="Delete Match"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
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
        </div>

        {/* Right 1 Col: Selected Match Overview Drawer */}
        <div className="space-y-6">
          {selectedMatch ? (
            <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">
                  {selectedMatch.status} MATCH
                </span>
                <span className="text-xs font-mono text-gray-400">{selectedMatch.tournament?.name}</span>
              </div>

              <div className="space-y-2 text-center my-4">
                <div className="text-xl font-extrabold text-white">{selectedMatch.teamA?.name}</div>
                <div className="text-xs font-mono font-bold text-emerald-400 uppercase">VS</div>
                <div className="text-xl font-extrabold text-white">{selectedMatch.teamB?.name}</div>
              </div>

              <div className="space-y-2 text-xs text-gray-300 border-t border-gray-800 pt-3">
                <div>Venue: <span className="text-white font-semibold">{selectedMatch.venue}</span></div>
                <div>Scheduled: <span className="text-white font-semibold">{new Date(selectedMatch.matchDate).toLocaleString()}</span></div>
                {selectedMatch.tossWinner && (
                  <div>Toss Winner: <span className="text-amber-400 font-bold">{selectedMatch.tossWinner?.name}</span> (Chose to {selectedMatch.tossDecision})</div>
                )}
                {selectedMatch.result && (
                  <div className="p-2.5 bg-emerald-950/40 rounded-xl border border-emerald-500/30 text-emerald-300 font-bold">
                    Result: {selectedMatch.result}
                  </div>
                )}
              </div>

              <Link
                to={`/matches/${selectedMatch.id}`}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl flex justify-center items-center gap-1.5 shadow-lg glow-emerald transition-all"
              >
                Open Full Match Center & Live Scorecard
              </Link>
            </div>
          ) : (
            <div className="glass-panel p-6 rounded-2xl border border-gray-800 text-center text-xs text-gray-400">
              Select a fixture to view match overview & toss details.
            </div>
          )}
        </div>
      </div>

      {/* SCHEDULE MATCH MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 w-full max-w-lg space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Schedule New Match</h2>
              <button onClick={() => setShowCreateModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-gray-300 mb-1">Tournament *</label>
                <select
                  value={formData.tournamentId}
                  onChange={(e) => setFormData({ ...formData, tournamentId: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                >
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1">Team A *</label>
                  <select
                    value={formData.teamAId}
                    onChange={(e) => setFormData({ ...formData, teamAId: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Team B *</label>
                  <select
                    value={formData.teamBId}
                    onChange={(e) => setFormData({ ...formData, teamBId: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1">Venue *</label>
                  <input
                    type="text"
                    required
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Match Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.matchDate}
                    onChange={(e) => setFormData({ ...formData, matchDate: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg glow-emerald"
              >
                {submitting ? 'Scheduling...' : 'Schedule Match'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MATCH MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 w-full max-w-lg space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Edit Match Details</h2>
              <button onClick={() => setShowEditModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-gray-300 mb-1">Venue</label>
                <input
                  type="text"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1">Match Date & Time</label>
                  <input
                    type="datetime-local"
                    value={formData.matchDate}
                    onChange={(e) => setFormData({ ...formData, matchDate: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                  />
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
                {submitting ? 'Updating...' : 'Save Match Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-red-500/40 w-full max-w-md space-y-4 text-center">
            <h2 className="text-lg font-bold text-red-400">Cancel / Delete Match</h2>
            <p className="text-xs text-gray-300">
              Are you sure you want to delete this match fixture? This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2 text-xs font-bold">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-lg"
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
