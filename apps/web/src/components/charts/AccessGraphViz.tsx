import React from 'react';
import { AccessGraphSnapshot } from '../../lib/api';

interface AccessGraphVizProps {
  graph: AccessGraphSnapshot;
}

export const AccessGraphViz: React.FC<AccessGraphVizProps> = ({ graph }) => {
  const actors = graph.nodes.filter((n) => n.type === 'actor');
  const roles = graph.nodes.filter((n) => n.type === 'role');
  const records = graph.nodes.filter((n) => n.type === 'record');

  const coords = new Map<string, { x: number; y: number }>();

  const distributeY = (count: number, height: number, pad = 28) => {
    if (count <= 1) return [height / 2];
    const span = height - pad * 2;
    return Array.from({ length: count }, (_, i) => pad + (i * span) / (count - 1));
  };

  const svgHeight = 250;
  const actorYs = distributeY(actors.length, svgHeight, 36);
  const roleYs = distributeY(roles.length, svgHeight, 44);
  const recordYs = distributeY(records.length, svgHeight, 26);

  actors.forEach((n, i) => coords.set(n.id, { x: 82, y: actorYs[i] ?? 125 }));
  roles.forEach((n, i) => coords.set(n.id, { x: 245, y: roleYs[i] ?? 125 }));
  records.forEach((n, i) => coords.set(n.id, { x: 422, y: recordYs[i] ?? 125 }));

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-[12px]">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[#71717A]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B4ACF9]" /> Normal Path
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#71717A]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E]" /> Anomalous / Blocked Fan-Out
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono-crypto text-[11px]">
          <span className="px-2.5 py-1 rounded-full bg-[#ECECEE] text-[#111827] tabular-nums">
            Fan-out: {graph.metrics.maxActorFanOut} recs
          </span>
          <span
            className={`px-2.5 py-1 rounded-full font-semibold ${
              graph.metrics.starBurstDetected
                ? 'bg-[#F43F5E]/15 text-[#F43F5E]'
                : 'bg-[#10B981]/15 text-[#10B981]'
            }`}
          >
            {graph.metrics.starBurstDetected ? 'STAR-BURST DETECTED' : 'GRAPH NORMAL'}
          </span>
        </div>
      </div>

      {graph.nodes.length === 0 ? (
        <div className="h-[220px] rounded-[18px] bg-[#ECECEE]/70 flex items-center justify-center text-[13px] text-[#71717A]">
          No access graph edges recorded yet. Run searches or decryptions to populate graph.
        </div>
      ) : (
        <svg
          viewBox={`0 0 510 ${svgHeight}`}
          className="w-full h-auto bg-[#ECECEE]/55 rounded-[18px]"
          role="img"
          aria-label="Bipartite actor role record access graph"
        >
          {/* Column Labels */}
          <text x="82" y="16" textAnchor="middle" className="fill-[#71717A] font-semibold" style={{ fontSize: '10px' }}>
            ACTORS
          </text>
          <text x="245" y="16" textAnchor="middle" className="fill-[#71717A] font-semibold" style={{ fontSize: '10px' }}>
            ROLES
          </text>
          <text x="422" y="16" textAnchor="middle" className="fill-[#71717A] font-semibold" style={{ fontSize: '10px' }}>
            ENCRYPTED RECORDS
          </text>

          {/* Edges */}
          {graph.edges.map((edge, i) => {
            const p1 = coords.get(edge.source);
            const p2 = coords.get(edge.target);
            if (!p1 || !p2) return null;
            return (
              <line
                key={`${edge.source}-${edge.target}-${i}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={edge.anomalous ? '#F43F5E' : '#B4ACF9'}
                strokeWidth={edge.anomalous ? 2.2 : 1.5}
                strokeOpacity={edge.anomalous ? 0.85 : 0.7}
                strokeDasharray={edge.anomalous ? '5 3' : undefined}
              />
            );
          })}

          {/* Actor Nodes */}
          {actors.map((node) => {
            const pos = coords.get(node.id)!;
            const fill =
              node.riskLevel === 'critical'
                ? '#F43F5E'
                : node.riskLevel === 'watch'
                  ? '#D4F358'
                  : '#18181B';
            const textFill = node.riskLevel === 'watch' ? '#18181B' : '#FFFFFF';
            return (
              <g key={node.id}>
                <rect
                  x={pos.x - 66}
                  y={pos.y - 13}
                  width="132"
                  height="26"
                  rx="13"
                  fill={fill}
                />
                <text
                  x={pos.x}
                  y={pos.y + 4}
                  textAnchor="middle"
                  fill={textFill}
                  className="font-mono-crypto font-medium"
                  style={{ fontSize: '10px' }}
                >
                  {node.label.slice(0, 18)}
                </text>
              </g>
            );
          })}

          {/* Role Hub Nodes */}
          {roles.map((node) => {
            const pos = coords.get(node.id)!;
            return (
              <g key={node.id}>
                <rect
                  x={pos.x - 46}
                  y={pos.y - 14}
                  width="92"
                  height="28"
                  rx="14"
                  fill="#FFFFFF"
                  stroke="#18181B"
                  strokeWidth="1.5"
                />
                <text
                  x={pos.x}
                  y={pos.y + 4}
                  textAnchor="middle"
                  className="fill-[#18181B] font-bold"
                  style={{ fontSize: '10px' }}
                >
                  {node.label}
                </text>
              </g>
            );
          })}

          {/* Record Nodes */}
          {records.map((node) => {
            const pos = coords.get(node.id)!;
            const stroke = node.riskLevel === 'watch' ? '#F43F5E' : '#B4ACF9';
            return (
              <g key={node.id}>
                <rect
                  x={pos.x - 54}
                  y={pos.y - 11}
                  width="108"
                  height="22"
                  rx="11"
                  fill="#FFFFFF"
                  stroke={stroke}
                  strokeWidth="1.5"
                />
                <text
                  x={pos.x}
                  y={pos.y + 3.5}
                  textAnchor="middle"
                  className="fill-[#111827] font-mono-crypto"
                  style={{ fontSize: '9.5px' }}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
};
