import React, { useState } from 'react';

export interface DotMatrixColumn {
  key: string;
  label: string;
  level: number; // 0..6
  value: string;
}

interface DotMatrixIndexProps {
  columns: DotMatrixColumn[];
}

export const DotMatrixIndex: React.FC<DotMatrixIndexProps> = ({ columns }) => {
  const [hoveredCol, setHoveredCol] = useState<DotMatrixColumn | null>(null);
  const rows = 6;
  const cols = columns.slice(0, 9);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-[11px] text-[#71717A] mb-2 min-h-[18px]">
        <span>
          {hoveredCol ? (
            <span className="font-semibold text-[#111827]">
              {hoveredCol.label}:{' '}
              <span className="font-mono-crypto text-[#18181B]">{hoveredCol.value}</span>
            </span>
          ) : (
            'Hover column for pillar telemetry'
          )}
        </span>
        <span className="font-mono-crypto text-[10.5px]">9 × 6 matrix</span>
      </div>

      <svg viewBox="0 0 324 148" className="w-full h-auto" role="img" aria-label="Security & Sovereignty Index Dot Matrix">
        {cols.map((col, colIdx) => {
          const cx = 18 + colIdx * 36;
          return (
            <g
              key={col.key}
              onMouseEnter={() => setHoveredCol(col)}
              onMouseLeave={() => setHoveredCol(null)}
              className="cursor-pointer"
            >
              {Array.from({ length: rows }).map((_, rowFromTop) => {
                const rowFromBottom = rows - 1 - rowFromTop;
                const isActive = rowFromBottom < col.level;
                const isPeakDot = isActive && rowFromBottom === col.level - 1 && col.level >= 5;
                const cy = 14 + rowFromTop * 20;

                const fill = isPeakDot
                  ? '#D4F358'
                  : isActive
                    ? '#B4ACF9'
                    : '#E0DCFC';

                return (
                  <circle
                    key={`${col.key}-${rowFromTop}`}
                    cx={cx}
                    cy={cy}
                    r={6}
                    fill={fill}
                    stroke={isPeakDot ? '#18181B' : 'none'}
                    strokeWidth={isPeakDot ? 1.2 : 0}
                    className="transition-all duration-200"
                  />
                );
              })}

              <text
                x={cx}
                y={141}
                textAnchor="middle"
                className="fill-[#71717A] font-semibold"
                style={{ fontSize: '9px' }}
              >
                {col.key}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
