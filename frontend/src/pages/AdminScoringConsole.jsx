import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useSport } from '../context/SportContext';
import BadmintonScoringConsole from '../components/BadmintonScoringConsole';
import FootballScoringConsole from '../components/FootballScoringConsole';
import CricketScoringConsole from '../components/CricketScoringConsole';
import { Settings, Play, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function AdminScoringConsole() {
  const [searchParams] = useSearchParams();
  const urlMatchId = searchParams.get('matchId');
  const urlToken = searchParams.get('token') || searchParams.get('scoringToken') || searchParams.get('accessToken');

  const { currentSport, isBadminton, isFootball, terminology } = useSport();

  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [loadingMatches, setLoadingMatches] = useState(true);

  // Fetch matches filtered strictly by current sport
  useEffect(() => {
    async function loadMatches() {
      setLoadingMatches(true);
      try {
        const res = await api.get('/matches', {
          params: { sport: currentSport }
        });
        const list = res.data.data || [];
        setMatches(list);

        if (list.length > 0) {
          let targetMatch = urlMatchId ? list.find((m) => m.id === urlMatchId) : null;
          if (!targetMatch) targetMatch = list.find((m) => m.status === 'LIVE');
          if (!targetMatch) targetMatch = list.find((m) => m.status === 'UPCOMING');
          if (!targetMatch) targetMatch = list[0];

          if (targetMatch) {
            setSelectedMatchId(targetMatch.id);
          }
        } else {
          setSelectedMatchId('');
        }
      } catch (err) {
        console.error('Failed to fetch matches for admin scorer:', err);
      } finally {
        setLoadingMatches(false);
      }
    }
    loadMatches();
  }, [currentSport, urlMatchId]);

  const selectedMatch = matches.find((m) => m.id === selectedMatchId);

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Match Selector Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <Settings className="w-7 h-7 text-emerald-400" />
            {isBadminton
              ? '🏸 Official Rally Scoring Console'
              : isFootball
              ? '⚽ Official Match Event Console'
              : '🏏 Official Ball-by-Ball Scorer Console'}
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            {isBadminton
              ? 'Real-time BWF rally point entry, service court determination, and game tracking'
              : isFootball
              ? 'Real-time match event entry (goals, cards, substitutions, penalties, match clock)'
              : 'Real-time match scoring terminal with Wagon Wheel & Pitch Map vector entry'}
          </p>
        </div>

        {/* Select Active Match */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-400">Active Match:</label>
          {loadingMatches ? (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> Loading fixtures...
            </div>
          ) : matches.length === 0 ? (
            <span className="text-xs text-amber-400 font-semibold">No {terminology.player || 'sport'} matches found</span>
          ) : (
            <select
              value={selectedMatchId}
              onChange={(e) => setSelectedMatchId(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-white rounded-lg p-2 text-xs font-semibold focus:border-emerald-500"
            >
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.teamA?.name} vs {m.teamB?.name} ({m.status})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* No Matches Found Empty State */}
      {!loadingMatches && matches.length === 0 && (
        <div className="glass-panel p-12 rounded-2xl border border-gray-800 text-center space-y-3">
          <p className="text-gray-300 font-bold text-base">
            No {currentSport === 'BADMINTON' ? 'Badminton' : 'Cricket'} fixtures available for scoring.
          </p>
          <p className="text-xs text-gray-500">
            Create or schedule a fixture in the Tournaments or Fixtures section to begin scoring.
          </p>
        </div>
      )}

      {/* Render Dedicated Sport Scorer */}
      {selectedMatchId && (
        currentSport === 'BADMINTON' ? (
          <BadmintonScoringConsole matchId={selectedMatchId} token={urlToken} />
        ) : currentSport === 'FOOTBALL' ? (
          <FootballScoringConsole matchId={selectedMatchId} token={urlToken} />
        ) : (
          <CricketScoringConsole matchId={selectedMatchId} initialMatch={selectedMatch} />
        )
      )}
    </div>
  );
}