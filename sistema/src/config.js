const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variável obrigatória ausente no .env: ${name}`);
  return value;
}

function loadOrCreateSecret() {
  const secretPath = path.join(__dirname, '..', '.local-secret');
  try {
    const secret = fs.readFileSync(secretPath, 'utf8').trim();
    if (secret.length < 32) throw new Error('O arquivo .local-secret deve conter pelo menos 32 caracteres.');
    return secret;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const secret = crypto.randomBytes(32).toString('hex');
  try {
    fs.writeFileSync(secretPath, `${secret}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    return secret;
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const existing = fs.readFileSync(secretPath, 'utf8').trim();
    if (existing.length < 32) throw new Error('O arquivo .local-secret deve conter pelo menos 32 caracteres.');
    return existing;
  }
}

const sessionSecret = loadOrCreateSecret();

function derivarChave(contexto) {
  return Buffer.from(crypto.hkdfSync(
    'sha256',
    Buffer.from(sessionSecret, 'utf8'),
    Buffer.from('SAEP-VetAgenda-v1', 'utf8'),
    Buffer.from(contexto, 'utf8'),
    32
  ));
}

module.exports = {
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT || 3000),
  database: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    name: process.env.DB_NAME || 'clinica_veterinaria',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  },
  sessionSecret,
  sessionTtlMs: 30 * 60 * 1000,
  cookieSecure: false,
  cookieSameSite: 'lax',
  cpfEncryptionKey: derivarChave('cpf-encryption'),
  cpfHashKey: derivarChave('cpf-index-hmac')
};
