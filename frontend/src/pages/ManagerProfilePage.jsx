import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  CalendarCheck,
  User,
  MapPin,
  Phone,
  Edit3,
  Power,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Activity,
  Calendar,
  Save,
  X
} from 'lucide-react';

export default function ManagerProfilePage() {
  const navigate = useNavigate();
  const { user, refreshUserProfile } = useAuth();

  const [profile, setProfile] = useState(null);
  const [fixturesData, setFixturesData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '',
    bio: '',
    phone: '',
    city: ''
  });
  const [saving, setSaving] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [toastMsg, setToastMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchManagerProfile();
  }, []);

  async function fetchManagerProfile() {
    setLoading(true);
    try {
      const [profileRes, fixturesRes] = await Promise.all([
        api.get('/managers/me'),
        api.get('/managers/me/fixtures')
      ]);

      if (!profileRes.data.data) {
        navigate('/manager/register');
        return;
      }

      setProfile(profileRes.data.data);
      setFixturesData(fixturesRes.data.data);

      setEditForm({
        displayName: profileRes.data.data.displayName || '',
        bio: profileRes.data.data.bio || '',
        phone: profileRes.data.data.phone || '',
        city: profileRes.data.data.city || ''
      });
    } catch (err) {
      console.error('Failed to load manager profile:', err);
      if (err.response?.status === 404) {
        navigate('/manager/register');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive() {
    setTogglingActive(true);
    try {
      const res = await api.post('/managers/me/toggle-active', {
        isActive: !profile.isActive
      });
      setProfile(res.data.data);
      await refreshUserProfile();
      setToastMsg({
        type: 'success',
        text: `Manager profile ${res.data.data.isActive ? 'activated' : 'deactivated'} successfully.`
      });
      setTimeout(() => setToastMsg({ type: '', text: '' }), 4000);
    } catch (err) {
      console.error('Failed to toggle active status:', err);
      setToastMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update active status.'
      });
    } finally {
      setTogglingActive(false);
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch('/managers/me', editForm);
      setProfile(res.data.data);
      setIsEditing(false);
      await refreshUserProfile();
      setToastMsg({
        type: 'success',
        text: 'Manager profile updated successfully!'
      });
      setTimeout(() => setToastMsg({ type: '', text: '' }), 4000);
    } catch (err) {
      console.error('Failed to update manager profile:', err);
      setToastMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update manager profile.'
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Toast Feedback */}
      {toastMsg.text && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
            toastMsg.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : 'bg-red-950/80 border-red-500/50 text-red-200'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          )}
          {toastMsg.text}
        </div>
      )}

      {/* Header Profile Hero Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0F172A] via-gray-900 to-[#0B0F19] border border-gray-800 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              {profile.profileImageUrl || user?.profileImageUrl ? (
                <img
                  src={profile.profileImageUrl || user?.profileImageUrl}
                  alt={profile.displayName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500/60 shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-black text-xl shadow-lg">
                  {profile.displayName?.[0] || 'M'}
                </div>
              )}
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-950 ${
                  profile.isActive ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
                title={profile.isActive ? 'Active' : 'Inactive'}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-white">
                  {profile.displayName || `${user.firstName} ${user.lastName}`}
                </h1>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    profile.isActive
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/40'
                      : 'bg-amber-950/80 text-amber-300 border-amber-600/40'
                  }`}
                >
                  {profile.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>

              <p className="text-xs font-mono text-emerald-400 font-bold mt-0.5">
                @{profile.nickname}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-2">
                {profile.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-500" /> {profile.city}
                  </span>
                )}
                {profile.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-gray-500" /> {profile.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 self-stretch sm:self-auto">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-gray-700 transition-all"
            >
              <Edit3 className="w-3.5 h-3.5 text-gray-400" /> Edit Profile
            </button>

            <button
              onClick={handleToggleActive}
              disabled={togglingActive}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                profile.isActive
                  ? 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border-amber-800/60'
                  : 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border-emerald-800/60'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              {profile.isActive ? 'Deactivate' : 'Activate'}
            </button>

            <Link
              to="/my-fixtures"
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md glow-emerald transition-all"
            >
              <CalendarCheck className="w-3.5 h-3.5" /> My Fixtures
            </Link>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="mt-4 pt-4 border-t border-gray-800/80 text-xs text-gray-300 leading-relaxed">
            <p>{profile.bio}</p>
          </div>
        )}
      </div>

      {/* Inactive Notice Banner */}
      {!profile.isActive && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Manager Profile is currently inactive.</span>
            <p className="text-gray-300 mt-0.5 text-[11px]">
              You will not appear in tournament organizer manager search results. You can reactivate your profile anytime with the button above.
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-gray-900/70 border border-gray-800 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-gray-400 uppercase">Pending Requests</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-amber-400">
              {fixturesData?.counts?.pending || 0}
            </span>
            <Shield className="w-4 h-4 text-amber-500/50" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gray-900/70 border border-gray-800 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-gray-400 uppercase">Upcoming Matches</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-400">
              {fixturesData?.counts?.upcoming || 0}
            </span>
            <Calendar className="w-4 h-4 text-emerald-500/50" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gray-900/70 border border-gray-800 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-gray-400 uppercase">Live Matches</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-teal-400">
              {fixturesData?.counts?.live || 0}
            </span>
            <Activity className="w-4 h-4 text-teal-500/50" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gray-900/70 border border-gray-800 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-gray-400 uppercase">Total Completed</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-gray-300">
              {fixturesData?.counts?.completed || 0}
            </span>
            <Trophy className="w-4 h-4 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0F1422] border border-gray-800 shadow-2xl p-6 space-y-4 animate-in fade-in scale-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" /> Edit Manager Details
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-300 mb-1">Display Name</label>
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Bio</label>
                <textarea
                  rows={3}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-md glow-emerald"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
