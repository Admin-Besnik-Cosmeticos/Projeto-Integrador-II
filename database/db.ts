import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL nao definida no ambiente.');
}

// Cliente SQL serverless (tagged template): sql`SELECT ...`
// Compartilhado entre api/ e services/. Funciona em Vercel Functions
// sem manter pool aberto.
export const sql = neon(databaseUrl);
