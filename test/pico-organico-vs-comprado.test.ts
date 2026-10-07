import { describe, expect, it } from 'vitest';
import { classificar } from '../src/classificador/classificar.js';
import { serieCicloDiario, seriePicoComprado, seriePicoOrganico, serieRepeticaoMecanica } from '../src/casos/canonicos.js';
import { LIMIARES } from '../src/limiares.js';
import type { Sinal } from '../src/tipos.js';

function porNome(sinais: Sinal[]): Record<string, Sinal> {
  return Object.fromEntries(sinais.map((sinal) => [sinal.nome, sinal]));
}

describe('pico orgânico e pico comprado não caem no mesmo balde', () => {
  it('os dois estouram a razão pico/base, e só o retângulo é suspeito', () => {
    const organico = classificar(seriePicoOrganico());
    const comprado = classificar(seriePicoComprado());
    const razaoOrganico = porNome(organico.sinais).razao_pico_baseline;
    const razaoComprado = porNome(comprado.sinais).razao_pico_baseline;

    expect(razaoOrganico?.valor).toBeGreaterThan(LIMIARES.razaoPicoNotavel);
    expect(razaoComprado?.valor).toBeGreaterThan(LIMIARES.razaoPicoNotavel);
    expect(organico.classificacao).toBe('legitimo');
    expect(comprado.classificacao).toBe('suspeito');
  });

  it('o orgânico sobe em curva e decai; o comprado sobe em degrau, crava e cai', () => {
    const organico = porNome(classificar(seriePicoOrganico()).sinais);
    const comprado = porNome(classificar(seriePicoComprado()).sinais);

    expect(organico.fracao_subida_em_1h?.valor ?? 1).toBeLessThan(LIMIARES.fracaoSubidaDegrau);
    expect(organico.duracao_plato_horas?.valor ?? 99).toBeLessThan(LIMIARES.duracaoPlatoMinHoras);
    expect(organico.queda_abrupta_fracao?.valor ?? 1).toBeLessThan(LIMIARES.quedaAbruptaFracao);
    expect(organico.pico_organico?.disparou).toBe(true);

    expect(comprado.fracao_subida_em_1h?.valor ?? 0).toBeGreaterThanOrEqual(LIMIARES.fracaoSubidaDegrau);
    expect(comprado.duracao_plato_horas?.valor ?? 0).toBeGreaterThanOrEqual(LIMIARES.duracaoPlatoMinHoras);
    expect(comprado.cv_plato?.valor ?? 1).toBeLessThanOrEqual(LIMIARES.cvPlatoMecanico);
    expect(comprado.queda_abrupta_fracao?.valor ?? 0).toBeGreaterThanOrEqual(LIMIARES.quedaAbruptaFracao);
    expect(comprado.horas_sustentadas_antes_da_queda?.valor ?? 0).toBeGreaterThanOrEqual(
      LIMIARES.sustentacaoMinAntesQueda,
    );
    expect(comprado.formato_comprado?.disparou).toBe(true);
  });

  it('o motivo dá para ler sem ver o código', () => {
    const organico = classificar(seriePicoOrganico());
    const comprado = classificar(seriePicoComprado());

    expect(organico.motivo).toMatch(/orgânico/i);
    expect(organico.motivo).not.toMatch(/fracao_|cv_|r2_/);
    expect(comprado.motivo).toMatch(/comprado/i);
    expect(comprado.motivo).toMatch(/degrau/i);
    expect(comprado.motivo).not.toMatch(/fracao_|cv_|r2_/);
  });

  it('repetição mecânica é suspeita e ciclo diário não é', () => {
    const repetido = classificar(serieRepeticaoMecanica());
    const diario = classificar(serieCicloDiario());
    const sinaisRepetidos = porNome(repetido.sinais);

    expect(repetido.classificacao).toBe('suspeito');
    expect(sinaisRepetidos.repeticao_mecanica?.disparou).toBe(true);
    // Rajada de 2 horas não sustenta a queda o bastante para o formato comprado.
    // O período de 6 horas ainda casa com o relógio de 24 horas; isso não inocenta.
    expect(sinaisRepetidos.formato_comprado?.disparou).toBe(false);
    expect(sinaisRepetidos.horas_sustentadas_antes_da_queda?.valor ?? 99).toBeLessThan(
      LIMIARES.sustentacaoMinAntesQueda,
    );
    expect(sinaisRepetidos.aderencia_ciclo_diario?.valor ?? 0).toBeGreaterThan(LIMIARES.aderenciaCicloDiario);

    expect(diario.classificacao).toBe('legitimo');
    expect(porNome(diario.sinais).repeticao_mecanica?.disparou).toBe(false);
    expect(porNome(diario.sinais).aderencia_ciclo_diario?.valor ?? 0).toBeGreaterThan(LIMIARES.aderenciaCicloDiario);
  });
});
