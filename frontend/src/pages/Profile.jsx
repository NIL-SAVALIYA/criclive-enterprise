import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../api/client';
import {
  User,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  Trophy,
  Award,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  PlusCircle
} from 'lucide-react';

export default function Profile() {
  const { user, refreshUserProfile, isManager, isOrganizer, isAdmin } = useAuth();

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    profileImageUrl: user?.profileImageUrl || ''
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  const managerProfile = user.managerProfile;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await api.patch('/auth/profile', formData);
      await refreshUserProfile();
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Update profile error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <User className="w-6 h-6 text-emerald-400" />
            My User Profile
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage your personal details, account settings, and sport platform capabilities.
          </p>
        </div>

        {/* Action button to manager or organizer */}
        <div className="flex items-center gap-2">
          {isManager ? (
            <Link
              to="/manager/profile"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Shield className="w-3.5 h-3.5" /> View Manager Profile
            </Link>
          ) : (
            <Link
              to="/manager/register"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md glow-emerald transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Register as Manager
            </Link>
          )}
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Account Overview Card */}
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-gray-900/80 border border-gray-800 space-y-4">
            <div className="flex flex-col items-center text-center space-y-3">
              {formData.profileImageUrl ? (
                <img
                  src={formData.profileImageUrl}
                  alt={user.firstName}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500/50 shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-black text-2xl shadow-lg">
                  {user.firstName?.[0] || 'U'}{user.lastName?.[0] || ''}
                </div>
              )}

              <div>
                <h2 className="text-base font-bold text-white">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-0.5">
                  <Mail className="w-3 h-3 text-gray-500" /> {user.email}
                </p>
                {managerProfile?.nickname && (
                  <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                    @{managerProfile.nickname}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-800/80 space-y-2 text-xs">
              <div className="flex justify-between items-center text-gray-400">
                <span>Account Role</span>
                <span className="font-bold text-white uppercase">{user.role}</span>
              </div>
              <div className="flex justify-between items-center text-gray-400">
                <span>Member Since</span>
                <span className="text-gray-300">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active'}
                </span>
              </div>
            </div>
          </div>

          {/* Capabilities Card */}
          <div className="p-5 rounded-2xl bg-gray-900/80 border border-gray-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Account Capabilities
            </h3>

            <div className="space-y-2.5 text-xs">
              {/* Manager Capability */}
              <div className={`p-3 rounded-xl border flex items-start gap-3 ${
                isManager ? 'bg-emerald-950/30 border-emerald-800/60' : 'bg-gray-950/50 border-gray-800'
              }`}>
                <ShieldCheck className={`w-4 h-4 mt-0.5 ${isManager ? 'text-emerald-400' : 'text-gray-600'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Team Manager</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      isManager ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-800 text-gray-500'
                    }`}>
                      {isManager ? 'ACTIVE' : 'NOT REGISTERED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {isManager
                      ? `Registered as @${managerProfile?.nickname || 'Manager'}. Authorized to submit match Playing XIs.`
                      : 'Register a unique nickname to receive match manager assignments.'}
                  </p>
                </div>
              </div>

              {/* Organizer Capability */}
              <div className={`p-3 rounded-xl border flex items-start gap-3 ${
                isOrganizer ? 'bg-amber-950/30 border-amber-800/60' : 'bg-gray-950/50 border-gray-800'
              }`}>
                <Trophy className={`w-4 h-4 mt-0.5 ${isOrganizer ? 'text-amber-400' : 'text-gray-600'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Tournament Organizer</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      isOrganizer ? 'bg-amber-500/20 text-amber-300' : 'bg-gray-800 text-gray-500'
                    }`}>
                      {isOrganizer ? 'ACTIVE' : 'APPLICATION READY'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {isOrganizer
                      ? 'Create tournaments, schedule fixtures, and assign team managers.'
                      : 'Apply for organizer privileges to host official tournaments.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Profile Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-gray-900/80 border border-gray-800 space-y-5">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-gray-800 pb-3">
              Personal Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">First Name</label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Last Name</label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-950/50 border border-gray-850 text-gray-500 text-xs cursor-not-allowed"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">Email address cannot be changed.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Profile Picture URL</label>
              <input
                type="url"
                placeholder="https://example.com/avatar.jpg"
                value={formData.profileImageUrl}
                onChange={(e) => setFormData({ ...formData, profileImageUrl: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">Paste an image URL to display as your avatar.</span>
            </div>

            <div className="pt-4 border-t border-gray-800 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-md glow-emerald transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
