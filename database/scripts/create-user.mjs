import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
config({ path: join(root, '.env.development') });
config({ path: join(root, '.env.local'), override: false });

function usage() {
  console.log("Uso: npm run db:create-user -- --email usuario@example.com --senha 'senha-forte' [--admin true|false]");
}

function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const [key, ...valueParts] = arg.slice(2).split('=');
    if (valueParts.length > 0) {
      args.set(key, valueParts.join('='));
    } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
      args.set(key, argv[i + 1]);
      i += 1;
    } else {
      args.set(key, 'true');
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (args.has('help')) {
  usage();
  process.exit(0);
}

const email = args.get('email')?.trim().toLowerCase();
const senha = args.get('senha');
const adminRaw = args.get('admin') ?? 'false';
const admin = adminRaw === 'true' || adminRaw === '1' || adminRaw === 'yes';

if (!email || !email.includes('@')) {
  console.error('Informe um email válido com --email.');
  usage();
  process.exit(1);
}

if (!senha || senha.length < 8) {
  console.error('Informe uma senha com pelo menos 8 caracteres com --senha.');
  usage();
  process.exit(1);
}

if (!['true', 'false', '1', '0', 'yes', 'no'].includes(adminRaw.toLowerCase())) {
  console.error('Use --admin true ou --admin false.');
  usage();
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL nao definida. Crie .env.development a partir de .env.example');
  process.exit(1);
}

const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
if (!Number.isInteger(saltRounds) || saltRounds < 4 || saltRounds > 31) {
  console.error('BCRYPT_SALT_ROUNDS deve ser um inteiro entre 4 e 31.');
  process.exit(1);
}

const senhaHash = await bcrypt.hash(senha, saltRounds);
const pool = new Pool({ connectionString: databaseUrl });

try {
  const result = await pool.query(
    `INSERT INTO usuarios (email, senha, admin)
     VALUES ($1, $2, $3)
     RETURNING id, email, admin`,
    [email, senhaHash, admin]
  );
  const user = result.rows[0];
  console.log(`Usuario criado: ${user.id} ${user.email} admin=${user.admin}`);
} catch (error) {
  if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
    console.error('Ja existe um usuario com esse email.');
    process.exit(1);
  }
  throw error;
} finally {
  await pool.end();
}
