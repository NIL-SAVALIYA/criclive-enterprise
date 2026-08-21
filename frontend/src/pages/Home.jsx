import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useSport } from '../context/SportContext';
import LiveTicker from '../components/LiveTicker';
import { Trophy, Flame, Play, ChevronRight, Activity, Calendar, Award } from 'lucide-react';

export default function Home() {
  const [matches, setMatches] = useState([]);
  const [caps, setCaps] = useState(null);
  const [loading, setLoading] = useState(true);

  const { currentSport } = useSport();

  useEffect(() => {
    async function fetchData() {
      try {
        const promises = [
          api.get('/matches', { params: { sport: currentSport } })
        ];
        if (currentSport === 'CRICKET') {
          promises.push(api.get('/records/caps-and-leaders'));
        }
        const [matchRes, capRes] = await Promise.all(promises);
        setMatches(matchRes.data.data || []);
        setCaps(capRes ? (capRes.data.data || null) : null);
      } catch (err) {
        console.error('Failed to load home page data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [currentSport]);

  const liveMatches = matches.filter((m) => m.status === 'LIVE');
  const upcomingMatches = matches.filter((m) => m.status === 'UPCOMING');
  const completedMatches = matches.filter((m) => m.status === 'COMPLETED');

  return (
    <div className="space-y-8 pb-12">
      <LiveTicker matches={liveMatches} />

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/80 via-gray-900 to-slate-900 border border-emerald-500/20 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl space-y-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5" /> {currentSport === 'BADMINTON' ? '🏸 Next-Gen Enterprise Badminton Engine' : '🏏 Next-Gen Enterprise Cricket Engine'}
          </span>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Real-Time Scoring, Deep Analytics & Tournament League Engine
          </h1>
          <p className="text-gray-300 text-sm lg:text-base leading-relaxed">
            {currentSport === 'BADMINTON' 
              ? 'Experience live rally-by-rally updates, set-by-set scoring statistics, player match history, and comprehensive league tournament standings.'
              : 'Experience Cricbuzz-grade live ball-by-ball updates, Wagon Wheel shot analysis, Pitch Map heatmaps, win probability predictions, and comprehensive tournament standings.'}
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              to="/admin/scorer"
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg glow-emerald transition-all"
            >
              <Play className="w-4 h-4 fill-white" /> Open Ball-by-Ball Scorer Console
            </Link>
            <Link
              to="/tournaments"
              className="px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 font-bold text-sm flex items-center gap-2 transition-all"
            >
              View Tournaments & Standings <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Live & Upcoming Matches */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Live & Matches */}
        <div className={`${currentSport === 'BADMINTON' ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-6`}>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <Activity className="w-5 h-5 text-emerald-400" /> Active & Live Matches
            </h2>
          </div>

          {liveMatches.length === 0 ? (
            <div className="glass-panel p-8 rounded-xl text-center text-gray-400 space-y-2 border border-gray-800">
              <p className="font-semibold text-lg">No matches currently LIVE</p>
              <p className="text-xs">Schedule a match in the Admin Scorer Console to start live ball scoring.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveMatches.map((m) => (
                <div key={m.id} className="glass-panel p-5 rounded-xl border border-emerald-500/30 hover:border-emerald-400 transition-all space-y-4 shadow-lg">
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span className="bg-emerald-500/20 text-emerald-400 font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                      LIVE
                    </span>
                    <span>{m.venue || 'Stadium Venue'}</span>
                  </div>

                  <div className="space-y-3 my-2">
                    <div className="flex justify-between items-center font-bold text-base">
                      <span className="text-white">{m.teamA?.name}</span>
                      <span className="text-emerald-400 font-mono">Inning 1</span>
                    </div>
                    <div className="flex justify-between items-center font-bold text-base">
                      <span className="text-white">{m.teamB?.name}</span>
                      <span className="text-gray-400 font-mono">-</span>
                    </div>
                  </div>

                  <Link
                    to={`/matches/${m.id}`}
                    className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-bold text-xs rounded-lg flex justify-center items-center gap-1.5 border border-emerald-500/40 transition-all"
                  >
                    Match Center & Analytics <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Upcoming Matches */}
          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-bold flex items-center gap-2 text-white">
              <Calendar className="w-4 h-4 text-blue-400" /> Upcoming Fixtures
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingMatches.slice(0, 4).map((m) => (
                <div key={m.id} className="glass-panel p-4 rounded-xl border border-gray-800 space-y-2">
                  <div className="text-xs text-blue-400 font-semibold">{m.tournament?.name || 'League Match'}</div>
                  <div className="font-bold text-sm text-gray-200">
                    {m.teamA?.name} vs {m.teamB?.name}
                  </div>
                  <div className="text-xs text-gray-400 flex justify-between">
                    <span>{new Date(m.matchDate).toLocaleDateString()}</span>
                    <span>{m.venue}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Leaderboards */}
        {currentSport !== 'BADMINTON' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <Award className="w-5 h-5 text-amber-400" /> Leaders & Cap Holders
            </h2>

            {/* Orange Cap Card */}
            <div className="glass-panel p-5 rounded-xl border border-amber-500/30 space-y-3 shadow-lg glow-gold">
              <div className="flex justify-between items-center text-xs font-extrabold uppercase text-amber-400 tracking-wider">
                <span>Orange Cap (Most Runs)</span>
                <span className="text-lg">🏏</span>
              </div>
              {caps?.orangeCap ? (
                <div className="space-y-1">
                  <div className="text-lg font-extrabold text-white">
                    {caps.orangeCap.player?.firstName} {caps.orangeCap.player?.lastName}
                  </div>
                  <div className="text-xs text-gray-400">{caps.orangeCap.player?.team?.name}</div>
                  <div className="flex justify-between text-xs font-mono pt-2 text-amber-300">
                    <span>Runs: {caps.orangeCap.totalRuns}</span>
                    <span>SR: {caps.orangeCap.strikeRate}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">No stats logged yet.</p>
              )}
            </div>

            {/* Purple Cap Card */}
            <div className="glass-panel p-5 rounded-xl border border-purple-500/30 space-y-3 shadow-lg">
              <div className="flex justify-between items-center text-xs font-extrabold uppercase text-purple-400 tracking-wider">
                <span>Purple Cap (Most Wickets)</span>
                <span className="text-lg">🎯</span>
              </div>
              {caps?.purpleCap ? (
                <div className="space-y-1">
                  <div className="text-lg font-extrabold text-white">
                    {caps.purpleCap.player?.firstName} {caps.purpleCap.player?.lastName}
                  </div>
                  <div className="text-xs text-gray-400">{caps.purpleCap.player?.team?.name}</div>
                  <div className="flex justify-between text-xs font-mono pt-2 text-purple-300">
                    <span>Wickets: {caps.purpleCap.totalWickets}</span>
                    <span>Econ: {caps.purpleCap.economy}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">No stats logged yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
