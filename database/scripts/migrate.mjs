import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';

// Carrega .env.develop/prod conforme --env (dev padrao), sem exigir dotenv-cli.
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const usaProducao = process.argv.includes('--env') &&
  (process.argv[process.argv.indexOf('--env') + 1] === 'prod' ||
    process.argv[process.argv.indexOf('--env') + 1] === 'production');
const arquivoEnv = usaProducao ? '.env.production' : '.env.development';
console.log(`Ambiente: ${usaProducao ? 'producao' : 'development'} (${arquivoEnv})`);
config({ path: join(root, arquivoEnv) });
config({ path: join(root, '.env.local'), override: false });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(`DATABASE_URL nao definida. Crie ${arquivoEnv} a partir de .env.example`);
  process.exit(1);
}

const migrationsDir = join(here, '..', 'migrations');
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  console.log('Nenhuma migration encontrada.');
  process.exit(0);
}

const pool = new Pool({ connectionString: databaseUrl });

try {
  for (const file of files) {
    const full = join(migrationsDir, file);
    const content = readFileSync(full, 'utf8');
    console.log(`Aplicando ${file}...`);
    await pool.query(content);
    console.log(`OK: ${file}`);
  }
  console.log('Migrations aplicadas.');
} finally {
  await pool.end();
}
