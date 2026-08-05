import React from 'react';
import { Activity, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LiveTicker({ matches = [] }) {
  if (!matches || matches.length === 0) return null;

  return (
    <div className="w-full bg-[#070A10] border-b border-gray-800/80 px-4 py-2.5 overflow-x-auto flex items-center gap-4 scrollbar-none">
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600/20 border border-red-500/30 rounded-full text-red-400 text-xs font-bold uppercase tracking-wider shrink-0 animate-pulse">
        <Radio className="w-3.5 h-3.5" />
        Live Score
      </div>

      <div className="flex gap-4 items-center">
        {matches.map((m) => (
          <Link
            key={m.id}
            to={`/matches/${m.id}`}
            className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-gray-900/90 border border-gray-800 hover:border-emerald-500/50 transition-all shrink-0 text-xs"
          >
            <span className="font-semibold text-gray-200">{m.teamA?.shortName || m.teamA?.name}</span>
            <span className="text-emerald-400 font-mono font-bold">vs</span>
            <span className="font-semibold text-gray-200">{m.teamB?.shortName || m.teamB?.name}</span>
            <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold">
              {m.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
