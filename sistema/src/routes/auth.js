const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session.usuario) return res.redirect('/tutores');
  res.render('login', { titulo: 'Acesso', erro: null, usuarioInformado: '' });
});

router.post('/login', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const [usuarios] = await pool.execute(
    'SELECT id, nome, username, senha_hash FROM usuarios WHERE username = ? LIMIT 1',
    [username]
  );
  const usuario = usuarios[0];
  const senhaValida = usuario ? await bcrypt.compare(password, usuario.senha_hash) : false;

  if (!senhaValida) {
    return res.status(401).render('login', {
      titulo: 'Acesso',
      erro: 'Usuário ou senha inválidos.',
      usuarioInformado: username
    });
  }

  req.session.regenerate((erro) => {
    if (erro) return res.status(500).render('login', { titulo: 'Acesso', erro: 'Não foi possível iniciar a sessão.', usuarioInformado: username });
    req.session.usuario = { id: usuario.id, nome: usuario.nome, username: usuario.username };
    req.session.save((erroAoSalvar) => {
      if (erroAoSalvar) return res.status(500).render('login', { titulo: 'Acesso', erro: 'Não foi possível iniciar a sessão.', usuarioInformado: username });
      return res.redirect('/tutores');
    });
  });
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((erro) => {
    if (erro) return next(erro);
    res.clearCookie('saep_session', { httpOnly: true, secure: require('../config').cookieSecure, sameSite: require('../config').cookieSameSite });
    return res.redirect('/login');
  });
});

module.exports = router;
