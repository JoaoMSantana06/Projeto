const path = require('node:path');
const express = require('express');
const session = require('express-session');
const config = require('./config');
const { exigirLogin } = require('./middleware');

const authRoutes = require('./routes/auth');
const tutoresRoutes = require('./routes/tutores');
const petsRoutes = require('./routes/pets');
const agendamentosRoutes = require('./routes/agendamentos');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(session({
  name: 'saep_session',
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    maxAge: config.sessionTtlMs
  }
}));
app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario || null;
  res.locals.titulo = 'VetAgenda';
  next();
});

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
app.get('/', (req, res) => res.redirect(req.session.usuario ? '/tutores' : '/login'));
app.use(authRoutes);
app.use('/tutores', exigirLogin, tutoresRoutes);
app.use('/pets', exigirLogin, petsRoutes);
app.use('/agendamentos', exigirLogin, agendamentosRoutes);
app.use((_req, res) => res.status(404).render('erro', { titulo: 'Página não encontrada', mensagemErro: 'A página solicitada não existe.' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  if (res.headersSent) return;
  return res.status(500).render('erro', {
    titulo: 'Erro',
    mensagemErro: 'Não foi possível concluir a operação. Verifique os dados e tente novamente.'
  });
});

module.exports = app;
