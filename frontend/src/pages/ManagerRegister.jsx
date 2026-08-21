import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  Info,
  MapPin,
  Phone,
  FileText,
  User
} from 'lucide-react';

export default function ManagerRegister() {
  const navigate = useNavigate();
  const { user, isManager, refreshUserProfile } = useAuth();

  const [nickname, setNickname] = useState('');
  const [displayName, setDisplayName] = useState(
    user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : ''
  );
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');

  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState(null); // { available: bool, message: string }
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // If already a registered manager, redirect to manager profile
  useEffect(() => {
    if (isManager && user?.managerProfile) {
      navigate('/manager/profile');
    }
  }, [isManager, user, navigate]);

  // Debounced nickname availability check
  useEffect(() => {
    const cleanNick = nickname.trim().replace(/^@/, '');
    if (!cleanNick || cleanNick.length < 3) {
      setAvailability(null);
      setChecking(false);
      return;
    }

    setChecking(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/managers/check-nickname?nickname=${encodeURIComponent(cleanNick)}`);
        setAvailability(res.data.data);
      } catch (err) {
        setAvailability({
          available: false,
          message: err.response?.data?.message || 'Error checking availability.'
        });
      } finally {
        setChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [nickname]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!availability?.available) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      await api.post('/managers/register', {
        nickname: nickname.trim().replace(/^@/, ''),
        displayName: displayName.trim() || undefined,
        phone: phone.trim() || undefined,
        city: city.trim() || undefined,
        bio: bio.trim() || undefined
      });

      await refreshUserProfile();
      navigate('/manager/profile');
    } catch (err) {
      console.error('Manager registration error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to register manager profile.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Intro Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/70 via-gray-900/80 to-[#0B0F19] border border-emerald-800/40 shadow-xl space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Account Upgrade
            </span>
            <h1 className="text-xl font-black text-white">Register as a Team Manager</h1>
          </div>
        </div>

        <p className="text-xs text-gray-300 leading-relaxed">
          Upgrade your existing account with a globally unique Manager Nickname. Tournament organizers will use your nickname to find and assign you to match squads, enabling you to submit and lock the Playing XI.
        </p>

        <div className="flex items-center gap-2 pt-2 text-[11px] text-emerald-400 font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>No separate login required — your profile is linked directly to this account.</span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-gray-900/80 border border-gray-800 space-y-5 shadow-xl">
        {/* Nickname Field with Live Availability */}
        <div>
          <label className="block text-xs font-bold text-gray-200 mb-1.5 flex items-center justify-between">
            <span>Unique Manager Nickname *</span>
            <span className="text-[10px] text-gray-400 font-normal">3-30 letters, numbers, _, -</span>
          </label>

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-mono font-bold text-sm">
              @
            </span>
            <input
              type="text"
              required
              placeholder="e.g. MikeManager, CoachSteve"
              value={nickname}
              onChange={(e) => setNickname(e.target.value.replace(/\s+/g, ''))}
              className={`w-full pl-8 pr-10 py-2.5 rounded-xl bg-gray-950 border text-white text-xs font-mono font-bold transition-all focus:outline-none ${
                availability === null
                  ? 'border-gray-800 focus:border-emerald-500'
                  : availability.available
                  ? 'border-emerald-500/80 focus:border-emerald-400 bg-emerald-950/10'
                  : 'border-red-500/80 focus:border-red-400 bg-red-950/10'
              }`}
            />

            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
              {checking ? (
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
              ) : availability ? (
                availability.available ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )
              ) : null}
            </div>
          </div>

          {/* Availability Feedback Message */}
          {availability && (
            <p
              className={`text-[11px] mt-1.5 font-medium flex items-center gap-1 ${
                availability.available ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {availability.available ? '✓ ' : '✕ '} {availability.message}
            </p>
          )}
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">
            Public Display Name
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Your full name or coaching alias"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* City and Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">City / Region</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. Mumbai, London, Melbourne"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Contact Phone</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Coaching / Manager Bio */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">
            Manager Bio & Experience (Optional)
          </label>
          <div className="relative">
            <FileText className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
            <textarea
              rows={3}
              placeholder="Brief summary of coaching experience, club history, or team management style..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors resize-none"
            />
          </div>
        </div>

        {/* Submit Action */}
        <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
          <Link
            to="/"
            className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting || !availability?.available}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-2 shadow-lg glow-emerald transition-all"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Registering...
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5" /> Activate Manager Profile
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
