import { mkdirSync, writeFileSync } from 'node:fs';
import { gerarDataset, SEED } from './gerar.js';

const dataset = gerarDataset(SEED);
mkdirSync('data', { recursive: true });
writeFileSync('data/dataset.json', `${JSON.stringify(dataset, null, 2)}\n`);
console.log(`Dataset escrito em data/dataset.json (${dataset.amostras.length} séries, seed ${dataset.seed}).`);
