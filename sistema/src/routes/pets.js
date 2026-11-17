const express = require('express');
const { pool } = require('../db');

const router = express.Router();

async function carregarTutores() {
  const [rows] = await pool.query('SELECT id, nome FROM tutores ORDER BY nome');
  return rows;
}

function dadosDoFormulario(body) {
  return {
    nome: String(body.nome || '').trim(),
    especie: String(body.especie || '').trim(),
    raca: String(body.raca || '').trim() || null,
    data_nascimento: String(body.data_nascimento || '').trim() || null,
    tutor_id: Number(body.tutor_id) || ''
  };
}

router.get('/', async (req, res) => {
  const [pets] = await pool.query(
    'SELECT p.id, p.nome, p.especie, p.raca, p.data_nascimento, t.nome AS tutor_nome FROM pets p JOIN tutores t ON t.id = p.tutor_id ORDER BY p.nome'
  );
  res.render('pets/index', { titulo: 'Pets', pets });
});

router.get('/novo', async (_req, res) => {
  const tutores = await carregarTutores();
  res.render('pets/form', { titulo: 'Novo pet', pet: {}, tutores, erro: tutores.length ? null : 'Cadastre um tutor antes de incluir um pet.', acao: '/pets/novo' });
});

router.post('/novo', async (req, res) => {
  const pet = dadosDoFormulario(req.body);
  const tutores = await carregarTutores();
  if (!pet.nome || !pet.especie || !pet.tutor_id || !tutores.some((t) => t.id === pet.tutor_id)) {
    return res.status(400).render('pets/form', { titulo: 'Novo pet', pet, tutores, erro: 'Informe nome, espécie e associe o pet a um tutor existente.', acao: '/pets/novo' });
  }
  await pool.execute(
    'INSERT INTO pets (tutor_id, nome, especie, raca, data_nascimento) VALUES (?, ?, ?, ?, ?)',
    [pet.tutor_id, pet.nome, pet.especie, pet.raca, pet.data_nascimento]
  );
  res.redirect('/pets');
});

router.get('/:id/editar', async (req, res) => {
  const [rows] = await pool.execute('SELECT id, tutor_id, nome, especie, raca, data_nascimento FROM pets WHERE id = ?', [Number(req.params.id)]);
  if (!rows.length) return res.status(404).render('erro', { titulo: 'Pet não encontrado', mensagemErro: 'O pet solicitado não existe.' });
  const pet = rows[0];
  if (pet.data_nascimento instanceof Date) pet.data_nascimento = pet.data_nascimento.toISOString().slice(0, 10);
  res.render('pets/form', { titulo: 'Editar pet', pet, tutores: await carregarTutores(), erro: null, acao: `/pets/${pet.id}/editar` });
});

router.post('/:id/editar', async (req, res) => {
  const id = Number(req.params.id);
  const pet = { ...dadosDoFormulario(req.body), id };
  const tutores = await carregarTutores();
  if (!pet.nome || !pet.especie || !pet.tutor_id || !tutores.some((t) => t.id === pet.tutor_id)) {
    return res.status(400).render('pets/form', { titulo: 'Editar pet', pet, tutores, erro: 'Informe nome, espécie e associe o pet a um tutor existente.', acao: `/pets/${id}/editar` });
  }
  const [existente] = await pool.execute('SELECT id FROM pets WHERE id = ?', [id]);
  if (!existente.length) return res.status(404).render('erro', { titulo: 'Pet não encontrado', mensagemErro: 'O pet solicitado não existe.' });
  await pool.execute(
    'UPDATE pets SET tutor_id = ?, nome = ?, especie = ?, raca = ?, data_nascimento = ? WHERE id = ?',
    [pet.tutor_id, pet.nome, pet.especie, pet.raca, pet.data_nascimento, id]
  );
  res.redirect('/pets');
});

router.post('/:id/excluir', async (req, res) => {
  try {
    await pool.execute('DELETE FROM pets WHERE id = ?', [Number(req.params.id)]);
  } catch (erro) {
    if (erro.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).render('erro', { titulo: 'Não foi possível excluir', mensagemErro: 'Este pet possui agendamentos vinculados.' });
    }
    throw erro;
  }
  res.redirect('/pets');
});

module.exports = router;
