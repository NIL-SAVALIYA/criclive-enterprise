import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { useSport } from '../context/SportContext';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export default function CreateTeam() {
  const navigate = useNavigate();
  const { currentSport, isCricket, isBadminton, isFootball, activeSportMeta, terminology } = useSport();

  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    city: '',
    description: '',
    logoUrl: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Fallback if sport cannot be determined
  if (!currentSport) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-bold text-white">Unable to determine sport.</h2>
        <p className="text-gray-400">Please return to Teams and select a sport.</p>
        <Link
          to="/teams"
          className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all mt-4"
        >
          Back to Teams
        </Link>
      </div>
    );
  }

  const sportName = activeSportMeta?.name || currentSport;
  const teamLabel = terminology?.team || 'Team';

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
        logoUrl: formData.logoUrl || undefined,
        sport: currentSport
      };
      const res = await api.post('/teams', payload);
      navigate(`/${currentSport.toLowerCase()}/teams`);
    } catch (err) {
      console.error('Create team error:', err);
      setErrorMsg(err.response?.data?.message || `Failed to create ${sportName} ${teamLabel.toLowerCase()}.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(`/${currentSport.toLowerCase()}/teams`)}
          className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            Create New {sportName} {teamLabel}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Sport: <span className="text-emerald-400 font-bold uppercase">{currentSport}</span>
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
          <p className="text-red-200 text-sm">{errorMsg}</p>
        </div>
      )}

      {/* Form */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-gray-800">
        <form onSubmit={handleCreateSubmit} className="space-y-6 text-sm font-semibold">
          <div>
            <label className="block text-gray-300 mb-2">{teamLabel} Name *</label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={100}
              placeholder={`e.g. ${isCricket ? 'Royal Challengers' : isFootball ? 'Real Madrid' : 'Smashers'}`}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-300 mb-2">Short Name (Code) *</label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={5}
                placeholder={`e.g. ${isCricket ? 'RCB' : isFootball ? 'RMA' : 'SMA'}`}
                value={formData.shortName}
                onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl p-3 uppercase focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">City / Base Location *</label>
              <input
                type="text"
                required
                minLength={2}
                placeholder="e.g. Bengaluru"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-300 mb-2">Description</label>
            <textarea
              rows="3"
              maxLength={500}
              placeholder={`Describe this ${sportName} ${teamLabel.toLowerCase()}...`}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none"
            />
          </div>
          
          <div className="pt-4 border-t border-gray-800">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 text-white font-bold rounded-xl shadow-lg glow-emerald transition-all flex items-center justify-center gap-2"
            >
              {submitting ? 'Creating...' : `Create ${sportName} ${teamLabel}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
