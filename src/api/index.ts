import { buildApp } from './app.js';

const porta = Number(process.env.PORT ?? 3000);
const app = buildApp();

app.listen({ port: porta, host: '0.0.0.0' }).catch((erro: unknown) => {
  console.error(erro);
  process.exit(1);
});
