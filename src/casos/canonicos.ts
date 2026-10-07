/** Séries óbvias, sem aleatoriedade, usadas nos testes que mostram a regra. */

export function seriePicoOrganico(): number[] {
  const baseline = 120;
  const pico = 12000;
  const meiaVida = 8;
  const views: number[] = [];

  for (let hora = 0; hora < 24; hora++) views.push(baseline);

  const horasRampa = 8;
  for (let passo = 1; passo <= horasRampa; passo++) {
    const progresso = passo / horasRampa;
    const suave = progresso * progresso * (3 - 2 * progresso);
    views.push(Math.round(baseline + (pico - baseline) * suave));
  }

  for (let hora = 1; hora <= 48; hora++) {
    const valor = pico * 0.5 ** (hora / meiaVida);
    if (valor <= baseline * 1.05) break;
    views.push(Math.round(valor));
  }

  for (let hora = 0; hora < 18; hora++) views.push(baseline);
  return views;
}

export function seriePicoComprado(): number[] {
  const views = Array.from({ length: 48 }, () => 100);
  for (let hora = 20; hora < 26; hora++) views[hora] = 8000;
  return views;
}

export function serieIgnicaoRapida(): number[] {
  const baseline = 120;
  const pico = 10000;
  const meiaVida = 8;
  const views: number[] = Array.from({ length: 24 }, () => baseline);
  views.push(pico);
  for (let hora = 1; hora <= 48; hora++) {
    const valor = pico * 0.5 ** (hora / meiaVida);
    if (valor <= baseline * 1.05) break;
    views.push(Math.round(valor));
  }
  while (views.length < 72) views.push(baseline);
  return views;
}

export function serieFlashUmaHora(): number[] {
  const views = Array.from({ length: 36 }, () => 100);
  views[16] = 5000;
  return views;
}

export function serieCurta(): number[] {
  return [100, 110, 140, 4000, 900, 200, 120, 100];
}

export function serieRepeticaoMecanica(): number[] {
  const bloco = [100, 100, 100, 4000, 4000, 100];
  return Array.from({ length: 8 }, () => bloco).flat();
}

export function serieCicloDiario(): number[] {
  const views: number[] = [];
  for (let hora = 0; hora < 96; hora++) {
    const angulo = ((hora - 20) / 24) * 2 * Math.PI;
    views.push(Math.round(200 * (1 + 0.35 * Math.cos(angulo))));
  }
  return views;
}

export function serieQuaseConstante(): number[] {
  return Array.from({ length: 48 }, () => 500);
}
