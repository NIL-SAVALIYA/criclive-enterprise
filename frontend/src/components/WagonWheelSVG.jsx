import React from 'react';

/**
 * Interactive Wagon Wheel SVG Component
 * Displays 8 fielding zones (Fine Leg, Square Leg, Mid Wicket, Long On, Long Off, Cover, Point, Third Man)
 * Allows clickable zone selection for Scorer Console, and plots shot points for Analytics View.
 */
export default function WagonWheelSVG({ selectedZone, onSelectZone, shotPoints = [], isInteractive = false }) {
  const zones = [
    { id: 'Fine Leg', angle: -135, path: 'M 150 150 L 150 20 A 130 130 0 0 1 242 58 Z', labelX: 200, labelY: 45 },
    { id: 'Square Leg', angle: -90, path: 'M 150 150 L 242 58 A 130 130 0 0 1 280 150 Z', labelX: 250, labelY: 105 },
    { id: 'Mid Wicket', angle: -45, path: 'M 150 150 L 280 150 A 130 130 0 0 1 242 242 Z', labelX: 250, labelY: 195 },
    { id: 'Long On', angle: 0, path: 'M 150 150 L 242 242 A 130 130 0 0 1 150 280 Z', labelX: 200, labelY: 255 },
    { id: 'Long Off', angle: 45, path: 'M 150 150 L 150 280 A 130 130 0 0 1 58 242 Z', labelX: 100, labelY: 255 },
    { id: 'Cover', angle: 90, path: 'M 150 150 L 58 242 A 130 130 0 0 1 20 150 Z', labelX: 50, labelY: 195 },
    { id: 'Point', angle: 135, path: 'M 150 150 L 20 150 A 130 130 0 0 1 58 58 Z', labelX: 50, labelY: 105 },
    { id: 'Third Man', angle: 180, path: 'M 150 150 L 58 58 A 130 130 0 0 1 150 20 Z', labelX: 100, labelY: 45 }
  ];

  const handleSvgClick = (e) => {
    if (!isInteractive || !onSelectZone) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 300 - 150;
    const y = ((e.clientY - rect.top) / rect.height) * 300 - 150;
    onSelectZone({ zone: selectedZone, x: Math.round(x), y: Math.round(y) });
  };

  return (
    <div className="relative flex flex-col items-center">
      <svg
        viewBox="0 0 300 300"
        className="w-72 h-72 rounded-full border-4 border-emerald-600/40 bg-emerald-950/40 shadow-inner"
        onClick={handleSvgClick}
      >
        {/* Outfield Boundary */}
        <circle cx="150" cy="150" r="135" fill="none" stroke="#10B981" strokeWidth="3" strokeDasharray="6 4" />
        <circle cx="150" cy="150" r="90" fill="none" stroke="#059669" strokeWidth="1.5" />

        {/* Pitch Area */}
        <rect x="144" y="125" width="12" height="50" fill="#D97706" rx="2" />

        {/* Zones */}
        {zones.map((z) => {
          const isSelected = selectedZone === z.id;
          return (
            <g key={z.id} onClick={() => isInteractive && onSelectZone && onSelectZone({ zone: z.id })}>
              <path
                d={z.path}
                fill={isSelected ? 'rgba(16, 185, 129, 0.45)' : 'rgba(16, 185, 129, 0.08)'}
                stroke="rgba(255, 255, 255, 0.15)"
                strokeWidth="1"
                className={`transition-all duration-200 ${
                  isInteractive ? 'cursor-pointer hover:fill-emerald-500/30' : ''
                }`}
              />
              <text
                x={z.labelX}
                y={z.labelY}
                fill={isSelected ? '#10B981' : '#9CA3AF'}
                fontSize="9"
                fontWeight={isSelected ? 'bold' : 'normal'}
                textAnchor="middle"
                className="pointer-events-none select-none"
              >
                {z.id}
              </text>
            </g>
          );
        })}

        {/* Shot Points Plotting */}
        {shotPoints.map((pt, idx) => {
          const cx = 150 + (pt.x || 0);
          const cy = 150 + (pt.y || 0);
          let color = '#3B82F6'; // Default run
          if (pt.isFour) color = '#F59E0B';
          if (pt.isSix) color = '#10B981';
          if (pt.isWicket) color = '#EF4444';

          return (
            <g key={idx}>
              <line x1="150" y1="150" x2={cx} y2={cy} stroke={color} strokeWidth="1.5" strokeOpacity="0.8" />
              <circle cx={cx} cy={cy} r={pt.isSix ? 5 : pt.isFour ? 4 : 3} fill={color} />
            </g>
          );
        })}
      </svg>
      {isInteractive && selectedZone && (
        <span className="mt-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
          Selected Zone: {selectedZone}
        </span>
      )}
    </div>
  );
}
