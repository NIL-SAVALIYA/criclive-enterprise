import React from 'react';

/**
 * Pitch Map Heatmap & Interactive Selector Component
 * Allows selecting Pitch Length (Yorker, Full, Good, Short) & Pitch Line (Off, Stumps, Wide)
 */
export default function PitchMapCanvas({ selectedLength, selectedLine, onSelectPitch, isInteractive = false }) {
  const lengths = ['Short', 'Good', 'Full', 'Yorker'];
  const lines = ['Off', 'Stumps', 'Wide'];

  const handleLengthClick = (len) => {
    if (!isInteractive || !onSelectPitch) return;
    onSelectPitch({ pitchLength: len, pitchLine: selectedLine || 'Stumps' });
  };

  const handleLineClick = (line) => {
    if (!isInteractive || !onSelectPitch) return;
    onSelectPitch({ pitchLength: selectedLength || 'Good', pitchLine: line });
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Line Selectors */}
      <div className="flex gap-2 text-xs">
        {lines.map((line) => (
          <button
            key={line}
            type="button"
            onClick={() => handleLineClick(line)}
            className={`px-3 py-1 rounded-md border font-medium transition-all ${
              selectedLine === line
                ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                : 'bg-gray-800/80 border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            Line: {line}
          </button>
        ))}
      </div>

      {/* Pitch Rectangle Diagram */}
      <div className="w-56 h-72 bg-[#92400E]/20 border-2 border-[#D97706]/50 rounded-lg p-2 flex flex-col justify-between relative shadow-inner">
        {/* Stumps Top (Batsman) */}
        <div className="flex justify-center gap-1.5 py-1">
          <div className="w-1.5 h-6 bg-yellow-400 rounded-t-sm shadow"></div>
          <div className="w-1.5 h-6 bg-yellow-400 rounded-t-sm shadow"></div>
          <div className="w-1.5 h-6 bg-yellow-400 rounded-t-sm shadow"></div>
        </div>

        {/* Pitch Length Zones */}
        <div className="flex-1 flex flex-col justify-between my-2 gap-1">
          {lengths.map((len) => {
            const isSelected = selectedLength === len;
            return (
              <div
                key={len}
                onClick={() => handleLengthClick(len)}
                className={`flex-1 rounded flex items-center justify-center text-xs font-semibold border transition-all ${
                  isSelected
                    ? 'bg-amber-500/40 border-amber-400 text-amber-200 glow-gold scale-105'
                    : 'bg-emerald-950/30 border-emerald-800/40 text-gray-400 hover:bg-emerald-900/40'
                } ${isInteractive ? 'cursor-pointer' : ''}`}
              >
                {len} Length
              </div>
            );
          })}
        </div>

        {/* Stumps Bottom (Bowler) */}
        <div className="flex justify-center gap-1.5 py-1">
          <div className="w-1.5 h-6 bg-yellow-400 rounded-b-sm shadow"></div>
          <div className="w-1.5 h-6 bg-yellow-400 rounded-b-sm shadow"></div>
          <div className="w-1.5 h-6 bg-yellow-400 rounded-b-sm shadow"></div>
        </div>
      </div>

      {isInteractive && (selectedLength || selectedLine) && (
        <div className="text-xs text-amber-400 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-500/30">
          Length: {selectedLength || 'None'} | Line: {selectedLine || 'None'}
        </div>
      )}
    </div>
  );
}
