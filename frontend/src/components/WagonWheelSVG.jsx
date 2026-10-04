import React, { useState } from 'react';

/**
 * Canonical 8 Fielding Zones & Default Coordinates
 */
export const CANONICAL_ZONES = [
  'Fine Leg',
  'Square Leg',
  'Mid Wicket',
  'Long On',
  'Long Off',
  'Cover',
  'Point',
  'Third Man'
];

export const CANONICAL_ZONE_COORDS = {
  'Fine Leg': { x: 55, y: -95 },
  'Square Leg': { x: 95, y: -40 },
  'Mid Wicket': { x: 95, y: 45 },
  'Long On': { x: 50, y: 95 },
  'Long Off': { x: -50, y: 95 },
  'Cover': { x: -95, y: 45 },
  'Point': { x: -95, y: -40 },
  'Third Man': { x: -55, y: -95 }
};

/**
 * Interactive Wagon Wheel SVG Component
 * Displays 8 fielding zones (Fine Leg, Square Leg, Mid Wicket, Long On, Long Off, Cover, Point, Third Man)
 * Supports click selection for Scorer Console with hover/selected states and plots shot points for Analytics.
 */
export default function WagonWheelSVG({
  selectedZone = '',
  selectedX = null,
  selectedY = null,
  onSelectZone,
  onShotSelect,
  shotPoints = [],
  isInteractive = false
}) {
  const [hoveredZone, setHoveredZone] = useState(null);

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

  const handleZoneClick = (z, e) => {
    e.stopPropagation();
    if (!isInteractive) return;

    let x = CANONICAL_ZONE_COORDS[z.id]?.x ?? 0;
    let y = CANONICAL_ZONE_COORDS[z.id]?.y ?? 0;

    const svg = e.currentTarget.closest('svg');
    if (svg) {
      const rect = svg.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        x = Math.round(((e.clientX - rect.left) / rect.width) * 300 - 150);
        y = Math.round(((e.clientY - rect.top) / rect.height) * 300 - 150);
      }
    }

    const payload = { zone: z.id, x, y };
    if (onSelectZone) onSelectZone(payload);
    if (onShotSelect) onShotSelect(payload);
  };

  return (
    <div className="relative flex flex-col items-center">
      <svg
        viewBox="0 0 300 300"
        className="w-72 h-72 rounded-full border-4 border-emerald-600/40 bg-emerald-950/40 shadow-inner"
      >
        {/* Outfield Boundary */}
        <circle cx="150" cy="150" r="135" fill="none" stroke="#10B981" strokeWidth="3" strokeDasharray="6 4" />
        <circle cx="150" cy="150" r="90" fill="none" stroke="#059669" strokeWidth="1.5" />

        {/* Pitch Area */}
        <rect x="144" y="125" width="12" height="50" fill="#D97706" rx="2" />

        {/* Zones */}
        {zones.map((z) => {
          const isSelected = selectedZone === z.id;
          const isHovered = hoveredZone === z.id;

          let fill = 'rgba(16, 185, 129, 0.08)';
          if (isSelected) {
            fill = 'rgba(16, 185, 129, 0.55)';
          } else if (isHovered && isInteractive) {
            fill = 'rgba(16, 185, 129, 0.28)';
          }

          const stroke = isSelected ? '#10B981' : 'rgba(255, 255, 255, 0.15)';
          const strokeWidth = isSelected ? '2' : '1';

          return (
            <g
              key={z.id}
              onClick={(e) => handleZoneClick(z, e)}
              onMouseEnter={() => isInteractive && setHoveredZone(z.id)}
              onMouseLeave={() => isInteractive && setHoveredZone(null)}
              className={isInteractive ? 'cursor-pointer' : ''}
            >
              <path
                d={z.path}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                className="transition-colors duration-150"
              />
              <text
                x={z.labelX}
                y={z.labelY}
                fill={isSelected ? '#34D399' : isHovered ? '#6EE7B7' : '#9CA3AF'}
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

        {/* Current Active Shot Indicator if selected in interactive mode */}
        {isInteractive && selectedZone && (
          <g>
            <line
              x1="150"
              y1="150"
              x2={150 + (selectedX ?? CANONICAL_ZONE_COORDS[selectedZone]?.x ?? 0)}
              y2={150 + (selectedY ?? CANONICAL_ZONE_COORDS[selectedZone]?.y ?? 0)}
              stroke="#34D399"
              strokeWidth="2.5"
              strokeDasharray="4 2"
            />
            <circle
              cx={150 + (selectedX ?? CANONICAL_ZONE_COORDS[selectedZone]?.x ?? 0)}
              cy={150 + (selectedY ?? CANONICAL_ZONE_COORDS[selectedZone]?.y ?? 0)}
              r="5"
              fill="#10B981"
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
          </g>
        )}

        {/* Shot Points Plotting for Analytics */}
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
