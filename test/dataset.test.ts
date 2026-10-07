import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { avaliar } from '../src/avaliar.js';
import { classificar } from '../src/classificador/classificar.js';
import { SEED, gerarDataset } from '../src/dataset/gerar.js';
import type { Dataset } from '../src/tipos.js';

describe('dataset sintético reproduzível', () => {
  it('a mesma seed gera o mesmo arquivo commitado', () => {
    const doArquivo = JSON.parse(readFileSync('data/dataset.json', 'utf8')) as Dataset;
    expect(doArquivo.seed).toBe(SEED);
    expect(gerarDataset(SEED)).toEqual(doArquivo);
  });

  it('mede falso positivo zero e separa os cenários óbvios', () => {
    const dataset = gerarDataset(SEED);
    const problemas: string[] = [];

    for (const amostra of dataset.amostras) {
      const resultado = classificar(amostra.views);
      if (amostra.rotulo === 'legitimo' && resultado.classificacao === 'suspeito') {
        problemas.push(`${amostra.id} foi acusado: ${resultado.motivo}`);
      }
      if (amostra.rotulo === 'suspeito' && resultado.classificacao !== 'suspeito') {
        problemas.push(`${amostra.id} veio ${resultado.classificacao}: ${resultado.motivo}`);
      }
      if (
        (amostra.cenario === 'ignicao_rapida' || amostra.cenario === 'flash_uma_hora') &&
        resultado.classificacao !== 'inconclusivo'
      ) {
        problemas.push(`${amostra.id} deveria ficar inconclusivo e veio ${resultado.classificacao}`);
      }
      if (
        (amostra.cenario === 'pico_organico' || amostra.cenario === 'pico_organico_rapido' || amostra.cenario === 'ciclo_diario') &&
        resultado.classificacao !== 'legitimo'
      ) {
        problemas.push(`${amostra.id} deveria ser legítimo e veio ${resultado.classificacao}: ${resultado.motivo}`);
      }
    }

    expect(problemas).toEqual([]);

    const medido = avaliar(dataset);
    const relatorio = JSON.parse(readFileSync('data/avaliacao.json', 'utf8'));
    expect(medido).toEqual(relatorio);
    expect(medido.falsos_positivos).toBe(0);
    expect(medido.taxa_falso_positivo).toBe(0);
    expect(medido.falsos_negativos).toBe(0);
    expect(medido.suspeitos_sem_acusacao).toBe(0);
    expect(medido.legitimos).toBe(98);
    expect(medido.suspeitos).toBe(36);
    expect(medido.matriz).toEqual([
      { rotulo: 'legitimo', legitimo: 80, suspeito: 0, inconclusivo: 18 },
      { rotulo: 'suspeito', legitimo: 0, suspeito: 36, inconclusivo: 0 },
    ]);
  });
});
