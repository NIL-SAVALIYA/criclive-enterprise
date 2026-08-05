import React from 'react';

/**
 * Win Probability Meter Component
 * Shows percentage probability bar for Team A vs Team B
 */
export default function WinProbabilityMeter({ winProb }) {
  if (!winProb || !winProb.battingTeam || !winProb.bowlingTeam) return null;

  const batProb = winProb.battingTeam.probability || 50;
  const bowlProb = winProb.bowlingTeam.probability || 50;

  return (
    <div className="glass-panel p-4 rounded-xl border border-gray-800 flex flex-col gap-2">
      <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-gray-400">
        <span>Win Probability</span>
        <span className="text-emerald-400 font-normal">{winProb.statusText}</span>
      </div>

      <div className="flex justify-between items-center text-sm font-bold my-1">
        <span className="text-emerald-400 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          {winProb.battingTeam.name} ({batProb}%)
        </span>
        <span className="text-blue-400 flex items-center gap-1.5">
          {winProb.bowlingTeam.name} ({bowlProb}%)
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-3.5 bg-gray-900 rounded-full overflow-hidden flex p-0.5 border border-gray-800">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-l-full transition-all duration-700 ease-out"
          style={{ width: `${batProb}%` }}
        ></div>
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-r-full transition-all duration-700 ease-out"
          style={{ width: `${bowlProb}%` }}
        ></div>
      </div>
    </div>
  );
}
