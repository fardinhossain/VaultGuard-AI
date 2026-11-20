import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActorRole,
  DashboardSummary,
  RequestContext,
  TenantInfo,
  issueDemoToken,
  vaultApi,
} from '../lib/api';

export interface ToastNotice {
  id: number;
  tone: 'success' | 'danger' | 'info';
  title: string;
  detail?: string;
}

export interface SessionApiKey {
  rawKey: string;
  keyPrefix: string;
  roleScope: ActorRole;
  name: string;
}

interface WorkspaceContextValue {
  tenants: TenantInfo[];
  tenantId: string;
  activeTenant: TenantInfo | null;
  actorRole: ActorRole;
  actorId: string;
  token: string | null;
  summary: DashboardSummary | null;
  loadingSummary: boolean;
  rotatingKey: boolean;
  refreshVersion: number;
  addModalOpen: boolean;
  toast: ToastNotice | null;
  sessionApiKey: SessionApiKey | null;
  reqCtx: RequestContext;
  setTenantId: (tenantId: string) => void;
  setActorRole: (role: ActorRole) => void;
  setAddModalOpen: (open: boolean) => void;
  setSessionApiKey: (key: SessionApiKey | null) => void;
  triggerRefresh: () => void;
  rotateKekNow: () => Promise<void>;
  showToast: (tone: ToastNotice['tone'], title: string, detail?: string) => void;
  dismissToast: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [tenantId, setTenantId] = useState<string>('tenant_supershop_bd');
  const [actorRole, setActorRole] = useState<ActorRole>('admin');
  const [token, setToken] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(true);
  const [rotatingKey, setRotatingKey] = useState<boolean>(false);
  const [refreshVersion, setRefreshVersion] = useState<number>(0);
  const [addModalOpen, setAddModalOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const [sessionApiKey, setSessionApiKey] = useState<SessionApiKey | null>(null);

  const actorId = `demo_${actorRole}_01`;

  const showToast = useCallback(
    (tone: ToastNotice['tone'], title: string, detail?: string) => {
      const id = Date.now();
      setToast({ id, tone, title, detail });
      window.setTimeout(() => {
        setToast((prev) => (prev?.id === id ? null : prev));
      }, 4500);
    },
    [],
  );

  const dismissToast = useCallback(() => setToast(null), []);

  const triggerRefresh = useCallback(() => {
    setRefreshVersion((v) => v + 1);
  }, []);

  // Load tenant list once + whenever refreshVersion ticks
  useEffect(() => {
    let cancelled = false;
    vaultApi
      .fetchTenants()
      .then((res) => {
        if (!cancelled && Array.isArray(res.tenants)) {
          setTenants(res.tenants);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [refreshVersion]);

  // Mint signed HS256 JWT only when tenant or role changes
  useEffect(() => {
    let cancelled = false;
    setToken(null);

    issueDemoToken(tenantId, actorRole, actorId)
      .then((authRes) => {
        if (!cancelled) {
          setToken(authRes.token);
        }
      })
      .catch(() => {
        // Fallback header mode remains active if token endpoint is temporarily unreachable
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId, actorRole, actorId]);

  // Fetch dashboard summary on tenant/role/token change or explicit refresh
  useEffect(() => {
    let cancelled = false;
    setLoadingSummary(true);

    vaultApi
      .fetchDashboardSummary({
        tenantId,
        actorRole,
        actorId,
        token,
      })
      .then((sum) => {
        if (!cancelled) {
          setSummary(sum);
        }
      })
      .catch(() => {
        // Ignore transient startup/network errors
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingSummary(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId, actorRole, actorId, token, refreshVersion]);

  const reqCtx = useMemo<RequestContext>(
    () => ({
      tenantId,
      actorRole,
      actorId,
      token,
    }),
    [tenantId, actorRole, actorId, token],
  );

  const rotateKekNow = useCallback(async () => {
    setRotatingKey(true);
    try {
      const res = await vaultApi.rotateKey(reqCtx);
      showToast(
        'success',
        `KEK Rotated: v${res.previousVersion} → v${res.newVersion}`,
        `${res.recordsRewrapped} DEKs re-wrapped in ${res.latencyMs} ms · Zero ciphertext modified.`,
      );
      triggerRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Key rotation failed';
      showToast('danger', 'Key Rotation Failed', msg);
    } finally {
      setRotatingKey(false);
    }
  }, [reqCtx, showToast, triggerRefresh]);

  const activeTenant = useMemo(
    () => tenants.find((t) => t.tenantId === tenantId) ?? summary?.tenant ?? null,
    [tenants, tenantId, summary],
  );

  const value: WorkspaceContextValue = {
    tenants,
    tenantId,
    activeTenant,
    actorRole,
    actorId,
    token,
    summary,
    loadingSummary,
    rotatingKey,
    refreshVersion,
    addModalOpen,
    toast,
    sessionApiKey,
    reqCtx,
    setTenantId,
    setActorRole,
    setAddModalOpen,
    setSessionApiKey,
    triggerRefresh,
    rotateKekNow,
    showToast,
    dismissToast,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used inside WorkspaceProvider');
  }
  return ctx;
}
