import React, { useEffect, useState } from 'react';
import api from '../api/client';
import Skeleton from '../components/Skeleton';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, Trophy, Users, Shield, Calendar, Activity, Bell, Radio, CheckCircle2, Award, Zap, AlertCircle, Plus, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];

export default function AdminDashboard() {
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [organizerApplications, setOrganizerApplications] = useState([]);
  const [leaders, setLeaders] = useState(null);

  const [loading, setLoading] = useState(true);
  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeContent, setNewNoticeContent] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [appActionLoading, setAppActionLoading] = useState(null);
  const [rejectingAppId, setRejectingAppId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const [tRes, tmRes, pRes, mRes, nRes, lRes, appRes] = await Promise.all([
        api.get('/tournaments'),
        api.get('/teams'),
        api.get('/players'),
        api.get('/matches'),
        api.get('/notifications').catch(() => ({ data: { data: [] } })),
        api.get('/records/caps-and-leaders').catch(() => ({ data: { data: null } })),
        api.get('/organizer-applications').catch(() => ({ data: { data: [] } }))
      ]);

      setTournaments(tRes.data.data || []);
      setTeams(tmRes.data.data || []);
      setPlayers(pRes.data.data || []);
      setMatches(mRes.data.data || []);
      setNotifications(nRes.data.data || []);
      setLeaders(lRes.data.data || null);
      setOrganizerApplications(appRes.data.data || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleReviewApplication(appId, status, reason = null) {
    setAppActionLoading(appId);
    try {
      await api.patch(`/organizer-applications/${appId}/status`, {
        status,
        rejectionReason: reason || undefined
      });
      setStatusMsg(`Application ${status.toLowerCase()} successfully!`);
      setRejectingAppId(null);
      setRejectionReason('');
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to review application:', err);
      setStatusMsg(err.response?.data?.message || 'Failed to update application.');
    } finally {
      setAppActionLoading(null);
    }
  }

  async function handleSuspendOrganizer(userId, reason) {
    setAppActionLoading(userId);
    try {
      await api.post(`/organizer-applications/suspend/${userId}`, {
        reason: reason || 'Administrative suspension'
      });
      setStatusMsg('Organizer privileges suspended successfully.');
      setRejectingAppId(null);
      setRejectionReason('');
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to suspend organizer:', err);
      setStatusMsg(err.response?.data?.message || 'Failed to suspend organizer.');
    } finally {
      setAppActionLoading(null);
    }
  }

  async function handlePublishNotification(e) {
    e.preventDefault();
    if (!newNoticeTitle || !newNoticeContent) return;
    setPublishing(true);
    try {
      await api.post('/notifications', {
        title: newNoticeTitle,
        message: newNoticeContent,
        type: 'SYSTEM'
      });
      setStatusMsg('Notification published to live feeds!');
      setNewNoticeTitle('');
      setNewNoticeContent('');
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to publish notification:', err);
    } finally {
      setPublishing(false);
    }
  }

  // Analytics Computation
  const liveMatches = matches.filter((m) => m.status === 'LIVE');
  const completedMatches = matches.filter((m) => m.status === 'COMPLETED');
  const upcomingMatches = matches.filter((m) => m.status === 'UPCOMING');

  const formatCounts = tournaments.reduce((acc, t) => {
    acc[t.format] = (acc[t.format] || 0) + 1;
    return acc;
  }, {});

  const formatChartData = Object.keys(formatCounts).map((k) => ({
    name: k,
    count: formatCounts[k]
  }));

  const teamPlayerCounts = teams.map((tm) => ({
    name: tm.shortName || tm.name,
    count: tm._count?.players || tm.players?.length || 0
  }));

  return (
    <div className="space-y-8 pb-12">
      {/* Dashboard Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-emerald-400" /> Enterprise Admin Control Dashboard
          </h1>
          <p className="text-gray-400 text-xs mt-1">Live match telemetry, tournament analytics, leaderboards, & system notifications</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span> Live Socket System Active
          </span>
        </div>
      </div>

      {/* Top Level Metric Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-3">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-10 w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-gray-800 flex justify-between items-center shadow-lg">
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase">Tournaments</div>
              <div className="text-3xl font-black text-white">{tournaments.length}</div>
            </div>
            <Trophy className="w-8 h-8 text-amber-400 opacity-80" />
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-gray-800 flex justify-between items-center shadow-lg">
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase">Registered Teams</div>
              <div className="text-3xl font-black text-emerald-400">{teams.length}</div>
            </div>
            <Shield className="w-8 h-8 text-emerald-400 opacity-80" />
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-gray-800 flex justify-between items-center shadow-lg">
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase">Total Players</div>
              <div className="text-3xl font-black text-blue-400">{players.length}</div>
            </div>
            <Users className="w-8 h-8 text-blue-400 opacity-80" />
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-emerald-500/30 flex justify-between items-center glow-emerald shadow-lg">
            <div>
              <div className="text-xs font-bold text-emerald-400 uppercase">Active Live Matches</div>
              <div className="text-3xl font-black text-white">{liveMatches.length}</div>
            </div>
            <Radio className="w-8 h-8 text-emerald-400 animate-pulse" />
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Analytics & Recent Matches */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Monitoring Panel */}
          <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-4">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-emerald-400" /> Live Match Telemetry Monitor
            </h2>
            {liveMatches.length === 0 ? (
              <p className="text-xs text-gray-400 p-3 bg-gray-900/60 rounded-xl border border-gray-800">
                No matches are currently LIVE. All live scoring feeds will stream here automatically.
              </p>
            ) : (
              <div className="space-y-3">
                {liveMatches.map((m) => (
                  <div key={m.id} className="p-4 bg-gray-900 rounded-xl border border-emerald-500/30 flex justify-between items-center">
                    <div>
                      <div className="font-extrabold text-sm text-white">{m.teamA?.name} vs {m.teamB?.name}</div>
                      <div className="text-xs text-emerald-400 font-semibold">{m.venue}</div>
                    </div>
                    <Link
                      to={`/matches/${m.id}`}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1"
                    >
                      Open Live Scorecard <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Team Roster Bar Chart */}
            <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-3">
              <h3 className="text-xs font-bold text-gray-300 uppercase">Team Player Capacity</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamPlayerCounts}>
                    <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151' }} />
                    <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tournament Formats Pie Chart */}
            <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-3">
              <h3 className="text-xs font-bold text-gray-300 uppercase">Tournament Formats Breakdown</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={formatChartData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                      {formatChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Completed Matches Table */}
          <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-4">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Recent Match Fixtures & Results
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-gray-900 text-gray-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3">Teams</th>
                    <th className="p-3">Venue</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {matches.slice(0, 5).map((m) => (
                    <tr key={m.id} className="hover:bg-gray-800/40">
                      <td className="p-3 font-bold text-white font-sans">{m.teamA?.name} vs {m.teamB?.name}</td>
                      <td className="p-3 text-gray-300 font-sans">{m.venue}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.status === 'LIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-300'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="p-3 text-gray-400">{new Date(m.matchDate).toLocaleDateString()}</td>
                      <td className="p-3 text-right">
                        {m.status === 'UPCOMING' && (
                          <Link 
                            to={`/admin/match-control/${m.id}`}
                            className="px-3 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 border border-blue-500/30 rounded text-xs font-bold transition-all"
                          >
                            Set up Match
                          </Link>
                        )}
                        {m.status === 'LIVE' && (
                          <Link 
                            to={`/admin/scorer`}
                            className="px-3 py-1 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 border border-emerald-500/30 rounded text-xs font-bold transition-all"
                          >
                            Score Match
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Organizer Applications Review Center */}
          <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" /> Organizer Applications Review
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {organizerApplications.filter((a) => a.status === 'PENDING').length} Pending
              </span>
            </div>

            {organizerApplications.length === 0 ? (
              <p className="text-xs text-gray-400 p-2">No organizer applications submitted yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-gray-900 text-gray-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3">Applicant</th>
                      <th className="p-3">Organization</th>
                      <th className="p-3">City / Phone</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Review Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {organizerApplications.map((app) => (
                      <tr key={app.id} className="hover:bg-gray-800/40">
                        <td className="p-3 font-sans">
                          <div className="font-bold text-white">
                            {app.user?.firstName} {app.user?.lastName}
                          </div>
                          <div className="text-[11px] text-gray-400">{app.user?.email}</div>
                        </td>
                        <td className="p-3 text-gray-200 font-sans">
                          <div className="font-semibold">{app.organizationName}</div>
                          {app.organizationType && (
                            <div className="text-[10px] text-gray-500">{app.organizationType}</div>
                          )}
                        </td>
                        <td className="p-3 text-gray-400 font-sans">
                          <div>{app.city || 'N/A'}</div>
                          <div className="text-[11px]">{app.phone || 'N/A'}</div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              app.status === 'APPROVED'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : app.status === 'PENDING'
                                ? 'bg-amber-500/20 text-amber-400 animate-pulse'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {app.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {app.status === 'PENDING' ? (
                            <div className="flex items-center justify-end gap-2">
                              {rejectingAppId === app.id ? (
                                <div className="flex items-center gap-1.5 font-sans">
                                  <input
                                    type="text"
                                    placeholder="Rejection reason..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="bg-gray-900 border border-gray-700 text-white rounded px-2 py-1 text-xs w-36"
                                  />
                                  <button
                                    onClick={() => handleReviewApplication(app.id, 'REJECTED', rejectionReason)}
                                    disabled={!rejectionReason.trim() || appActionLoading === app.id}
                                    className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setRejectingAppId(null)}
                                    className="px-2 py-1 bg-gray-800 text-gray-400 rounded text-xs"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleReviewApplication(app.id, 'APPROVED')}
                                    disabled={appActionLoading === app.id}
                                    className="px-3 py-1 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 border border-emerald-500/30 rounded text-xs font-bold transition-all"
                                  >
                                    {appActionLoading === app.id ? '...' : 'Approve'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRejectingAppId(app.id);
                                      setRejectionReason('');
                                    }}
                                    disabled={appActionLoading === app.id}
                                    className="px-2.5 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/40 border border-red-500/30 rounded text-xs font-bold transition-all"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          ) : app.status === 'APPROVED' ? (
                            <div className="flex items-center justify-end gap-2 font-sans">
                              {rejectingAppId === app.userId ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    placeholder="Suspension reason..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="bg-gray-900 border border-gray-700 text-white rounded px-2 py-1 text-xs w-36"
                                  />
                                  <button
                                    onClick={() => handleSuspendOrganizer(app.userId, rejectionReason)}
                                    disabled={!rejectionReason.trim() || appActionLoading === app.userId}
                                    className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold"
                                  >
                                    Suspend
                                  </button>
                                  <button
                                    onClick={() => setRejectingAppId(null)}
                                    className="px-2 py-1 bg-gray-800 text-gray-400 rounded text-xs"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setRejectingAppId(app.userId);
                                    setRejectionReason('');
                                  }}
                                  disabled={appActionLoading === app.userId}
                                  className="px-2.5 py-1 bg-amber-600/20 text-amber-400 hover:bg-amber-600/40 border border-amber-500/30 rounded text-xs font-bold transition-all"
                                >
                                  Suspend Access
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-500 font-sans">
                              Suspended / Inactive
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Leaderboards & System Notifications */}
        <div className="space-y-6">
          {/* Orange Cap & Leaders */}
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" /> Orange Cap & Purple Cap Leaders
            </h3>
            {leaders ? (
              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 bg-amber-950/40 rounded-xl border border-amber-500/30 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-amber-400 block font-sans uppercase">Orange Cap (Most Runs)</span>
                    <span className="font-bold text-white text-sm font-sans">{leaders.orangeCap?.name || 'N/A'}</span>
                  </div>
                  <span className="font-black text-amber-400 text-base">{leaders.orangeCap?.runs || 0} Runs</span>
                </div>

                <div className="p-3 bg-purple-950/40 rounded-xl border border-purple-500/30 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-purple-400 block font-sans uppercase">Purple Cap (Most Wickets)</span>
                    <span className="font-bold text-white text-sm font-sans">{leaders.purpleCap?.name || 'N/A'}</span>
                  </div>
                  <span className="font-black text-purple-400 text-base">{leaders.purpleCap?.wickets || 0} Wickets</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 p-2">Leaderboard data pending match completions.</p>
            )}
          </div>

          {/* System Notifications Center */}
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-400" /> System Broadcast Center
            </h3>

            {statusMsg && <p className="text-xs text-emerald-400 font-bold">{statusMsg}</p>}

            <form onSubmit={handlePublishNotification} className="space-y-3 text-xs font-semibold">
              <input
                type="text"
                required
                placeholder="Broadcast Title..."
                value={newNoticeTitle}
                onChange={(e) => setNewNoticeTitle(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
              />
              <textarea
                rows="2"
                required
                placeholder="Broadcast Message Content..."
                value={newNoticeContent}
                onChange={(e) => setNewNoticeContent(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5"
              />
              <button
                type="submit"
                disabled={publishing}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg"
              >
                {publishing ? 'Publishing...' : 'Publish System Announcement'}
              </button>
            </form>

            <div className="space-y-2 pt-2 max-h-48 overflow-y-auto">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Recent Broadcasts</span>
              {notifications.slice(0, 3).map((n) => (
                <div key={n.id} className="p-2.5 bg-gray-900 rounded-xl border border-gray-800 text-xs space-y-0.5">
                  <div className="font-bold text-white">{n.title}</div>
                  <div className="text-[11px] text-gray-400">{n.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
