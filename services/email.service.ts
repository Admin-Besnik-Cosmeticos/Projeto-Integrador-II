import nodemailer, { type Transporter } from 'nodemailer';

export interface PasswordRecoveryEmailInput {
  email: string;
  chave: string;
  tipo: 'recuperacao' | 'alteracao';
}

export interface PasswordRecoveryEmailResult {
  sent: boolean;
  provider: string | null;
}

const GMAIL_HOST = 'smtp.gmail.com';
const GMAIL_PORT = 465;
const CODE_VALIDITY_MINUTES = 30;

let cachedTransporter: Transporter | null = null;

function resolveProvider(): string | null {
  const provider = (process.env.EMAIL_PROVIDER ?? '').trim().toLowerCase();
  if (!provider || provider === 'disabled') {
    return null;
  }
  return provider;
}

function getTransporter(): Transporter {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const user = process.env.EMAIL_USER?.trim();
  // Senhas de App do Gmail sao exibidas com espacos; o valor real nao os contem.
  const pass = process.env.EMAIL_APP_PASSWORD?.replace(/\s+/g, '');

  if (!user || !pass) {
    throw new Error('EMAIL_USER e EMAIL_APP_PASSWORD nao definidos.');
  }

  cachedTransporter = nodemailer.createTransport({
    host: GMAIL_HOST,
    port: GMAIL_PORT,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return cachedTransporter;
}

function resolveFrom(): string {
  const from = process.env.EMAIL_FROM?.trim();
  if (from) {
    return from;
  }
  const user = process.env.EMAIL_USER?.trim();
  return user ? `Besnik Cosméticos <${user}>` : 'Besnik Cosméticos';
}

function buildContent(tipo: PasswordRecoveryEmailInput['tipo'], chave: string): {
  subject: string;
  text: string;
  html: string;
} {
  const acao = tipo === 'alteracao' ? 'alterar sua senha' : 'redefinir sua senha';
  const subject =
    tipo === 'alteracao'
      ? 'Código para alterar sua senha - Besnik Cosméticos'
      : 'Recuperação de senha - Besnik Cosméticos';

  const text = [
    'Olá!',
    '',
    `Recebemos uma solicitação para ${acao}. Use o código abaixo:`,
    '',
    chave,
    '',
    `O código expira em ${CODE_VALIDITY_MINUTES} minutos.`,
    'Se você não fez essa solicitação, ignore este e-mail.',
    '',
    'Besnik Cosméticos',
  ].join('\n');

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#f6f6f6;font-family:Arial,Helvetica,sans-serif;color:#222;">
    <div style="max-width:520px;margin:0 auto;padding:24px;">
      <div style="background:linear-gradient(135deg,#b85fb8 0%,#a24dad 100%);border-radius:12px 12px 0 0;padding:24px;text-align:center;color:#fff;">
        <h1 style="margin:0;font-size:20px;">Besnik Cosméticos</h1>
        <p style="margin:6px 0 0;font-size:13px;opacity:.92;">Recuperação de acesso</p>
      </div>
      <div style="background:#fff;border-radius:0 0 12px 12px;padding:24px;">
        <p style="margin:0 0 12px;">Olá!</p>
        <p style="margin:0 0 16px;">Recebemos uma solicitação para ${acao}. Use o código abaixo:</p>
        <p style="margin:0;text-align:center;font-size:32px;font-weight:700;letter-spacing:6px;color:#a24dad;">${chave}</p>
        <p style="margin:16px 0 0;font-size:13px;color:#666;">O código expira em ${CODE_VALIDITY_MINUTES} minutos.</p>
        <p style="margin:8px 0 0;font-size:13px;color:#666;">Se você não fez essa solicitação, ignore este e-mail.</p>
      </div>
    </div>
  </body>
</html>`;

  return { subject, text, html };
}

export async function sendPasswordRecoveryEmail(
  input: PasswordRecoveryEmailInput,
): Promise<PasswordRecoveryEmailResult> {
  const email = input.email.trim().toLowerCase();
  const chave = input.chave.trim();
  const tipo = input.tipo;

  if (!email || !email.includes('@') || chave.length !== 8 || (tipo !== 'recuperacao' && tipo !== 'alteracao')) {
    throw new Error('Dados invalidos para envio do email.');
  }

  const provider = resolveProvider();
  if (!provider) {
    console.warn('[email.service] EMAIL_PROVIDER desativado; email nao enviado.');
    return { sent: false, provider: null };
  }

  if (provider !== 'gmail') {
    throw new Error(`EMAIL_PROVIDER nao suportado: ${provider}.`);
  }

  const { subject, text, html } = buildContent(tipo, chave);

  try {
    await getTransporter().sendMail({
      from: resolveFrom(),
      to: email,
      subject,
      text,
      html,
    });
  } catch (error) {
    console.error('[email.service] falha ao enviar email de recuperacao:', error);
    throw new Error('Falha ao enviar o email de recuperacao.');
  }

  return { sent: true, provider };
}
