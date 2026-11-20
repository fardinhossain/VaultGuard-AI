import React from 'react';
import { TelemetryBucket } from '../../lib/api';

interface HatchedSentinelChartProps {
  buckets: TelemetryBucket[];
}

export const HatchedSentinelChart: React.FC<HatchedSentinelChartProps> = ({ buckets }) => {
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));
  const chartHeight = 142;
  const barMaxHeight = 104;

  return (
    <div className="w-full">
      <svg
        viewBox="0 0 490 176"
        className="w-full h-auto"
        role="img"
        aria-label="AI Sentinel telemetry activity bar chart"
      >
        <defs>
          <pattern
            id="vgDiagHatch"
            width="8"
            height="8"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <rect width="8" height="8" fill="#27272A" />
            <line x1="0" y1="0" x2="0" y2="8" stroke="#3F3F46" strokeWidth="3" />
          </pattern>
        </defs>

        {/* Subtle baseline rule */}
        <line
          x1="14"
          y1={chartHeight + 2}
          x2="476"
          y2={chartHeight + 2}
          stroke="#27272A"
          strokeWidth="1"
        />

        {buckets.map((bucket, idx) => {
          const groupX = 22 + idx * 66;
          const ratio = bucket.count / maxCount;
          const height = Math.max(20, Math.round(ratio * barMaxHeight));
          const y = chartHeight - height;

          if (bucket.highlighted) {
            const secondaryHeight = Math.max(18, Math.round(height * 0.72));
            const secondaryY = chartHeight - secondaryHeight;

            return (
              <g key={bucket.key}>
                {/* Paired Electric Lime + Periwinkle Highlighted Bars */}
                <rect
                  x={groupX}
                  y={y}
                  width="22"
                  height={height}
                  rx="11"
                  fill="#D4F358"
                />
                <rect
                  x={groupX + 26}
                  y={secondaryY}
                  width="22"
                  height={secondaryHeight}
                  rx="11"
                  fill="#B4ACF9"
                />
                <text
                  x={groupX + 24}
                  y={y - 6}
                  textAnchor="middle"
                  className="fill-[#D4F358] font-bold tabular-nums"
                  style={{ fontSize: '10.5px' }}
                >
                  {bucket.count}
                </text>
                <text
                  x={groupX + 24}
                  y={162}
                  textAnchor="middle"
                  className="fill-white font-semibold"
                  style={{ fontSize: '11px' }}
                >
                  ▲ {bucket.label}
                </text>
              </g>
            );
          }

          return (
            <g key={bucket.key}>
              <rect
                x={groupX + 8}
                y={y}
                width="32"
                height={height}
                rx="14"
                fill="url(#vgDiagHatch)"
                stroke="#3F3F46"
                strokeWidth="1"
              />
              <text
                x={groupX + 24}
                y={y - 6}
                textAnchor="middle"
                className="fill-[#A1A1AA] font-medium tabular-nums"
                style={{ fontSize: '10px' }}
              >
                {bucket.count}
              </text>
              <text
                x={groupX + 24}
                y={162}
                textAnchor="middle"
                className="fill-[#71717A] font-medium"
                style={{ fontSize: '11px' }}
              >
                {bucket.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
