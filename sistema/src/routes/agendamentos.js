const express = require('express');
const { pool } = require('../db');

const router = express.Router();

async function carregarPets() {
  const [rows] = await pool.query('SELECT p.id, p.nome, t.nome AS tutor_nome FROM pets p JOIN tutores t ON t.id = p.tutor_id ORDER BY p.nome');
  return rows;
}

function paraCampoDataHora(valor) {
  if (!valor) return '';
  if (valor instanceof Date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${valor.getFullYear()}-${pad(valor.getMonth() + 1)}-${pad(valor.getDate())}T${pad(valor.getHours())}:${pad(valor.getMinutes())}`;
  }
  return String(valor).replace(' ', 'T').slice(0, 16);
}

function validarDataHora(valor) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) return null;
  const [ano, mes, dia] = valor.slice(0, 10).split('-').map(Number);
  const [hora, minuto] = valor.slice(11).split(':').map(Number);
  const diasNoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  if (mes < 1 || mes > 12 || dia < 1 || dia > diasNoMes || hora > 23 || minuto > 59) return null;
  return `${valor.replace('T', ' ')}:00`;
}

async function conflito(petId, dataHora, id = 0) {
  const [rows] = await pool.execute(
    'SELECT id FROM agendamentos WHERE pet_id = ? AND data_hora = ? AND id <> ? LIMIT 1',
    [petId, dataHora, id]
  );
  return rows.length > 0;
}

router.get('/', async (req, res) => {
  const [agendamentos] = await pool.query(
    'SELECT a.id, a.data_hora, p.nome AS pet_nome, t.nome AS tutor_nome FROM agendamentos a JOIN pets p ON p.id = a.pet_id JOIN tutores t ON t.id = p.tutor_id ORDER BY a.data_hora'
  );
  res.render('agendamentos/index', { titulo: 'Agendamentos', agendamentos });
});

router.get('/novo', async (_req, res) => {
  const pets = await carregarPets();
  res.render('agendamentos/form', { titulo: 'Novo agendamento', agendamento: {}, pets, erro: pets.length ? null : 'Cadastre um pet antes de incluir um agendamento.', acao: '/agendamentos/novo' });
});

router.post('/novo', async (req, res) => {
  const pets = await carregarPets();
  const agendamento = { pet_id: Number(req.body.pet_id) || '', data_hora: String(req.body.data_hora || '') };
  const dataHora = validarDataHora(agendamento.data_hora);
  if (!dataHora || !agendamento.pet_id || !pets.some((p) => p.id === agendamento.pet_id)) {
    return res.status(400).render('agendamentos/form', { titulo: 'Novo agendamento', agendamento, pets, erro: 'Escolha um pet e informe uma data e horário válidos.', acao: '/agendamentos/novo' });
  }
  if (await conflito(agendamento.pet_id, dataHora)) {
    return res.status(409).render('agendamentos/form', { titulo: 'Novo agendamento', agendamento, pets, erro: 'Já existe um agendamento para este pet nesse horário.', acao: '/agendamentos/novo' });
  }
  try {
    await pool.execute('INSERT INTO agendamentos (pet_id, data_hora) VALUES (?, ?)', [agendamento.pet_id, dataHora]);
  } catch (erro) {
    if (erro.code === 'ER_DUP_ENTRY') return res.status(409).render('agendamentos/form', { titulo: 'Novo agendamento', agendamento, pets, erro: 'Já existe um agendamento para este pet nesse horário.', acao: '/agendamentos/novo' });
    throw erro;
  }
  res.redirect('/agendamentos');
});

router.get('/:id/editar', async (req, res) => {
  const [rows] = await pool.execute('SELECT id, pet_id, data_hora FROM agendamentos WHERE id = ?', [Number(req.params.id)]);
  if (!rows.length) return res.status(404).render('erro', { titulo: 'Agendamento não encontrado', mensagemErro: 'O agendamento solicitado não existe.' });
  const agendamento = { ...rows[0], data_hora: paraCampoDataHora(rows[0].data_hora) };
  res.render('agendamentos/form', { titulo: 'Editar agendamento', agendamento, pets: await carregarPets(), erro: null, acao: `/agendamentos/${agendamento.id}/editar` });
});

router.post('/:id/editar', async (req, res) => {
  const id = Number(req.params.id);
  const pets = await carregarPets();
  const agendamento = { id, pet_id: Number(req.body.pet_id) || '', data_hora: String(req.body.data_hora || '') };
  const dataHora = validarDataHora(agendamento.data_hora);
  if (!dataHora || !agendamento.pet_id || !pets.some((p) => p.id === agendamento.pet_id)) {
    return res.status(400).render('agendamentos/form', { titulo: 'Editar agendamento', agendamento, pets, erro: 'Escolha um pet e informe uma data e horário válidos.', acao: `/agendamentos/${id}/editar` });
  }
  if (await conflito(agendamento.pet_id, dataHora, id)) {
    return res.status(409).render('agendamentos/form', { titulo: 'Editar agendamento', agendamento, pets, erro: 'Já existe outro agendamento para este pet nesse horário.', acao: `/agendamentos/${id}/editar` });
  }
  const [existente] = await pool.execute('SELECT id FROM agendamentos WHERE id = ?', [id]);
  if (!existente.length) return res.status(404).render('erro', { titulo: 'Agendamento não encontrado', mensagemErro: 'O agendamento solicitado não existe.' });
  try {
    await pool.execute('UPDATE agendamentos SET pet_id = ?, data_hora = ? WHERE id = ?', [agendamento.pet_id, dataHora, id]);
  } catch (erro) {
    if (erro.code === 'ER_DUP_ENTRY') return res.status(409).render('agendamentos/form', { titulo: 'Editar agendamento', agendamento, pets, erro: 'Já existe outro agendamento para este pet nesse horário.', acao: `/agendamentos/${id}/editar` });
    throw erro;
  }
  res.redirect('/agendamentos');
});

router.post('/:id/excluir', async (req, res) => {
  await pool.execute('DELETE FROM agendamentos WHERE id = ?', [Number(req.params.id)]);
  res.redirect('/agendamentos');
});

module.exports = router;
