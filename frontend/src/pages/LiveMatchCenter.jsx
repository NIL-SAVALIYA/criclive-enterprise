import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useCricketSocket } from '../socket/useCricketSocket';
import WagonWheelSVG from '../components/WagonWheelSVG';
import PitchMapCanvas from '../components/PitchMapCanvas';
import WinProbabilityMeter from '../components/WinProbabilityMeter';
import Skeleton from '../components/Skeleton';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { Radio, Activity, MessageSquare, PieChart, Target, Shield, Flame, Award, ChevronRight, MapPin, Clock } from 'lucide-react';

export default function LiveMatchCenter() {
  const { matchId } = useParams();
  const { connected, liveScore: socketScore, commentaryFeed: socketCommentary, scorecard: socketScorecard } = useCricketSocket(matchId);

  const [activeTab, setActiveTab] = useState('scorecard');
  const [matchDetails, setMatchDetails] = useState(null);
  const [scorecardData, setScorecardData] = useState(null);
  const [commentaryList, setCommentaryList] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatchData();
  }, [matchId]);

  async function fetchMatchData() {
    setLoading(true);
    try {
      const [mRes, scRes, cRes, aRes] = await Promise.all([
        api.get(`/matches/${matchId}/live`),
        api.get(`/matches/${matchId}/scorecard`),
        api.get(`/commentary/${matchId}/commentary`).catch(() => ({ data: { data: [] } })),
        api.get(`/matches/${matchId}/analytics`).catch(() => ({ data: { data: null } }))
      ]);

      setMatchDetails(mRes.data.data);
      setScorecardData(scRes.data.data);
      setCommentaryList(cRes.data.data || []);
      setAnalytics(aRes.data.data);
    } catch (err) {
      console.error('Failed to fetch live match details:', err);
    } finally {
      setLoading(false);
    }
  }

  // Merge Socket data with initial fetch
  const match = matchDetails?.match || {};
  const live = socketScore || matchDetails || {};
  const score = live.score || live.currentInnings || {};
  const currentBatters = live.currentBatters || {};
  const currentBowler = live.currentBowling || {};
  const partnership = live.partnership || {};
  const recentBalls = live.recentBalls || [];
  const winProb = analytics?.winProbability;

  const combinedCommentary = socketCommentary.length > 0 ? [...socketCommentary, ...commentaryList] : commentaryList;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card - Cricbuzz Style Scorecard Header */}
      {loading ? (
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-950 via-slate-900 to-[#0B0F19] border border-gray-800 p-6 shadow-2xl space-y-4">
          <div className="flex justify-between items-center text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${match.status === 'LIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`}></span>
              <span className="font-extrabold text-emerald-400 uppercase tracking-widest">{match.status || 'LIVE'}</span>
              <span>• {match.venue}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px]">
                {connected ? '🟢 SOCKET LIVE' : '🟡 CONNECTING'}
              </span>
            </div>
          </div>

          {/* Main Teams Matchup Score Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
            <div className="glass-panel p-4 rounded-xl border border-emerald-500/30 flex justify-between items-center bg-emerald-950/20">
              <div>
                <div className="text-xl font-black text-white">{match.teamA?.name}</div>
                <div className="text-xs text-emerald-400 font-semibold">{match.tossWinnerId === match.teamAId ? 'Toss Winner' : 'Batting First'}</div>
              </div>
              <div className="text-right font-mono">
                <div className="text-3xl font-black text-emerald-400">
                  {score.runs ?? 0}/{score.wickets ?? 0}
                </div>
                <div className="text-xs text-gray-400">
                  ({score.overs ?? 0} Overs • CRR: {score.currentRunRate ?? 0})
                </div>
              </div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-gray-800 flex justify-between items-center opacity-90">
              <div>
                <div className="text-xl font-black text-white">{match.teamB?.name}</div>
                <div className="text-xs text-gray-400">
                  {score.target ? `Target: ${score.target} Runs` : 'Bowling / Chasing'}
                </div>
              </div>
              <div className="text-right font-mono">
                {score.requiredRunRate ? (
                  <div>
                    <div className="text-2xl font-black text-blue-400">RRR: {score.requiredRunRate}</div>
                    <div className="text-[11px] text-gray-400">Need {score.target - score.runs} runs</div>
                  </div>
                ) : (
                  <div className="text-lg font-extrabold text-gray-400">Yet to Bat</div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Balls Ticker */}
          <div className="flex items-center gap-3 bg-gray-900/90 p-3 rounded-xl border border-gray-800 text-xs font-mono overflow-x-auto scrollbar-none">
            <span className="font-sans font-bold text-gray-400 uppercase text-[11px] shrink-0">Recent Balls:</span>
            {recentBalls.length === 0 ? (
              <span className="text-gray-500 text-[11px] font-sans">No recent deliveries</span>
            ) : (
              recentBalls.map((b, idx) => {
                let badgeStyle = 'bg-gray-800 text-gray-200 border-gray-700';
                let label = b.totalRuns;
                if (b.isWicket) { badgeStyle = 'bg-red-600 text-white font-black border-red-400 glow-danger'; label = 'W'; }
                else if (b.totalRuns === 6) { badgeStyle = 'bg-emerald-600 text-white font-black border-emerald-400 glow-emerald'; label = '6'; }
                else if (b.totalRuns === 4) { badgeStyle = 'bg-amber-500 text-black font-black border-amber-400 glow-gold'; label = '4'; }
                else if (b.extraType === 'WIDE') { badgeStyle = 'bg-purple-600 text-white font-bold border-purple-400'; label = 'Wd'; }
                else if (b.extraType === 'NO_BALL') { badgeStyle = 'bg-purple-600 text-white font-bold border-purple-400'; label = 'Nb'; }

                return (
                  <span key={idx} className={`w-7 h-7 rounded-full flex items-center justify-center font-extrabold border shrink-0 text-xs ${badgeStyle}`}>
                    {label}
                  </span>
                );
              })
            )}
          </div>

          {/* Current Batsmen & Bowler Strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-900/60 p-4 rounded-xl border border-gray-800 text-xs">
            {/* Striker & Non-Striker */}
            <div className="space-y-1">
              <div className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Batting at Crease</div>
              <div className="flex justify-between font-mono">
                <span className="text-white font-bold">
                  {currentBatters.striker?.name || 'Striker'} <span className="text-amber-400">*</span>
                </span>
                <span className="text-emerald-400 font-bold">
                  {currentBatters.striker?.runs || 0} ({currentBatters.striker?.balls || 0}b) • SR: {currentBatters.striker?.strikeRate || 0}
                </span>
              </div>
              <div className="flex justify-between font-mono text-gray-400">
                <span>{currentBatters.nonStriker?.name || 'Non-Striker'}</span>
                <span>{currentBatters.nonStriker?.runs || 0} ({currentBatters.nonStriker?.balls || 0}b)</span>
              </div>
            </div>

            {/* Bowler & Partnership */}
            <div className="space-y-1 md:border-l md:border-gray-800 md:pl-4">
              <div className="flex justify-between text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                <span>Current Bowler</span>
                <span>Partnership</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-white font-bold">{currentBowler.name || 'Bowler'}</span>
                <span className="text-amber-400 font-bold">
                  {partnership.runs || 0} runs ({partnership.balls || 0}b)
                </span>
              </div>
              <div className="flex justify-between font-mono text-gray-400 text-[11px]">
                <span>{currentBowler.wickets || 0}/{currentBowler.runs || 0} ({currentBowler.overs || '0.0'} ov)</span>
                <span>Econ: {currentBowler.economy || 0}</span>
              </div>
            </div>
          </div>

          {/* Win Probability Bar */}
          {winProb && <WinProbabilityMeter winProb={winProb} />}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-800 overflow-x-auto gap-2 scrollbar-none">
        {[
          { id: 'scorecard', label: 'Full Scorecard', icon: Activity },
          { id: 'commentary', label: 'Live Commentary', icon: MessageSquare },
          { id: 'wagon', label: 'Wagon Wheel', icon: PieChart },
          { id: 'pitch', label: 'Pitch Map', icon: Target },
          { id: 'graphs', label: 'Match Graphs', icon: Shield }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs transition-all shrink-0 ${isActive
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-gray-400 hover:text-white'
                }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: FULL SCORECARD */}
      {activeTab === 'scorecard' && (
        <div className="space-y-6">
          {/* Batting Scorecard */}
          <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-4">
            <h3 className="text-base font-extrabold text-emerald-400 flex items-center gap-2">🏏 Batting Scorecard</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-900 text-gray-400 uppercase font-semibold border-b border-gray-800">
                  <tr>
                    <th className="p-3">Batter</th>
                    <th className="p-3">Dismissal</th>
                    <th className="p-3">R</th>
                    <th className="p-3">B</th>
                    <th className="p-3">4s</th>
                    <th className="p-3">6s</th>
                    <th className="p-3">SR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 font-mono">
                  {(scorecardData?.batting || socketScorecard?.batting || []).map((b, idx) => (
                    <tr key={b.id || idx} className="hover:bg-gray-800/40">
                      <td className="p-3 font-bold text-white font-sans">{b.name || `${b.player?.firstName} ${b.player?.lastName}`}</td>
                      <td className="p-3 text-gray-400 font-sans">{b.isOut ? `b ${b.dismissalType || 'out'}` : 'not out'}</td>
                      <td className="p-3 font-bold text-emerald-400">{b.runs}</td>
                      <td className="p-3 text-gray-300">{b.balls}</td>
                      <td className="p-3 text-amber-400">{b.fours}</td>
                      <td className="p-3 text-emerald-400">{b.sixes}</td>
                      <td className="p-3 text-blue-400">{b.strikeRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bowling Scorecard */}
          <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-4">
            <h3 className="text-base font-extrabold text-blue-400 flex items-center gap-2">🎯 Bowling Scorecard</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-900 text-gray-400 uppercase font-semibold border-b border-gray-800">
                  <tr>
                    <th className="p-3">Bowler</th>
                    <th className="p-3">O</th>
                    <th className="p-3">M</th>
                    <th className="p-3">R</th>
                    <th className="p-3">W</th>
                    <th className="p-3">Econ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 font-mono">
                  {(scorecardData?.bowling || socketScorecard?.bowling || []).map((bw, idx) => (
                    <tr key={bw.id || idx} className="hover:bg-gray-800/40">
                      <td className="p-3 font-bold text-white font-sans">{bw.name || `${bw.bowler?.firstName} ${bw.bowler?.lastName}`}</td>
                      <td className="p-3 text-gray-300">{bw.overs}</td>
                      <td className="p-3 text-gray-300">{bw.maidens}</td>
                      <td className="p-3 text-gray-300">{bw.runs}</td>
                      <td className="p-3 font-bold text-purple-400">{bw.wickets}</td>
                      <td className="p-3 text-blue-400">{bw.economy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE COMMENTARY STREAM */}
      {activeTab === 'commentary' && (
        <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-4">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">💬 Ball-by-Ball Live Commentary</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
            {combinedCommentary.length === 0 ? (
              <p className="text-xs text-gray-400 p-4 text-center">No commentary logged yet.</p>
            ) : (
              combinedCommentary.map((c, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-gray-900/80 border border-gray-800 flex gap-3 items-start text-xs">
                  <span className="font-mono font-bold px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 shrink-0">
                    {c.over}.{c.ball}
                  </span>
                  <div className="flex-1 space-y-1">
                    <p className="text-gray-200 leading-relaxed">{c.commentary}</p>
                    <div className="flex gap-3 text-[10px] font-mono font-bold">
                      <span className="text-amber-400">{c.totalRuns} Runs</span>
                      {c.isWicket && <span className="text-red-400 uppercase">Wicket!</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: WAGON WHEEL */}
      {activeTab === 'wagon' && (
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 flex flex-col md:flex-row items-center gap-8 justify-center">
          <WagonWheelSVG shotPoints={analytics?.wagonWheel?.innings1?.shotPoints || []} />
          <div className="space-y-4 max-w-md">
            <h3 className="text-lg font-bold text-emerald-400">Wagon Wheel Shot Distribution</h3>
            <p className="text-xs text-gray-300">
              Interactive 8-zone field breakdown plotting every shot, boundary (4s & 6s), and wicket delivery.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {(analytics?.wagonWheel?.innings1?.zoneSummary || []).map((z) => (
                <div key={z.zone} className="p-2.5 bg-gray-900 rounded-xl border border-gray-800 flex justify-between">
                  <span className="text-gray-400 font-sans">{z.zone}</span>
                  <span className="font-bold text-emerald-400">{z.runs} runs</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PITCH MAP */}
      {activeTab === 'pitch' && (
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 flex flex-col md:flex-row items-center gap-8 justify-center">
          <PitchMapCanvas />
          <div className="space-y-3 max-w-sm">
            <h3 className="text-lg font-bold text-amber-400">Bowling Pitch Heatmap</h3>
            <p className="text-xs text-gray-300">
              Aggregated delivery pitch lengths (Yorker, Full, Good, Short) and line distributions.
            </p>
          </div>
        </div>
      )}

      {/* TAB 5: MATCH GRAPHS */}
      {activeTab === 'graphs' && (
        <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-4">
          <h3 className="text-base font-extrabold text-emerald-400">Worm Graph (Cumulative Runs)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.wormGraph || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="over" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151' }} />
                <Line type="monotone" dataKey="innings1Runs" stroke="#10B981" strokeWidth={2.5} name="Innings 1" />
                <Line type="monotone" dataKey="innings2Runs" stroke="#3B82F6" strokeWidth={2.5} name="Innings 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
