import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { classificar } from './classificador/classificar.js';
import type { Dataset, RotuloDataset } from './tipos.js';

export type Contagem = {
  legitimo: number;
  suspeito: number;
  inconclusivo: number;
};

export type LinhaCenario = Contagem & {
  cenario: string;
  rotulo: RotuloDataset;
  total: number;
};

export type ResultadoAvaliacao = {
  seed: number;
  total: number;
  legitimos: number;
  suspeitos: number;
  matriz: Array<{ rotulo: RotuloDataset } & Contagem>;
  falsos_positivos: number;
  falsos_negativos: number;
  suspeitos_sem_acusacao: number;
  taxa_falso_positivo: number;
  por_cenario: LinhaCenario[];
};

const VAZIO = (): Contagem => ({ legitimo: 0, suspeito: 0, inconclusivo: 0 });

export function avaliar(dataset: Dataset): ResultadoAvaliacao {
  const porRotulo = new Map<RotuloDataset, Contagem>([
    ['legitimo', VAZIO()],
    ['suspeito', VAZIO()],
  ]);
  const porCenario = new Map<string, LinhaCenario>();

  for (const amostra of dataset.amostras) {
    const predicao = classificar(amostra.views).classificacao;
    const linhaRotulo = porRotulo.get(amostra.rotulo);
    if (linhaRotulo) linhaRotulo[predicao] += 1;

    const atual = porCenario.get(amostra.cenario) ?? {
      cenario: amostra.cenario,
      rotulo: amostra.rotulo,
      total: 0,
      ...VAZIO(),
    };
    atual.total += 1;
    atual[predicao] += 1;
    porCenario.set(amostra.cenario, atual);
  }

  const legitimos = porRotulo.get('legitimo') ?? VAZIO();
  const suspeitos = porRotulo.get('suspeito') ?? VAZIO();
  const totalLegitimos = legitimos.legitimo + legitimos.suspeito + legitimos.inconclusivo;
  const totalSuspeitos = suspeitos.legitimo + suspeitos.suspeito + suspeitos.inconclusivo;

  return {
    seed: dataset.seed,
    total: dataset.amostras.length,
    legitimos: totalLegitimos,
    suspeitos: totalSuspeitos,
    matriz: [
      { rotulo: 'legitimo', ...legitimos },
      { rotulo: 'suspeito', ...suspeitos },
    ],
    falsos_positivos: legitimos.suspeito,
    falsos_negativos: suspeitos.legitimo,
    suspeitos_sem_acusacao: suspeitos.inconclusivo,
    taxa_falso_positivo: totalLegitimos === 0 ? 0 : legitimos.suspeito / totalLegitimos,
    por_cenario: [...porCenario.values()],
  };
}

function imprimirAvaliacao(resultado: ResultadoAvaliacao): void {
  console.log(`Seed ${resultado.seed}. ${resultado.total} séries.`);
  console.log('Matriz (linha = rótulo, colunas = classificação):');
  for (const linha of resultado.matriz) {
    console.log(
      `  ${linha.rotulo}: legítimo ${linha.legitimo}, suspeito ${linha.suspeito}, inconclusivo ${linha.inconclusivo}`,
    );
  }
  console.log(
    `Falso positivo (legítimo classificado como suspeito): ${resultado.falsos_positivos} / ${resultado.legitimos} = ${formatarTaxa(resultado.taxa_falso_positivo)}`,
  );
  console.log(`Suspeito classificado como legítimo: ${resultado.falsos_negativos}`);
  console.log(`Suspeito deixado inconclusivo: ${resultado.suspeitos_sem_acusacao}`);
  console.log('Por cenário:');
  for (const linha of resultado.por_cenario) {
    console.log(
      `  ${linha.cenario} [${linha.rotulo}] n=${linha.total}: legítimo ${linha.legitimo}, suspeito ${linha.suspeito}, inconclusivo ${linha.inconclusivo}`,
    );
  }
}

function formatarTaxa(taxa: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 2 }).format(taxa);
}

const executadoDireto = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (executadoDireto) {
  const dataset = JSON.parse(readFileSync('data/dataset.json', 'utf8')) as Dataset;
  const resultado = avaliar(dataset);
  writeFileSync('data/avaliacao.json', `${JSON.stringify(resultado, null, 2)}\n`);
  imprimirAvaliacao(resultado);
}
