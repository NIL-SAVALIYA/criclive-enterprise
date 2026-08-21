import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Skeleton from '../components/Skeleton';
import { Shield, Plus, Search, Edit, Trash2, Users, MapPin, AlertCircle, X, CheckCircle2, UserCheck, ArrowRight } from 'lucide-react';

export default function TeamsAndPlayers() {
  const { user, hasRole } = useAuth();

  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Search & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
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
    shortName: '',
    city: '',
    description: '',
    logoUrl: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  async function fetchTeams(preferredSelectedId = null) {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/teams');
      const list = res.data.data || [];
      setTeams(list);
      const targetId = preferredSelectedId || (selectedTeam?.id && list.some(t => t.id === selectedTeam.id) ? selectedTeam.id : list[0]?.id);
      if (targetId) {
        selectTeam(targetId);
      }
    } catch (err) {
      console.error('Failed to fetch teams:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to load teams.');
    } finally {
      setLoading(false);
    }
  }

  async function selectTeam(id) {
    setDetailsLoading(true);
    try {
      const res = await api.get(`/teams/${id}`);
      setSelectedTeam(res.data.data);
    } catch (err) {
      console.error('Failed to load team details:', err);
    } finally {
      setDetailsLoading(false);
    }
  }

  // Filter & Search Logic
  const filteredTeams = teams.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.shortName.toLowerCase().includes(q) ||
      t.city.toLowerCase().includes(q)
    );
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredTeams.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTeams = filteredTeams.slice(
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
      name: '',
      shortName: '',
      city: '',
      description: '',
      logoUrl: ''
    });
    setShowCreateModal(true);
  };

  const handleOpenEdit = (t) => {
    setFormData({
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      city: t.city,
      description: t.description || '',
      logoUrl: t.logoUrl || ''
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
        shortName: formData.shortName.toUpperCase(),
        city: formData.city,
        description: formData.description || undefined,
        logoUrl: formData.logoUrl || undefined
      };
      const res = await api.post('/teams', payload);
      setSuccessMsg('Team created successfully!');
      setShowCreateModal(false);
      setSearchQuery('');
      setCurrentPage(1);
      const createdTeam = res.data.data;
      await fetchTeams(createdTeam?.id);
    } catch (err) {
      console.error('Create team error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to create team.');
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
        shortName: formData.shortName.toUpperCase(),
        city: formData.city,
        description: formData.description || undefined,
        logoUrl: formData.logoUrl || undefined
      };
      await api.put(`/teams/${formData.id}`, payload);
      setSuccessMsg('Team updated successfully!');
      setShowEditModal(false);
      fetchTeams();
    } catch (err) {
      console.error('Update team error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to update team.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteSubmit() {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.delete(`/teams/${formData.id}`);
      setSuccessMsg('Team deleted successfully!');
      setShowDeleteModal(false);
      fetchTeams();
    } catch (err) {
      console.error('Delete team error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to delete team.');
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
            <Shield className="w-8 h-8 text-emerald-400" /> Team Roster Directory
          </h1>
          <p className="text-gray-400 text-xs mt-1">Official franchise team management, player counts, and squad rosters</p>
        </div>

        <div className="flex items-center gap-3">
          {hasRole(['TEAM_MANAGER', 'ADMIN']) && (
            <Link
              to="/manager/fixtures"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-2 shadow-lg glow-emerald transition-all"
            >
              <Users className="w-4 h-4" /> My Fixtures & Playing XI
            </Link>
          )}

          {/* Create Team Action for Authorized Roles */}
          {hasRole(['ADMIN', 'ORGANIZER']) && (
            <button
              onClick={handleOpenCreate}
              className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all"
            >
              <Plus className="w-4 h-4" /> Create New Team
            </button>
          )}
        </div>
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

      {/* Search Bar */}
      <div className="glass-panel p-4 rounded-xl border border-gray-800 flex items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by team name, short code, or city..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl pl-9 pr-3 py-2 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Grid: Teams Cards & Squad Roster Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Team List Cards & Pagination */}
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : paginatedTeams.length === 0 ? (
            <div className="glass-panel p-8 rounded-2xl text-center text-gray-400 space-y-2 border border-gray-800">
              <p className="font-bold text-base text-gray-200">No teams match your search criteria.</p>
              <p className="text-xs text-gray-400">Try searching for a different name or create a new team.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedTeams.map((t) => {
                const isSelected = selectedTeam?.id === t.id;
                const playerCount = t.players?.length || t._count?.players || 0;
                return (
                  <div
                    key={t.id}
                    onClick={() => selectTeam(t.id)}
                    className={`glass-panel p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-950/30 glow-emerald scale-105'
                        : 'border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h3 className="font-extrabold text-base text-white">{t.name}</h3>
                          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400" /> {t.city}
                          </div>
                        </div>
                        <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {t.shortName}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2">{t.description || 'Franchise team roster.'}</p>
                    </div>

                    <div className="pt-2 border-t border-gray-800/80 flex justify-between items-center text-xs">
                      {/* Player Count Badge */}
                      <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30 font-semibold text-[11px]">
                        <Users className="w-3.5 h-3.5" /> {playerCount} Players
                      </span>

                      {/* Admin Controls */}
                      {hasRole(['ADMIN', 'ORGANIZER']) && (
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenEdit(t)}
                            className="p-1.5 bg-gray-900 hover:bg-gray-800 text-blue-400 rounded-lg border border-gray-800"
                            title="Edit Team"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {hasRole(['ADMIN']) && (
                            <button
                              onClick={() => handleOpenDelete(t)}
                              className="p-1.5 bg-gray-900 hover:bg-gray-800 text-red-400 rounded-lg border border-gray-800"
                              title="Delete Team"
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

        {/* Right 1 Col: Selected Team Details & Roster Drawer */}
        <div className="space-y-6">
          {detailsLoading ? (
            <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : selectedTeam ? (
            <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-6">
              <div className="space-y-2 border-b border-gray-800 pb-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">
                    {selectedTeam.shortName}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" /> {selectedTeam.city}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-white">{selectedTeam.name}</h2>
                <p className="text-xs text-gray-400">{selectedTeam.description || 'Franchise details & player squad roster.'}</p>
              </div>

              {/* Roster Squad List */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" /> Squad Roster ({selectedTeam.players?.length || 0})
                </h3>
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {(selectedTeam.players || []).length === 0 ? (
                    <p className="text-xs text-gray-500 p-2">No players assigned to this team yet.</p>
                  ) : (
                    selectedTeam.players.map((p) => (
                      <div key={p.id} className="p-3 bg-gray-900/80 rounded-xl border border-gray-800 flex justify-between items-center text-xs">
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            {p.firstName} {p.lastName}
                            {p.isCaptain && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold">C</span>}
                            {p.isViceCaptain && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-mono font-bold">VC</span>}
                          </div>
                          <div className="text-[10px] text-emerald-400">{p.playerType}</div>
                        </div>
                        {p.jerseyNumber && (
                          <span className="font-mono text-xs font-bold text-gray-400 bg-gray-800 px-2 py-1 rounded">
                            #{p.jerseyNumber}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Manager Fixtures Action */}
              {hasRole(['TEAM_MANAGER', 'ADMIN']) && (
                <div className="pt-2 border-t border-gray-800">
                  <Link
                    to="/manager/fixtures"
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-all glow-emerald"
                  >
                    <Users className="w-4 h-4" /> Go to My Fixtures & Playing XI <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel p-6 rounded-2xl border border-gray-800 text-center text-xs text-gray-400">
              Select a team to view squad roster & details.
            </div>
          )}
        </div>
      </div>

      {/* CREATE TEAM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 w-full max-w-lg space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Create New Team</h2>
              <button onClick={() => setShowCreateModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-gray-300 mb-1">Team Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Challengers"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1">Short Name *</label>
                  <input
                    type="text"
                    required
                    maxLength="10"
                    placeholder="e.g. RCB"
                    value={formData.shortName}
                    onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bengaluru"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Description</label>
                <textarea
                  rows="2"
                  placeholder="Franchise description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg glow-emerald"
              >
                {submitting ? 'Creating...' : 'Create Team'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TEAM MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 w-full max-w-lg space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Edit Team</h2>
              <button onClick={() => setShowEditModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-gray-300 mb-1">Team Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1">Short Name</label>
                  <input
                    type="text"
                    maxLength="10"
                    value={formData.shortName}
                    onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
                  />
                </div>
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
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg"
              >
                {submitting ? 'Updating...' : 'Save Team Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-red-500/40 w-full max-w-md space-y-4 text-center">
            <h2 className="text-lg font-bold text-red-400">Delete Team</h2>
            <p className="text-xs text-gray-300">
              Are you sure you want to delete <span className="font-bold text-white">{formData.name}</span>? This will also unassign associated players.
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
