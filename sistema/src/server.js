const app = require('./app');
const config = require('./config');
const { verificarConexao } = require('./db');

async function iniciar() {
  await verificarConexao();
  app.listen(config.port, config.host, () => {
    console.log(`VetAgenda disponível na porta ${config.port}.`);
  });
}

iniciar().catch((erro) => {
  console.error('Falha ao iniciar. Confira o MySQL e as variáveis do arquivo .env.');
  console.error(erro.message);
  process.exit(1);
});
