import React from 'react';

/**
 * Pitch Map Heatmap & Interactive Selector Component
 * Allows selecting Pitch Length (Yorker, Full, Good, Short) & Pitch Line (Off, Stumps, Wide)
 * In display mode, plots deliveries with color coding and length summaries.
 */
export default function PitchMapCanvas({
  selectedLength,
  selectedLine,
  onSelectPitch,
  isInteractive = false,
  deliveries = [],
  pitchLengths = {},
  pitchLines = {}
}) {
  const lengths = ['Yorker', 'Full', 'Good', 'Short'];
  const lines = ['Off', 'Stumps', 'Wide'];

  const handleLengthClick = (len) => {
    if (!isInteractive || !onSelectPitch) return;
    onSelectPitch({ pitchLength: len, pitchLine: selectedLine || 'Stumps' });
  };

  const handleLineClick = (line) => {
    if (!isInteractive || !onSelectPitch) return;
    onSelectPitch({ pitchLength: selectedLength || 'Good', pitchLine: line });
  };

  const lengthPos = {
    'Yorker': { top: '15%' },
    'Full': { top: '38%' },
    'Good': { top: '62%' },
    'Short': { top: '85%' }
  };

  const linePos = {
    'Off': { left: '25%' },
    'Stumps': { left: '50%' },
    'Wide': { left: '75%' }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Line Selectors (Interactive) or Breakdown (Display) */}
      <div className="flex gap-2 text-xs">
        {lines.map((line) => {
          const isSelected = selectedLine === line;
          const count = pitchLines[line] || 0;
          return isInteractive ? (
            <button
              key={line}
              type="button"
              onClick={() => handleLineClick(line)}
              className={`px-3 py-1 rounded-md border font-medium transition-all ${
                isSelected
                  ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                  : 'bg-gray-800/80 border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              Line: {line}
            </button>
          ) : (
            <div key={line} className="px-2.5 py-1 rounded-md bg-gray-900 border border-gray-800 text-[11px] text-gray-300">
              <span className="text-gray-400">{line}:</span> <span className="font-bold text-amber-400">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Pitch Rectangle Diagram */}
      <div className="w-56 h-72 bg-[#92400E]/20 border-2 border-[#D97706]/50 rounded-lg p-2 flex flex-col justify-between relative shadow-inner overflow-hidden">
        {/* Stumps Top (Batsman end) */}
        <div className="flex justify-center gap-1.5 py-1 z-10">
          <div className="w-1.5 h-6 bg-yellow-400 rounded-t-sm shadow"></div>
          <div className="w-1.5 h-6 bg-yellow-400 rounded-t-sm shadow"></div>
          <div className="w-1.5 h-6 bg-yellow-400 rounded-t-sm shadow"></div>
        </div>

        {/* Pitch Length Zones */}
        <div className="flex-1 flex flex-col justify-between my-2 gap-1 z-10">
          {lengths.map((len) => {
            const isSelected = selectedLength === len;
            const count = pitchLengths[len] || 0;
            return (
              <div
                key={len}
                onClick={() => handleLengthClick(len)}
                className={`flex-1 rounded flex items-center justify-between px-3 text-xs font-semibold border transition-all ${
                  isSelected
                    ? 'bg-amber-500/40 border-amber-400 text-amber-200 glow-gold scale-105'
                    : 'bg-emerald-950/30 border-emerald-800/40 text-gray-400 hover:bg-emerald-900/40'
                } ${isInteractive ? 'cursor-pointer' : ''}`}
              >
                <span>{len} Length</span>
                {!isInteractive && count > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-900/80 text-amber-400 font-mono">
                    {count}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Deliveries overlay on Pitch */}
        {!isInteractive && deliveries.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {deliveries.map((d, i) => {
              const posL = linePos[d.pitchLine] || { left: '50%' };
              const posT = lengthPos[d.pitchLength] || { top: '50%' };
              let color = '#3B82F6';
              if (d.isFour) color = '#F59E0B';
              if (d.isSix) color = '#10B981';
              if (d.isWicket) color = '#EF4444';

              // Add a slight jitter so overlapping balls fan out nicely
              const jitterX = ((i * 7) % 15) - 7;
              const jitterY = ((i * 11) % 15) - 7;

              return (
                <div
                  key={d.id || i}
                  style={{
                    position: 'absolute',
                    top: `calc(${posT.top} + ${jitterY}px)`,
                    left: `calc(${posL.left} + ${jitterX}px)`,
                    backgroundColor: color,
                    width: d.isWicket ? '10px' : '7px',
                    height: d.isWicket ? '10px' : '7px',
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%)',
                    boxShadow: `0 0 6px ${color}`,
                    zIndex: 20
                  }}
                  title={`Over ${d.over}.${d.ball}: ${d.pitchLength} - ${d.pitchLine} (${d.totalRuns} runs${d.isWicket ? ', Wicket!' : ''})`}
                />
              );
            })}
          </div>
        )}

        {/* Stumps Bottom (Bowler end) */}
        <div className="flex justify-center gap-1.5 py-1 z-10">
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
