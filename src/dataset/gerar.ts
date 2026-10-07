import type { Amostra, Dataset, RotuloDataset } from '../tipos.js';
import {
  cicloDiario,
  crescimentoOrganico,
  declinioOrganico,
  doisPicosOrganicos,
  flashUmaHora,
  ignicaoRapida,
  picoComprado,
  picoOrganico,
  repeticaoMecanica,
  serieEstavel,
} from './formas.js';
import { criarRng, type Rng } from './rng.js';

export const SEED = 42;

const DESCRICOES: Record<string, { rotulo: RotuloDataset; descricao: string }> = {
  ciclo_diario: {
    rotulo: 'legitimo',
    descricao: 'Audiência estável com oscilação ao longo do dia e ruído.',
  },
  serie_estavel: {
    rotulo: 'legitimo',
    descricao: 'Volume estável, sem pico, só com variação hora a hora.',
  },
  crescimento_organico: {
    rotulo: 'legitimo',
    descricao: 'Crescimento gradual com ciclo diário, sem degrau.',
  },
  declinio_organico: {
    rotulo: 'legitimo',
    descricao: 'Queda gradual de um conteúdo que envelhece, com ciclo diário.',
  },
  pico_organico: {
    rotulo: 'legitimo',
    descricao: 'Estouro com rampa de várias horas e decaimento contínuo.',
  },
  pico_organico_rapido: {
    rotulo: 'legitimo',
    descricao: 'Estouro com rampa mais curta, ainda curva, e decaimento contínuo.',
  },
  dois_picos_organicos: {
    rotulo: 'legitimo',
    descricao: 'Dois estouros orgânicos separados por um intervalo na base.',
  },
  ignicao_rapida: {
    rotulo: 'legitimo',
    descricao: 'Sobe em uma hora, como um compartilhamento grande, e depois decai contínuo. O rótulo é legítimo; o classificador deve preferir não acusar.',
  },
  flash_uma_hora: {
    rotulo: 'legitimo',
    descricao: 'Uma única hora muito acima da base, como uma live. O rótulo é legítimo; falta sustentação para acusar.',
  },
  pico_comprado: {
    rotulo: 'suspeito',
    descricao: 'Sobe em degrau, fica num platô estreito e cai de uma vez.',
  },
  plato_longo: {
    rotulo: 'suspeito',
    descricao: 'Platô comprado mais longo, com o mesmo degrau e a mesma queda.',
  },
  repeticao_mecanica: {
    rotulo: 'suspeito',
    descricao: 'A mesma rajada se repete a cada poucas horas, com pouca variação.',
  },
};

type Plano = { cenario: keyof typeof DESCRICOES; quantidade: number; gerar: (rng: Rng) => number[] };

const PLANO: Plano[] = [
  { cenario: 'ciclo_diario', quantidade: 16, gerar: cicloDiario },
  { cenario: 'serie_estavel', quantidade: 10, gerar: serieEstavel },
  { cenario: 'crescimento_organico', quantidade: 8, gerar: crescimentoOrganico },
  { cenario: 'declinio_organico', quantidade: 8, gerar: declinioOrganico },
  { cenario: 'pico_organico', quantidade: 20, gerar: (rng) => picoOrganico(rng, false) },
  { cenario: 'pico_organico_rapido', quantidade: 10, gerar: (rng) => picoOrganico(rng, true) },
  { cenario: 'dois_picos_organicos', quantidade: 8, gerar: doisPicosOrganicos },
  { cenario: 'ignicao_rapida', quantidade: 10, gerar: ignicaoRapida },
  { cenario: 'flash_uma_hora', quantidade: 8, gerar: flashUmaHora },
  { cenario: 'pico_comprado', quantidade: 16, gerar: (rng) => picoComprado(rng, false) },
  { cenario: 'plato_longo', quantidade: 8, gerar: (rng) => picoComprado(rng, true) },
  { cenario: 'repeticao_mecanica', quantidade: 12, gerar: repeticaoMecanica },
];

export function gerarDataset(seed = SEED): Dataset {
  const rng = criarRng(seed);
  const amostras: Amostra[] = [];
  for (const item of PLANO) {
    const meta = DESCRICOES[item.cenario];
    if (!meta) continue;
    for (let indice = 1; indice <= item.quantidade; indice++) {
      amostras.push({
        id: `${item.cenario}-${String(indice).padStart(2, '0')}`,
        cenario: item.cenario,
        descricao: meta.descricao,
        rotulo: meta.rotulo,
        views: item.gerar(rng),
      });
    }
  }
  return {
    seed,
    descricao:
      'Séries horárias sintéticas de views. A seed fixa torna o arquivo reproduzível; não há dado de rede social.',
    amostras,
  };
}
