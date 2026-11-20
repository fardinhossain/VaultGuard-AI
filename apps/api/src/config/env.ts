import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root workspace .env regardless of cwd
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const env = {
  PORT: Number(process.env.PORT) || 4000,
  MONGODB_URI: (process.env.MONGODB_URI ?? '').trim(),
  JWT_SECRET:
    (process.env.JWT_SECRET ?? '').trim() || 'vaultguard-demo-jwt-secret-change-in-prod',
  LOCAL_MASTER_SEED:
    (process.env.LOCAL_MASTER_SEED ?? '').trim() || 'vaultguard-demo-dev-kek-seed-32bytes',
  CORS_ORIGIN: (process.env.CORS_ORIGIN ?? '').trim() || 'http://localhost:5173',
};
