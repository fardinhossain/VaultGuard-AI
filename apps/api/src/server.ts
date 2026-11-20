import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { authContextMiddleware } from './middleware/authContext.js';
import { errorHandlerMiddleware } from './middleware/errorHandler.js';
import { accessRouter } from './modules/access/access.routes.js';
import { apiKeysPublicRouter, apiKeysRouter } from './modules/apiKeys/apiKeys.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { breachRouter } from './modules/breach/breach.routes.js';
import { cryptoProxyRouter } from './modules/cryptoProxy/cryptoProxy.routes.js';
import { dashboardRouter, healthRouter } from './modules/dashboard/dashboard.routes.js';
import { keysRouter } from './modules/keys/keys.routes.js';
import { plansRouter } from './modules/plans/plans.routes.js';
import { recordsRouter } from './modules/records/records.routes.js';
import { sentinelRouter } from './modules/sentinel/sentinel.routes.js';
import { storeSandboxRouter } from './modules/storeSandbox/storeSandbox.routes.js';
import { tenantsRouter } from './modules/tenants/tenants.routes.js';
import { seedDatabaseIfEmpty } from './seed/seedData.js';

async function bootstrap() {
  await connectDatabase();
  await seedDatabaseIfEmpty();

  const app = express();
  app.use(helmet());
  // Allow external merchant e-commerce apps on any local/dev origin to call /v1/crypto/* with x-api-key
  app.use(
    cors({
      origin: true,
      credentials: true,
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-api-key',
        'x-tenant-id',
        'x-actor-role',
        'x-actor-id',
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  // Public health, plans catalog, API key verify & demo auth token routes
  app.use('/v1', healthRouter);
  app.use('/v1/plans', plansRouter);
  app.use('/v1/auth', authRouter);
  app.use('/v1/api-keys', apiKeysPublicRouter);

  // Tenant listing / onboarding routes (tenant list is needed prior to tenant selection)
  app.use('/v1/tenants', tenantsRouter);
  app.use('/v1/access', accessRouter);

  // Dashboard & tenant-scoped protected routes
  app.use('/v1/dashboard', dashboardRouter);
  app.use('/v1/api-keys', authContextMiddleware, apiKeysRouter);
  app.use('/v1/crypto', authContextMiddleware, cryptoProxyRouter);
  app.use('/v1/store-sandbox', storeSandboxRouter);
  app.use('/v1/records', authContextMiddleware, recordsRouter);
  app.use('/v1/keys', authContextMiddleware, keysRouter);
  app.use('/v1/breach', authContextMiddleware, breachRouter);
  app.use('/v1/sentinel', authContextMiddleware, sentinelRouter);
  app.use('/v1/audit-logs', authContextMiddleware, auditRouter);

  app.use(errorHandlerMiddleware);

  const server = app.listen(env.PORT, () => {
    console.log(`[api] VaultGuard AI Security Gateway listening on http://localhost:${env.PORT}/v1`);
  });

  const shutdown = async () => {
    console.log('[api] Shutting down gracefully...');
    server.close();
    await disconnectDatabase();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('[api] Fatal startup error:', err);
  process.exit(1);
});
