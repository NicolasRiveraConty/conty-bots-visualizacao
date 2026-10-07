import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('README', () => {
  const readme = readFileSync('README.md', 'utf8');

  it('publica a taxa de falso positivo medida, não uma estimativa', () => {
    expect(readme).toContain('Taxa de falso positivo medida: 0 / 98 = 0%');
    expect(readme).toContain('80');
    expect(readme).toContain('36');
    expect(readme).toContain('ignicao_rapida');
  });

  it('declara o uso de IA e deixa a revisão humana em aberto', () => {
    expect(readme).toContain('agente de IA (Cursor)');
    expect(readme).toContain('Revisado por Nicolas: [preencher]');
  });
});
