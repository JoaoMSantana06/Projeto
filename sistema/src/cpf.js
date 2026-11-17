const crypto = require('node:crypto');
const config = require('./config');

function normalizarCpf(valor) {
  const cpf = String(valor || '').replace(/\D/g, '');
  if (cpf.length !== 11 || /^([0-9])\1{10}$/.test(cpf)) return null;

  const calcularDigito = (base, pesoInicial) => {
    let soma = 0;
    for (let i = 0; i < base.length; i += 1) soma += Number(base[i]) * (pesoInicial - i);
    const resto = (soma * 10) % 11;
    return String(resto === 10 ? 0 : resto);
  };

  const digito1 = calcularDigito(cpf.slice(0, 9), 10);
  const digito2 = calcularDigito(cpf.slice(0, 10), 11);
  if (cpf[9] !== digito1 || cpf[10] !== digito2) return null;
  return cpf;
}

function cifrarCpf(cpf) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', config.cpfEncryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(cpf, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const hash = crypto.createHmac('sha256', config.cpfHashKey).update(cpf).digest('hex');
  return { cpf_cifrado: ciphertext, cpf_iv: iv, cpf_tag: tag, cpf_hash: hash };
}

function decifrarCpf(tutor) {
  if (!tutor.cpf_cifrado || !tutor.cpf_iv || !tutor.cpf_tag) return null;
  const decipher = crypto.createDecipheriv('aes-256-gcm', config.cpfEncryptionKey, tutor.cpf_iv);
  decipher.setAuthTag(tutor.cpf_tag);
  return Buffer.concat([
    decipher.update(tutor.cpf_cifrado),
    decipher.final()
  ]).toString('utf8');
}

function mascararCpf(tutor) {
  const cpf = decifrarCpf(tutor);
  return cpf ? `•••.•••.•••-${cpf.slice(-2)}` : 'Não informado';
}

module.exports = { normalizarCpf, cifrarCpf, decifrarCpf, mascararCpf };
