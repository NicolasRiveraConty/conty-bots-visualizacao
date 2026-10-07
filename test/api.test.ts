import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/api/app.js';
import { serieIgnicaoRapida, seriePicoComprado, seriePicoOrganico } from '../src/casos/canonicos.js';
import { LIMIARES } from '../src/limiares.js';

describe('API HTTP', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('classifica o pico comprado e o orgânico pelo mesmo contrato', async () => {
    const comprado = await app.inject({
      method: 'POST',
      url: '/classificar',
      payload: { views: seriePicoComprado() },
    });
    const organico = await app.inject({
      method: 'POST',
      url: '/classificar',
      payload: { views: seriePicoOrganico() },
    });

    expect(comprado.statusCode).toBe(200);
    expect(organico.statusCode).toBe(200);
    expect(comprado.json().classificacao).toBe('suspeito');
    expect(organico.json().classificacao).toBe('legitimo');
    expect(typeof comprado.json().motivo).toBe('string');
    expect(comprado.json().sinais[0]).toMatchObject({
      nome: 'horas_observadas',
      limiar: LIMIARES.horasMinimas,
    });
  });

  it('devolve inconclusivo para a ignição rápida', async () => {
    const resposta = await app.inject({
      method: 'POST',
      url: '/classificar',
      payload: { views: serieIgnicaoRapida() },
    });
    expect(resposta.statusCode).toBe(200);
    expect(resposta.json().classificacao).toBe('inconclusivo');
    expect(resposta.json().motivo).toMatch(/não acusa/);
  });

  it('rejeita série inválida', async () => {
    const semCampo = await app.inject({ method: 'POST', url: '/classificar', payload: {} });
    const negativa = await app.inject({ method: 'POST', url: '/classificar', payload: { views: [1, -5, 3] } });
    expect(semCampo.statusCode).toBe(400);
    expect(negativa.statusCode).toBe(400);
    expect(typeof semCampo.json().erro).toBe('string');
  });

  it('expõe os limiares e o health', async () => {
    const health = await app.inject({ method: 'GET', url: '/health' });
    const limiares = await app.inject({ method: 'GET', url: '/limiares' });
    expect(health.json()).toEqual({ status: 'ok' });
    expect(limiares.json().razaoPicoNotavel).toBe(LIMIARES.razaoPicoNotavel);
  });
});
