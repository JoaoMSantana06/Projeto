const express = require('express');
const { pool } = require('../db');
const { normalizarCpf, cifrarCpf, mascararCpf } = require('../cpf');

const router = express.Router();
const campos = 'id, nome, email, telefone, cpf_cifrado, cpf_iv, cpf_tag, cpf_hash';

router.get('/', async (req, res) => {
  const [rows] = await pool.query(`SELECT ${campos} FROM tutores ORDER BY nome`);
  res.render('tutores/index', { titulo: 'Tutores', tutores: rows.map((t) => ({ ...t, cpfExibicao: mascararCpf(t) })) });
});

router.get('/novo', (_req, res) => {
  res.render('tutores/form', { titulo: 'Novo tutor', tutor: {}, erro: null, acao: '/tutores/novo' });
});

router.post('/novo', async (req, res) => {
  const tutor = {
    nome: String(req.body.nome || '').trim(),
    email: String(req.body.email || '').trim() || null,
    telefone: String(req.body.telefone || '').trim() || null,
    cpf: String(req.body.cpf || '').trim()
  };
  const cpf = normalizarCpf(tutor.cpf);
  if (tutor.nome.length < 2 || !cpf) {
    return res.status(400).render('tutores/form', { titulo: 'Novo tutor', tutor, acao: '/tutores/novo', erro: 'Informe o nome e um CPF válido.' });
  }
  const protegido = cifrarCpf(cpf);
  const [duplicado] = await pool.execute('SELECT id FROM tutores WHERE cpf_hash = ? LIMIT 1', [protegido.cpf_hash]);
  if (duplicado.length) {
    return res.status(409).render('tutores/form', { titulo: 'Novo tutor', tutor, acao: '/tutores/novo', erro: 'Já existe um tutor cadastrado com esse CPF.' });
  }
  await pool.execute(
    'INSERT INTO tutores (nome, email, telefone, cpf_cifrado, cpf_iv, cpf_tag, cpf_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [tutor.nome, tutor.email, tutor.telefone, protegido.cpf_cifrado, protegido.cpf_iv, protegido.cpf_tag, protegido.cpf_hash]
  );
  res.redirect('/tutores');
});

router.get('/:id/editar', async (req, res) => {
  const [rows] = await pool.execute(`SELECT ${campos} FROM tutores WHERE id = ?`, [Number(req.params.id)]);
  if (!rows.length) return res.status(404).render('erro', { titulo: 'Tutor não encontrado', mensagemErro: 'O tutor solicitado não existe.' });
  const tutor = { ...rows[0], cpfExibicao: mascararCpf(rows[0]) };
  res.render('tutores/form', { titulo: 'Editar tutor', tutor, erro: null, acao: `/tutores/${tutor.id}/editar` });
});

router.post('/:id/editar', async (req, res) => {
  const id = Number(req.params.id);
  const [existentes] = await pool.execute(`SELECT ${campos} FROM tutores WHERE id = ?`, [id]);
  if (!existentes.length) return res.status(404).render('erro', { titulo: 'Tutor não encontrado', mensagemErro: 'O tutor solicitado não existe.' });
  const anterior = existentes[0];
  const tutor = {
    id,
    nome: String(req.body.nome || '').trim(),
    email: String(req.body.email || '').trim() || null,
    telefone: String(req.body.telefone || '').trim() || null,
    cpf: String(req.body.cpf || '').trim(),
    cpfExibicao: mascararCpf(anterior)
  };
  if (tutor.nome.length < 2) {
    return res.status(400).render('tutores/form', { titulo: 'Editar tutor', tutor, acao: `/tutores/${id}/editar`, erro: 'Informe o nome do tutor.' });
  }
  let protegido = anterior;
  if (tutor.cpf) {
    const cpf = normalizarCpf(tutor.cpf);
    if (!cpf) return res.status(400).render('tutores/form', { titulo: 'Editar tutor', tutor, acao: `/tutores/${id}/editar`, erro: 'Informe um CPF válido ou deixe o campo em branco para manter o atual.' });
    protegido = cifrarCpf(cpf);
    const [duplicado] = await pool.execute('SELECT id FROM tutores WHERE cpf_hash = ? AND id <> ? LIMIT 1', [protegido.cpf_hash, id]);
    if (duplicado.length) return res.status(409).render('tutores/form', { titulo: 'Editar tutor', tutor, acao: `/tutores/${id}/editar`, erro: 'Já existe outro tutor cadastrado com esse CPF.' });
  }
  await pool.execute(
    'UPDATE tutores SET nome = ?, email = ?, telefone = ?, cpf_cifrado = ?, cpf_iv = ?, cpf_tag = ?, cpf_hash = ? WHERE id = ?',
    [tutor.nome, tutor.email, tutor.telefone, protegido.cpf_cifrado, protegido.cpf_iv, protegido.cpf_tag, protegido.cpf_hash, id]
  );
  res.redirect('/tutores');
});

router.post('/:id/excluir', async (req, res) => {
  try {
    await pool.execute('DELETE FROM tutores WHERE id = ?', [Number(req.params.id)]);
  } catch (erro) {
    if (erro.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).render('erro', { titulo: 'Não foi possível excluir', mensagemErro: 'Este tutor possui pets vinculados.' });
    }
    throw erro;
  }
  res.redirect('/tutores');
});

module.exports = router;
