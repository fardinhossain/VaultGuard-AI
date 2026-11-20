import { AuditLogModel } from '../../models/AuditLog.js';

export interface AccessGraphNode {
  id: string;
  label: string;
  type: 'actor' | 'role' | 'record';
  riskLevel: 'safe' | 'watch' | 'critical';
  degree: number;
}

export interface AccessGraphEdge {
  source: string;
  target: string;
  action: string;
  count: number;
  anomalous: boolean;
}

export interface AccessGraphSnapshot {
  nodes: AccessGraphNode[];
  edges: AccessGraphEdge[];
  metrics: {
    totalEdges: number;
    maxActorFanOut: number;
    deniedEdgeRatio: number;
    starBurstDetected: boolean;
  };
}

/**
 * Builds an Actor -> Role -> Encrypted Record bipartite access graph from operational
 * audit logs (zero plaintext PII) to detect scraping fan-out and cross-purpose spikes.
 */
export async function buildTenantAccessGraph(
  tenantId: string,
  blockedActorIds: Set<string>,
): Promise<AccessGraphSnapshot> {
  const recentLogs = await AuditLogModel.find({ tenantId })
    .sort({ seq: -1 })
    .limit(120)
    .lean();

  const nodeMap = new Map<string, AccessGraphNode>();
  const edgeMap = new Map<string, AccessGraphEdge>();
  const actorDistinctRecords = new Map<string, Set<string>>();
  let deniedEdges = 0;
  let totalRelevant = 0;

  for (const log of recentLogs) {
    if (
      log.action !== 'DECRYPT_SUCCESS' &&
      log.action !== 'DECRYPT_BLOCKED' &&
      log.action !== 'TAMPER_DETECTED' &&
      log.action !== 'ENCRYPT'
    ) {
      continue;
    }

    const actorNodeId = `actor:${log.actorId}`;
    const roleNodeId = `role:${log.actorRole}`;
    const isBlockedActor = blockedActorIds.has(log.actorId);
    const isDenied = log.result !== 'SUCCESS';

    if (isDenied) deniedEdges += 1;
    totalRelevant += 1;

    if (!nodeMap.has(actorNodeId)) {
      nodeMap.set(actorNodeId, {
        id: actorNodeId,
        label: log.actorId,
        type: 'actor',
        riskLevel: isBlockedActor ? 'critical' : isDenied ? 'watch' : 'safe',
        degree: 0,
      });
    } else if (isBlockedActor) {
      const n = nodeMap.get(actorNodeId)!;
      n.riskLevel = 'critical';
    }

    if (!nodeMap.has(roleNodeId)) {
      nodeMap.set(roleNodeId, {
        id: roleNodeId,
        label: log.actorRole.toUpperCase(),
        type: 'role',
        riskLevel: 'safe',
        degree: 0,
      });
    }

    const actorRoleKey = `${actorNodeId}->${roleNodeId}`;
    const arEdge = edgeMap.get(actorRoleKey);
    if (arEdge) {
      arEdge.count += 1;
      if (isBlockedActor || isDenied) arEdge.anomalous = true;
    } else {
      edgeMap.set(actorRoleKey, {
        source: actorNodeId,
        target: roleNodeId,
        action: log.action,
        count: 1,
        anomalous: isBlockedActor || isDenied,
      });
    }

    if (log.recordId) {
      const recordNodeId = `record:${log.recordId}`;
      if (!nodeMap.has(recordNodeId)) {
        nodeMap.set(recordNodeId, {
          id: recordNodeId,
          label: log.recordId,
          type: 'record',
          riskLevel: isDenied ? 'watch' : 'safe',
          degree: 0,
        });
      }

      if (!actorDistinctRecords.has(log.actorId)) {
        actorDistinctRecords.set(log.actorId, new Set());
      }
      actorDistinctRecords.get(log.actorId)!.add(log.recordId);

      const roleRecordKey = `${roleNodeId}->${recordNodeId}:${isDenied ? 'DENIED' : 'ALLOW'}`;
      const rrEdge = edgeMap.get(roleRecordKey);
      if (rrEdge) {
        rrEdge.count += 1;
        if (isDenied || isBlockedActor) rrEdge.anomalous = true;
      } else {
        edgeMap.set(roleRecordKey, {
          source: roleNodeId,
          target: recordNodeId,
          action: log.action,
          count: 1,
          anomalous: isDenied || isBlockedActor,
        });
      }
    }
  }

  // Update node degrees
  for (const edge of edgeMap.values()) {
    const src = nodeMap.get(edge.source);
    const dst = nodeMap.get(edge.target);
    if (src) src.degree += 1;
    if (dst) dst.degree += 1;
  }

  let maxActorFanOut = 0;
  for (const set of actorDistinctRecords.values()) {
    if (set.size > maxActorFanOut) {
      maxActorFanOut = set.size;
    }
  }

  // Keep graph readable in SVG by taking top 12 record nodes by degree/anomaly if many exist
  const actorNodes = [...nodeMap.values()].filter((n) => n.type === 'actor').slice(0, 6);
  const roleNodes = [...nodeMap.values()].filter((n) => n.type === 'role');
  const recordNodes = [...nodeMap.values()]
    .filter((n) => n.type === 'record')
    .sort((a, b) => (a.riskLevel === b.riskLevel ? b.degree - a.degree : a.riskLevel === 'watch' ? -1 : 1))
    .slice(0, 8);

  const allowedNodeIds = new Set([
    ...actorNodes.map((n) => n.id),
    ...roleNodes.map((n) => n.id),
    ...recordNodes.map((n) => n.id),
  ]);

  const edges = [...edgeMap.values()].filter(
    (e) => allowedNodeIds.has(e.source) && allowedNodeIds.has(e.target),
  );

  const deniedEdgeRatio = totalRelevant > 0 ? Number((deniedEdges / totalRelevant).toFixed(2)) : 0;
  const starBurstDetected = maxActorFanOut >= 5 && (deniedEdgeRatio > 0.25 || blockedActorIds.size > 0);

  return {
    nodes: [...actorNodes, ...roleNodes, ...recordNodes],
    edges,
    metrics: {
      totalEdges: edges.length,
      maxActorFanOut,
      deniedEdgeRatio,
      starBurstDetected,
    },
  };
}
