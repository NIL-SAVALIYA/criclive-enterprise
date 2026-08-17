import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Award,
  Building2,
  Phone,
  MapPin,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trophy,
  ArrowRight,
  ShieldCheck,
  Send,
  Sparkles
} from 'lucide-react';

export default function BecomeOrganizer() {
  const { user, refreshUserProfile } = useAuth();
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [formData, setFormData] = useState({
    organizationName: '',
    organizationType: 'CRICKET_CLUB',
    phone: '',
    city: '',
    description: ''
  });

  useEffect(() => {
    fetchMyApplications();
  }, []);

  async function fetchMyApplications() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/organizer-applications/my-application');
      setApplications(res.data.data || []);
    } catch (err) {
      console.error('Failed to load organizer status:', err);
    } finally {
      setLoading(false);
    }
  }

  const latestApplication = applications.length > 0 ? applications[0] : null;
  const isAlreadyOrganizer = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';
  const isSuspended = latestApplication && latestApplication.status === 'REJECTED' && latestApplication.rejectionReason?.includes('SUSPENDED');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMsg(null);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    if (!formData.organizationName.trim()) {
      setErrorMsg('Organization name is required.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.post('/organizer-applications', formData);
      setSuccessMsg('Organizer credentials validated! Your account is now upgraded to ORGANIZER.');
      if (refreshUserProfile) {
        await refreshUserProfile();
      }
      await fetchMyApplications();
    } catch (err) {
      console.error('Activation error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to activate organizer status. Please check your information.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="glass-panel p-8 rounded-2xl border border-gray-800 text-center space-y-3 shadow-2xl relative overflow-hidden">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-400 flex items-center justify-center text-white font-black text-2xl mx-auto shadow-lg glow-emerald">
          <Award className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-white">Organizer Activation Portal</h1>
        <p className="text-xs text-gray-400 max-w-lg mx-auto">
          Complete your cricket organization profile to instantly activate Tournament Organizer privileges for your account.
        </p>
      </div>

      {/* Already Organizer State */}
      {isAlreadyOrganizer && (
        <div className="glass-panel p-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  Active Organizer Status <Sparkles className="w-4 h-4 text-emerald-400" />
                </h3>
                <p className="text-xs text-gray-400">
                  Your account (<span className="text-emerald-400 font-bold">{user?.email}</span>) has full <span className="font-mono text-emerald-400 uppercase font-bold">{user?.role}</span> authorization.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold rounded-lg uppercase">
              Activated
            </span>
          </div>

          <p className="text-xs text-gray-300">
            You can now create official tournaments, configure team rosters, schedule matches, and assign match scorers.
          </p>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => navigate('/tournaments')}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg glow-emerald transition-all"
            >
              <Trophy className="w-4 h-4" /> Go to Tournament Management <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Suspended State Notice */}
      {!isAlreadyOrganizer && isSuspended && (
        <div className="glass-panel p-6 rounded-2xl border border-red-500/30 bg-red-950/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/20 rounded-xl text-red-400">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">Organizer Privileges Suspended</h3>
                <p className="text-xs text-gray-400">
                  Suspended by Platform Administrator
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold rounded-lg uppercase">
              Suspended
            </span>
          </div>
          {latestApplication.rejectionReason && (
            <div className="p-3 bg-red-950/60 rounded-xl border border-red-900/50 text-xs text-red-300">
              <span className="font-bold">Reason: </span> {latestApplication.rejectionReason}
            </div>
          )}
          <p className="text-xs text-gray-400">
            Please contact the platform administration to request reinstatement of organizer privileges.
          </p>
        </div>
      )}

      {/* Activation Form (For Viewers who are not suspended) */}
      {!isAlreadyOrganizer && !isSuspended && (
        <div className="glass-panel p-8 rounded-2xl border border-gray-800 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-white">Provide Organization Information</h2>
              <p className="text-xs text-gray-400">Enter your official league/club information to activate organizer access</p>
            </div>
            <Building2 className="w-6 h-6 text-emerald-400" />
          </div>

          {successMsg && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs font-bold text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-xs font-bold text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Organization / League Name <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <input
                  type="text"
                  name="organizationName"
                  required
                  placeholder="e.g. Apex Cricket Association, Gujarat Premier League"
                  value={formData.organizationName}
                  onChange={handleChange}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Organization Type</label>
                <select
                  name="organizationType"
                  value={formData.organizationType}
                  onChange={handleChange}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
                >
                  <option value="CRICKET_CLUB">Cricket Club / Academy</option>
                  <option value="LEAGUE_ORGANIZATION">Tournament / League Organizer</option>
                  <option value="CORPORATE">Corporate Sports Committee</option>
                  <option value="SCHOOL_COLLEGE">School / University</option>
                  <option value="INDEPENDENT">Independent Community Organizer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">City / Region</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    name="city"
                    placeholder="e.g. Ahmedabad, Mumbai"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Contact Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <input
                  type="text"
                  name="phone"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Tournament / League Description</label>
              <div className="relative">
                <FileText className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Describe the tournaments or leagues you plan to organize..."
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl pl-9 pr-3 py-2 text-xs font-semibold focus:border-emerald-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3 rounded-xl text-white font-extrabold text-xs uppercase tracking-wider shadow-lg transition-all flex justify-center items-center gap-2 mt-2 ${
                submitting
                  ? 'bg-gray-700 cursor-not-allowed opacity-75'
                  : 'bg-emerald-600 hover:bg-emerald-500 glow-emerald'
              }`}
            >
              <Send className="w-4 h-4" /> {submitting ? 'Validating Profile...' : 'Activate Organizer Account'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
