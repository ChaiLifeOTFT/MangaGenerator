import * as schema from "@shared/schema";

let db: any = null;
let pool: any = null;

if (process.env.DATABASE_URL) {
  try {
    const { Pool, neonConfig } = require('@neondatabase/serverless');
    const { drizzle } = require('drizzle-orm/neon-serverless');
    const ws = require('ws');
    neonConfig.webSocketConstructor = ws;
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema });
    console.log('[db] Connected to PostgreSQL');
  } catch (e: any) {
    console.warn('[db] PostgreSQL unavailable:', e.message);
  }
} else {
  console.log('[db] No DATABASE_URL — using in-memory storage');
}

export { pool, db };
