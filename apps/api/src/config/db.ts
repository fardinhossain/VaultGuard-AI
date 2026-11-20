import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { LocalDevKeyProvider } from '@vaultguard/crypto-core';
import { env } from './env.js';

export type DatabaseMode = 'atlas' | 'in-memory';

let memoryServer: MongoMemoryServer | null = null;
let currentDbMode: DatabaseMode = 'in-memory';

export const keyProvider = new LocalDevKeyProvider(env.LOCAL_MASTER_SEED);

export function getDatabaseMode(): DatabaseMode {
  return currentDbMode;
}

export async function connectDatabase(): Promise<DatabaseMode> {
  if (env.MONGODB_URI) {
    try {
      console.log('[db] Connecting to configured MONGODB_URI...');
      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 3500,
      });
      currentDbMode = 'atlas';
      console.log('[db] Connected to external MongoDB.');
      return currentDbMode;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[db] External MONGODB_URI unreachable (${msg}). Falling back to mongodb-memory-server.`);
    }
  }

  console.log('[db] Starting zero-cost mongodb-memory-server (first launch may cache binary)...');
  memoryServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'vaultguard_mvp',
    },
  });
  const memUri = memoryServer.getUri();
  await mongoose.connect(memUri);
  currentDbMode = 'in-memory';
  console.log('[db] Connected to in-memory MongoDB fallback.');
  return currentDbMode;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
