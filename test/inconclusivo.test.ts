import { describe, expect, it } from 'vitest';
import { classificar } from '../src/classificador/classificar.js';
import {
  serieCurta,
  serieFlashUmaHora,
  serieIgnicaoRapida,
  serieQuaseConstante,
} from '../src/casos/canonicos.js';
import { LIMIARES } from '../src/limiares.js';
import type { Sinal } from '../src/tipos.js';

function porNome(sinais: Sinal[]): Record<string, Sinal> {
  return Object.fromEntries(sinais.map((sinal) => [sinal.nome, sinal]));
}

describe('o classificador prefere não acusar quando o padrão não fecha', () => {
  it('subida em degrau com decaimento orgânico fica inconclusiva', () => {
    const resultado = classificar(serieIgnicaoRapida());
    const sinais = porNome(resultado.sinais);

    expect(resultado.classificacao).toBe('inconclusivo');
    expect(resultado.motivo).toMatch(/não acusa/);
    expect(sinais.fracao_subida_em_1h?.valor ?? 0).toBeGreaterThanOrEqual(LIMIARES.fracaoSubidaDegrau);
    expect(sinais.r2_decaimento_exponencial?.valor ?? 0).toBeGreaterThanOrEqual(LIMIARES.r2DecaimentoOrganico);
    expect(sinais.duracao_plato_horas?.valor ?? 99).toBeLessThan(LIMIARES.duracaoPlatoMinHoras);
    expect(sinais.queda_abrupta_fracao?.valor ?? 1).toBeLessThan(LIMIARES.quedaAbruptaFracao);
    expect(sinais.formato_comprado?.disparou).toBe(false);
  });

  it('um pico de uma hora só, como uma live, não é acusação', () => {
    const resultado = classificar(serieFlashUmaHora());
    const sinais = porNome(resultado.sinais);

    expect(resultado.classificacao).toBe('inconclusivo');
    expect(resultado.motivo).toMatch(/não acusa/);
    expect(sinais.horas_sustentadas_antes_da_queda?.valor ?? 99).toBeLessThan(LIMIARES.sustentacaoMinAntesQueda);
    expect(sinais.formato_comprado?.disparou).toBe(false);
  });

  it('série curta demais fica inconclusiva', () => {
    const resultado = classificar(serieCurta());
    expect(resultado.classificacao).toBe('inconclusivo');
    expect(resultado.motivo).toMatch(/não acusa/);
    expect(porNome(resultado.sinais).horas_observadas?.disparou).toBe(true);
  });

  it('série quase constante fica inconclusiva, sem contraste com uma base', () => {
    const resultado = classificar(serieQuaseConstante());
    expect(resultado.classificacao).toBe('inconclusivo');
    expect(resultado.motivo).toMatch(/não acusa/);
  });
});
