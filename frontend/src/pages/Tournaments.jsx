import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Skeleton from '../components/Skeleton';
import { Trophy, Plus, Search, Filter, Edit, Trash2, Calendar, Award, BarChart2, AlertCircle, X, CheckCircle2 } from 'lucide-react';

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

  async function fetchTournaments() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/tournaments');
      const list = res.data.data || [];
      setTournaments(list);
      if (list.length > 0) {
        selectTournament(list[0].id);
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
  const paginatedTournaments = filteredTournaments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
      await api.post('/tournaments', payload);
      setSuccessMsg('Tournament created successfully!');
      setShowCreateModal(false);
      fetchTournaments();
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

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <Trophy className="w-8 h-8 text-amber-400" /> Tournament League Management
          </h1>
          <p className="text-gray-400 text-xs mt-1">Official tournaments, format categories, points table NRR, and leaderboards</p>
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

      {/* Search & Filters Controls */}
      <div className="glass-panel p-4 rounded-xl border border-gray-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search tournament name..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
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
              onChange={(e) => { setFormatFilter(e.target.value); setCurrentPage(1); }}
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
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
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
                return (
                  <div
                    key={t.id}
                    onClick={() => selectTournament(t.id)}
                    className={`glass-panel p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-950/30 glow-emerald scale-105'
                        : 'border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-extrabold text-base text-white leading-snug">{t.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          t.status === 'LIVE'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse'
                            : t.status === 'COMPLETED'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2">{t.description || 'No description provided.'}</p>
                    </div>

                    <div className="pt-2 border-t border-gray-800/80 flex justify-between items-center text-xs">
                      <span className="font-mono text-emerald-400 font-bold bg-gray-900 px-2 py-1 rounded">
                        {t.format}
                      </span>

                      {/* Admin Controls */}
                      {hasRole(['ADMIN', 'ORGANIZER']) && (
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenEdit(t)}
                            className="p-1.5 bg-gray-900 hover:bg-gray-800 text-blue-400 rounded-lg border border-gray-800"
                            title="Edit Tournament"
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
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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
              <div className="space-y-2 border-b border-gray-800 pb-4">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">
                  {selectedTournament.format} FORMAT
                </span>
                <h2 className="text-xl font-extrabold text-white">{selectedTournament.name}</h2>
                <p className="text-xs text-gray-400">{selectedTournament.description || 'Tournament overview and standings.'}</p>
                <div className="flex gap-4 text-xs font-mono text-gray-400 pt-1">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-blue-400" /> Start: {new Date(selectedTournament.startDate).toLocaleDateString()}</span>
                </div>
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
                        <tr><td colSpan="5" className="p-3 text-center text-gray-500 font-sans">No points logged.</td></tr>
                      ) : (
                        pointsTable.map((row) => (
                          <tr key={row.id}>
                            <td className="p-2 font-bold text-white font-sans">{row.team?.shortName || row.team?.name}</td>
                            <td className="p-2 text-gray-300">{row.played}</td>
                            <td className="p-2 text-emerald-400">{row.won}</td>
                            <td className="p-2 text-gray-400">{row.netRunRate}</td>
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

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 w-full max-w-lg space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Create New Tournament</h2>
              <button onClick={() => setShowCreateModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
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
              <button onClick={() => setShowEditModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
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

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-red-500/40 w-full max-w-md space-y-4 text-center">
            <h2 className="text-lg font-bold text-red-400">Delete Tournament</h2>
            <p className="text-xs text-gray-300">
              Are you sure you want to delete <span className="font-bold text-white">{formData.name}</span>? This action cannot be undone.
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
