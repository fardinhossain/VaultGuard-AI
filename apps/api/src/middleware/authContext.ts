import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { hashApiKey } from '@vaultguard/crypto-core';
import { env } from '../config/env.js';
import { ApiKeyDoc, ApiKeyModel } from '../models/ApiKey.js';
import { TenantModel } from '../models/Tenant.js';
import { ActorRole } from '../modules/access/policy.service.js';

export interface AuthContext {
  tenantId: string;
  actorId: string;
  actorRole: ActorRole;
  authMethod: 'api-key' | 'jwt' | 'demo-headers';
  apiKeyId?: string;
  apiKeyPrefix?: string;
}

declare global {
  namespace Express {
    interface Request {
      auth: AuthContext;
    }
  }
}

const VALID_ROLES = new Set<ActorRole>(['admin', 'delivery', 'marketing']);

function parseRole(raw: unknown): ActorRole {
  if (typeof raw === 'string' && VALID_ROLES.has(raw as ActorRole)) {
    return raw as ActorRole;
  }
  return 'admin';
}

export type ApiKeyAuthResult =
  | { ok: true; key: ApiKeyDoc }
  | { ok: false; status: number; error: string; message: string };

export async function authenticateRawApiKey(rawKey: string): Promise<ApiKeyAuthResult> {
  const trimmed = rawKey.trim();
  if (!trimmed) {
    return {
      ok: false,
      status: 401,
      error: 'MISSING_API_KEY',
      message: 'A valid VaultGuard API key (x-api-key) is required.',
    };
  }

  const keyHash = hashApiKey(trimmed);
  const keyDoc = await ApiKeyModel.findOne({ keyHash }).lean();
  if (!keyDoc) {
    return {
      ok: false,
      status: 401,
      error: 'INVALID_API_KEY',
      message: 'Invalid VaultGuard API key.',
    };
  }

  if (keyDoc.status === 'revoked') {
    return {
      ok: false,
      status: 401,
      error: 'API_KEY_REVOKED',
      message: `VaultGuard API key '${keyDoc.keyPrefix}' has been revoked.`,
    };
  }

  if (keyDoc.status === 'sentinel_blocked') {
    return {
      ok: false,
      status: 403,
      error: 'API_KEY_BLOCKED_BY_SENTINEL',
      message: `API key '${keyDoc.keyPrefix}' was auto-blocked by VaultGuard AI Sentinel due to anomalous activity.`,
    };
  }

  await ApiKeyModel.updateOne(
    { keyId: keyDoc.keyId },
    { $inc: { requestCount: 1 }, $set: { lastUsedAt: new Date() } },
  );

  return { ok: true, key: keyDoc };
}

function extractApiKeyFromRequest(req: Request): string | null {
  const headerKey = req.headers['x-api-key'];
  if (typeof headerKey === 'string' && headerKey.trim()) {
    return headerKey.trim();
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer vg_')) {
    return authHeader.slice('Bearer '.length).trim();
  }
  return null;
}

export async function authContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // 1. Real Merchant API Key Authentication (x-api-key or Bearer vg_...)
    const rawApiKey = extractApiKeyFromRequest(req);
    if (rawApiKey) {
      const result = await authenticateRawApiKey(rawApiKey);
      if (!result.ok) {
        res.status(result.status).json({
          error: result.error,
          message: result.message,
        });
        return;
      }

      const tenantExists = await TenantModel.exists({ tenantId: result.key.tenantId });
      if (!tenantExists) {
        res.status(404).json({
          error: 'TENANT_NOT_FOUND',
          message: `Tenant '${result.key.tenantId}' does not exist.`,
        });
        return;
      }

      req.auth = {
        tenantId: result.key.tenantId,
        actorId: result.key.keyId,
        actorRole: result.key.roleScope,
        authMethod: 'api-key',
        apiKeyId: result.key.keyId,
        apiKeyPrefix: result.key.keyPrefix,
      };
      next();
      return;
    }

    // 2. Console UI JWT or Local Demo Headers
    const authHeader = req.headers.authorization;
    let tenantId = '';
    let actorId = '';
    let actorRole: ActorRole = 'admin';
    let authMethod: 'jwt' | 'demo-headers' = 'demo-headers';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim();
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as {
          tenantId?: string;
          actorId?: string;
          actorRole?: string;
        };
        if (!decoded.tenantId || !decoded.actorId || !VALID_ROLES.has(decoded.actorRole as ActorRole)) {
          res.status(401).json({
            error: 'INVALID_TOKEN_CLAIMS',
            message: 'JWT token is missing required VaultGuard tenant or role claims.',
          });
          return;
        }
        tenantId = decoded.tenantId;
        actorId = decoded.actorId;
        actorRole = decoded.actorRole as ActorRole;
        authMethod = 'jwt';
      } catch {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Invalid or expired VaultGuard JWT bearer token.',
        });
        return;
      }
    } else {
      const headerTenant = req.headers['x-tenant-id'];
      const headerRole = req.headers['x-actor-role'];
      const headerActor = req.headers['x-actor-id'];

      tenantId =
        typeof headerTenant === 'string' && headerTenant.trim()
          ? headerTenant.trim()
          : 'tenant_supershop_bd';
      actorRole = parseRole(headerRole);
      actorId =
        typeof headerActor === 'string' && headerActor.trim()
          ? headerActor.trim()
          : `demo_${actorRole}_01`;
    }

    const tenantExists = await TenantModel.exists({ tenantId });
    if (!tenantExists) {
      res.status(404).json({
        error: 'TENANT_NOT_FOUND',
        message: `Tenant '${tenantId}' does not exist.`,
      });
      return;
    }

    req.auth = { tenantId, actorId, actorRole, authMethod };
    next();
  } catch (err) {
    next(err);
  }
}
