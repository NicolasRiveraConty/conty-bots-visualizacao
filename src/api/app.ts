import Fastify, { type FastifyInstance } from 'fastify';
import { classificar } from '../classificador/classificar.js';
import { LIMIARES } from '../limiares.js';
import { validarViews } from './validar.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get('/', async () => ({
    nome: 'classificador de alcance',
    uso: 'POST /classificar com { "views": [números por hora] }',
    classes: ['legitimo', 'suspeito', 'inconclusivo'],
  }));

  app.get('/health', async () => ({ status: 'ok' }));

  app.get('/limiares', async () => LIMIARES);

  app.post('/classificar', async (request, reply) => {
    const corpo = request.body as { views?: unknown } | null;
    const views = corpo && typeof corpo === 'object' && !Array.isArray(corpo) ? corpo.views : undefined;
    const erro = validarViews(views);
    if (erro) return reply.code(400).send({ erro });
    return classificar(views as number[]);
  });

  return app;
}
