import { inteiroEntre, realEntre, type Rng } from './rng.js';

export function viewsInteiras(valores: number[]): number[] {
  return valores.map((valor) => Math.max(0, Math.round(valor)));
}

export function baselineRuidosa(rng: Rng, horas: number, base: number, ruido: number): number[] {
  const views: number[] = [];
  for (let hora = 0; hora < horas; hora++) {
    const fator = 1 + (rng() * 2 - 1) * ruido;
    views.push(base * fator);
  }
  return views;
}

export function cicloDiario(rng: Rng): number[] {
  const horas = inteiroEntre(rng, 72, 120);
  const base = inteiroEntre(rng, 80, 500);
  const amplitude = realEntre(rng, 0.18, 0.4);
  const ruido = realEntre(rng, 0.06, 0.12);
  const views: number[] = [];
  for (let hora = 0; hora < horas; hora++) {
    const angulo = ((hora - 20) / 24) * 2 * Math.PI;
    const nivel = base * (1 + amplitude * Math.cos(angulo));
    views.push(nivel * (1 + (rng() * 2 - 1) * ruido));
  }
  return viewsInteiras(views);
}

export function serieEstavel(rng: Rng): number[] {
  const horas = inteiroEntre(rng, 36, 120);
  const base = inteiroEntre(rng, 40, 800);
  const ruido = realEntre(rng, 0.08, 0.18);
  return viewsInteiras(baselineRuidosa(rng, horas, base, ruido));
}

export function crescimentoOrganico(rng: Rng): number[] {
  const horas = inteiroEntre(rng, 72, 110);
  const base = inteiroEntre(rng, 40, 160);
  const taxa = realEntre(rng, 1.006, 1.018);
  const amplitude = realEntre(rng, 0.12, 0.28);
  const ruido = realEntre(rng, 0.04, 0.08);
  const views: number[] = [];
  for (let hora = 0; hora < horas; hora++) {
    const angulo = ((hora - 20) / 24) * 2 * Math.PI;
    const nivel = base * taxa ** hora * (1 + amplitude * Math.cos(angulo));
    views.push(nivel * (1 + (rng() * 2 - 1) * ruido));
  }
  return viewsInteiras(views);
}

export function declinioOrganico(rng: Rng): number[] {
  const horas = inteiroEntre(rng, 72, 110);
  const inicio = inteiroEntre(rng, 250, 700);
  const fim = inteiroEntre(rng, 80, 180);
  const amplitude = realEntre(rng, 0.22, 0.38);
  const ruido = realEntre(rng, 0.05, 0.1);
  const views: number[] = [];
  for (let hora = 0; hora < horas; hora++) {
    const progresso = hora / Math.max(horas - 1, 1);
    const tendencia = inicio + (fim - inicio) * progresso;
    const angulo = ((hora - 20) / 24) * 2 * Math.PI;
    views.push(tendencia * (1 + amplitude * Math.cos(angulo)) * (1 + (rng() * 2 - 1) * ruido));
  }
  return viewsInteiras(views);
}

export function picoOrganico(rng: Rng, rapido: boolean): number[] {
  const base = inteiroEntre(rng, 60, 220);
  const razao = inteiroEntre(rng, 10, 45);
  const pico = base * razao;
  const horasRampa = rapido ? inteiroEntre(rng, 4, 5) : inteiroEntre(rng, 6, 12);
  const meiaVida = inteiroEntre(rng, 6, 12);
  const antes = inteiroEntre(rng, 18, 30);
  const depois = inteiroEntre(rng, 12, 24);
  const ruidoBase = realEntre(rng, 0.04, 0.1);
  const ruidoDecaimento = realEntre(rng, 0.02, 0.06);
  return viewsInteiras(
    montarCurvaOrganica({
      rng,
      base,
      pico,
      horasRampa,
      meiaVida,
      antes,
      depois,
      ruidoBase,
      ruidoDecaimento,
    }),
  );
}

export function doisPicosOrganicos(rng: Rng): number[] {
  const base = inteiroEntre(rng, 70, 180);
  const primeiro = montarCurvaOrganica({
    rng,
    base,
    pico: base * inteiroEntre(rng, 8, 20),
    horasRampa: inteiroEntre(rng, 6, 10),
    meiaVida: inteiroEntre(rng, 6, 10),
    antes: inteiroEntre(rng, 16, 24),
    depois: 0,
    ruidoBase: 0.06,
    ruidoDecaimento: 0.04,
  });
  const intervalo = baselineRuidosa(rng, inteiroEntre(rng, 18, 30), base, 0.06);
  const segundo = montarCurvaOrganica({
    rng,
    base,
    pico: base * inteiroEntre(rng, 12, 30),
    horasRampa: inteiroEntre(rng, 6, 10),
    meiaVida: inteiroEntre(rng, 6, 11),
    antes: 0,
    depois: inteiroEntre(rng, 16, 24),
    ruidoBase: 0.06,
    ruidoDecaimento: 0.04,
  });
  return viewsInteiras([...primeiro, ...intervalo, ...segundo]);
}

export function ignicaoRapida(rng: Rng): number[] {
  const base = inteiroEntre(rng, 70, 200);
  const pico = base * inteiroEntre(rng, 12, 40);
  const meiaVida = inteiroEntre(rng, 6, 10);
  const antes = inteiroEntre(rng, 18, 30);
  const depois = inteiroEntre(rng, 12, 20);
  const views = baselineRuidosa(rng, antes, base, 0.06);
  views.push(pico);
  let anterior = pico;
  for (let hora = 1; hora <= 42; hora++) {
    const alvo = pico * 0.5 ** (hora / meiaVida) * (1 + (rng() * 2 - 1) * 0.04);
    let valor = Math.min(alvo, anterior * 0.995);
    valor = Math.max(valor, anterior * 0.8);
    if (valor <= base * 1.08) break;
    views.push(valor);
    anterior = valor;
  }
  views.push(...baselineRuidosa(rng, depois, base, 0.06));
  return viewsInteiras(views);
}

export function flashUmaHora(rng: Rng): number[] {
  const base = inteiroEntre(rng, 60, 250);
  const horas = inteiroEntre(rng, 36, 72);
  const views = baselineRuidosa(rng, horas, base, 0.07);
  const indice = inteiroEntre(rng, 8, horas - 9);
  views[indice] = base * inteiroEntre(rng, 15, 40);
  return viewsInteiras(views);
}

export function picoComprado(rng: Rng, longo: boolean): number[] {
  const base = inteiroEntre(rng, 50, 250);
  const pico = base * inteiroEntre(rng, 12, 60);
  const duracao = longo ? inteiroEntre(rng, 10, 16) : inteiroEntre(rng, 4, 8);
  const antes = inteiroEntre(rng, 18, 36);
  const depois = inteiroEntre(rng, 14, 28);
  const views = baselineRuidosa(rng, antes, base, 0.07);
  for (let hora = 0; hora < duracao; hora++) {
    views.push(pico * (1 + (rng() * 2 - 1) * 0.012));
  }
  views.push(...baselineRuidosa(rng, depois, base, 0.07));
  return viewsInteiras(views);
}

export function repeticaoMecanica(rng: Rng): number[] {
  const base = inteiroEntre(rng, 60, 180);
  const pico = base * inteiroEntre(rng, 12, 35);
  const periodo = [4, 6, 8][inteiroEntre(rng, 0, 2)] ?? 6;
  const rajada = inteiroEntre(rng, 2, Math.min(3, periodo - 1));
  const ciclos = inteiroEntre(rng, 6, 10);
  const views: number[] = [];
  for (let ciclo = 0; ciclo < ciclos; ciclo++) {
    for (let hora = 0; hora < periodo; hora++) {
      const alto = hora >= periodo - rajada;
      const nivel = alto ? pico : base;
      const ruido = alto ? 0.015 : 0.05;
      views.push(nivel * (1 + (rng() * 2 - 1) * ruido));
    }
  }
  return viewsInteiras(views);
}

function montarCurvaOrganica(opcoes: {
  rng: Rng;
  base: number;
  pico: number;
  horasRampa: number;
  meiaVida: number;
  antes: number;
  depois: number;
  ruidoBase: number;
  ruidoDecaimento: number;
}): number[] {
  const { rng, base, pico, horasRampa, meiaVida, antes, depois, ruidoBase, ruidoDecaimento } = opcoes;
  const views = antes > 0 ? baselineRuidosa(rng, antes, base, ruidoBase) : [];
  for (let passo = 1; passo <= horasRampa; passo++) {
    const progresso = passo / horasRampa;
    const suave = progresso * progresso * (3 - 2 * progresso);
    views.push(base + (pico - base) * suave);
  }
  let anterior = pico;
  for (let hora = 1; hora <= 56; hora++) {
    const alvo = pico * 0.5 ** (hora / meiaVida) * (1 + (rng() * 2 - 1) * ruidoDecaimento);
    let valor = Math.min(alvo, anterior * 0.995);
    valor = Math.max(valor, anterior * 0.78);
    if (valor <= base * 1.08) break;
    views.push(valor);
    anterior = valor;
  }
  if (depois > 0) views.push(...baselineRuidosa(rng, depois, base, ruidoBase));
  return views;
}
