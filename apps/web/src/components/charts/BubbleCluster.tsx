import React from 'react';
import { motion } from 'framer-motion';

interface BubbleClusterProps {
  fieldsCount: number;
  deksCount: number;
  blindIndexCount: number;
}

export const BubbleCluster: React.FC<BubbleClusterProps> = ({
  fieldsCount,
  deksCount,
  blindIndexCount,
}) => {
  return (
    <div className="w-full flex items-center justify-center py-2">
      <svg
        viewBox="0 0 360 220"
        className="w-full max-w-[340px] h-auto overflow-visible"
        role="img"
        aria-label={`Protected data footprint: ${fieldsCount} PII fields, ${deksCount} DEKs, ${blindIndexCount} blind indexes`}
      >
        {/* Subtle Editorial Halo Rings */}
        <circle
          cx="148"
          cy="112"
          r="94"
          fill="none"
          stroke="#E4E4E7"
          strokeDasharray="4 4"
          strokeWidth="1"
        />

        {/* Large Periwinkle Bubble — Encrypted PII Fields */}
        <motion.g
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          <circle cx="144" cy="110" r="82" fill="#B4ACF9" />
          <text
            x="144"
            y="102"
            textAnchor="middle"
            className="fill-[#18181B] font-bold tabular-nums"
            style={{ fontSize: '34px' }}
          >
            {fieldsCount}
          </text>
          <text
            x="144"
            y="126"
            textAnchor="middle"
            className="fill-[#18181B]/80 font-semibold"
            style={{ fontSize: '12px' }}
          >
            PII fields
          </text>
        </motion.g>

        {/* Medium Obsidian Bubble — Per-Record Wrapped DEKs */}
        <motion.g
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.08 }}
        >
          <circle
            cx="248"
            cy="88"
            r="52"
            fill="#18181B"
            stroke="#FFFFFF"
            strokeWidth="4"
          />
          <text
            x="248"
            y="84"
            textAnchor="middle"
            className="fill-white font-bold tabular-nums"
            style={{ fontSize: '24px' }}
          >
            {deksCount}
          </text>
          <text
            x="248"
            y="104"
            textAnchor="middle"
            className="fill-[#A1A1AA] font-medium"
            style={{ fontSize: '11px' }}
          >
            DEKs
          </text>
        </motion.g>

        {/* Small Electric Lime Bubble — Active HMAC Blind Indexes */}
        <motion.g
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.15 }}
        >
          <circle
            cx="236"
            cy="158"
            r="38"
            fill="#D4F358"
            stroke="#FFFFFF"
            strokeWidth="4"
          />
          <text
            x="236"
            y="155"
            textAnchor="middle"
            className="fill-[#18181B] font-bold tabular-nums"
            style={{ fontSize: '19px' }}
          >
            {blindIndexCount}
          </text>
          <text
            x="236"
            y="172"
            textAnchor="middle"
            className="fill-[#18181B]/80 font-semibold"
            style={{ fontSize: '10px' }}
          >
            indexes
          </text>
        </motion.g>
      </svg>
    </div>
  );
};
