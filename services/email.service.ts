export interface PasswordRecoveryEmailInput {
  email: string;
  chave: string;
  tipo: 'recuperacao' | 'alteracao';
}

export interface PasswordRecoveryEmailResult {
  sent: boolean;
  provider: string | null;
}

export async function sendPasswordRecoveryEmail(input: PasswordRecoveryEmailInput): Promise<PasswordRecoveryEmailResult> {
  const email = input.email.trim().toLowerCase();
  const chave = input.chave.trim();
  const tipo = input.tipo;

  if (!email || !email.includes('@') || chave.length !== 8 || (tipo !== 'recuperacao' && tipo !== 'alteracao')) {
    throw new Error('Dados invalidos para envio do email.');
  }

  const provider = process.env.EMAIL_PROVIDER ?? null;

  return {
    sent: false,
    provider,
  };
}
