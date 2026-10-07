import {
  baselineRobusta,
  coeficienteVariacao,
  media,
  percentil,
  pearson,
  regressaoLinear,
} from '../estatistica.js';
import { LIMIARES } from '../limiares.js';

export type Metricas = {
  horas: number;
  baseline: number;
  pico: number;
  indicePico: number;
  razaoPicoBaseline: number;
  fracaoSubidaEm1h: number;
  horasDeRampa: number;
  duracaoPlato: number;
  cvPlato: number;
  declinioPlato: number;
  quedaAbrupta: number;
  horasSustentadasAntesDaQueda: number;
  r2Decaimento: number | null;
  inclinacaoLog: number | null;
  maiorQuedaRelativa: number;
  horasDecaimento: number;
  repeticaoLag: number | null;
  repeticaoAutocorr: number;
  repeticaoMape: number;
  repeticaoCvMedias: number;
  repeticaoAmplitude: number;
  repeticaoContraste: number;
  horasQuaseIdenticas: number;
  mediaBlocoIdentico: number;
  aderenciaCicloDiario: number | null;
  cvSerie: number;
};

export function analisarSerie(views: number[]): Metricas {
  const horas = views.length;
  const pico = horas === 0 ? 0 : Math.max(...views);
  const indicePico = Math.max(0, views.indexOf(pico));
  const baseline = baselineRobusta(views);
  const altura = Math.max(0, pico - baseline);
  const razaoPicoBaseline = pico / Math.max(baseline, 1);

  const subida = medirSubida(views, indicePico, baseline, altura);
  const plato = medirPlato(views, indicePico, pico);
  const queda = medirQueda(views, pico);
  const decaimento = medirDecaimento(views, indicePico, baseline);
  const repeticao = medirRepeticao(views, pico);
  const bloco = medirBlocoQuaseIgual(views, LIMIARES.toleranciaIdentica);
  const aderenciaCicloDiario =
    horas >= LIMIARES.horasMinimasCicloDiario ? aderenciaDiaria(views) : null;

  return {
    horas,
    baseline,
    pico,
    indicePico,
    razaoPicoBaseline,
    fracaoSubidaEm1h: altura > 0 ? subida.maxDelta / altura : 0,
    horasDeRampa: subida.horasDeRampa,
    duracaoPlato: plato.duracao,
    cvPlato: plato.cv,
    declinioPlato: plato.declinio,
    quedaAbrupta: queda.fracao,
    horasSustentadasAntesDaQueda: queda.sustentacao,
    r2Decaimento: decaimento.r2,
    inclinacaoLog: decaimento.inclinacao,
    maiorQuedaRelativa: decaimento.maiorQuedaRelativa,
    horasDecaimento: decaimento.horas,
    repeticaoLag: repeticao.lag,
    repeticaoAutocorr: repeticao.autocorr,
    repeticaoMape: repeticao.mape,
    repeticaoCvMedias: repeticao.cvMedias,
    repeticaoAmplitude: repeticao.amplitude,
    repeticaoContraste: repeticao.contraste,
    horasQuaseIdenticas: bloco.horas,
    mediaBlocoIdentico: bloco.media,
    aderenciaCicloDiario,
    cvSerie: coeficienteVariacao(views),
  };
}

function medirSubida(
  views: number[],
  indicePico: number,
  baseline: number,
  altura: number,
): { maxDelta: number; horasDeRampa: number } {
  const desde = Math.max(0, indicePico - 48);
  let maxDelta = 0;
  for (let i = desde + 1; i <= indicePico; i++) {
    const delta = (views[i] ?? 0) - (views[i - 1] ?? 0);
    if (delta > maxDelta) maxDelta = delta;
  }

  const baixo = baseline + 0.2 * altura;
  const alto = baseline + 0.8 * altura;
  let i20 = indicePico;
  let i80 = indicePico;
  for (let i = indicePico; i >= desde; i--) {
    const valor = views[i] ?? 0;
    if (valor >= alto) i80 = i;
    if (valor >= baixo) i20 = i;
    else break;
  }

  return { maxDelta, horasDeRampa: Math.max(0, i80 - i20) };
}

function medirPlato(
  views: number[],
  indicePico: number,
  pico: number,
): { duracao: number; cv: number; declinio: number } {
  if (pico <= 0 || views.length === 0) return { duracao: 0, cv: 0, declinio: 0 };
  const nivel = pico * LIMIARES.nivelPlato;
  let inicio = indicePico;
  let fim = indicePico;
  while (inicio > 0 && (views[inicio - 1] ?? 0) >= nivel) inicio--;
  while (fim < views.length - 1 && (views[fim + 1] ?? 0) >= nivel) fim++;
  const janela = views.slice(inicio, fim + 1);
  const primeiro = janela[0] ?? pico;
  const ultimo = janela[janela.length - 1] ?? pico;
  const declinio = primeiro > 0 ? (primeiro - ultimo) / primeiro : 0;
  return {
    duracao: janela.length,
    cv: coeficienteVariacao(janela),
    declinio,
  };
}

function medirQueda(views: number[], pico: number): { fracao: number; sustentacao: number } {
  if (pico <= 0) return { fracao: 0, sustentacao: 0 };
  let fracao = 0;
  let sustentacao = 0;
  for (let t = 1; t < views.length; t++) {
    const anterior = views[t - 1] ?? 0;
    const atual = views[t] ?? 0;
    if (anterior < 0.7 * pico) continue;
    const drop = (anterior - atual) / pico;
    if (drop > fracao) {
      fracao = drop;
      let horasAltas = 0;
      for (let k = t - 1; k >= 0; k--) {
        if ((views[k] ?? 0) >= 0.7 * pico) horasAltas++;
        else break;
      }
      sustentacao = horasAltas;
    }
  }
  return { fracao, sustentacao };
}

function medirDecaimento(
  views: number[],
  indicePico: number,
  baseline: number,
): { r2: number | null; inclinacao: number | null; maiorQuedaRelativa: number; horas: number } {
  const segmento: number[] = [];
  const fimNivel = Math.max(baseline * 1.4, 1);
  for (let i = indicePico; i < views.length && segmento.length < 36; i++) {
    segmento.push(views[i] ?? 0);
    const atual = views[i] ?? 0;
    const proximo = views[i + 1];
    if (segmento.length >= 4 && atual <= fimNivel && (proximo === undefined || proximo <= fimNivel)) {
      break;
    }
  }

  let maiorQuedaRelativa = 0;
  for (let i = 1; i < segmento.length; i++) {
    const anterior = segmento[i - 1] ?? 0;
    const atual = segmento[i] ?? 0;
    if (anterior <= 0) continue;
    const queda = (anterior - atual) / anterior;
    if (queda > maiorQuedaRelativa) maiorQuedaRelativa = queda;
  }

  if (segmento.length < LIMIARES.horasDecaimentoMin) {
    return { r2: null, inclinacao: null, maiorQuedaRelativa, horas: segmento.length };
  }

  const logs = segmento.map((valor) => Math.log(valor + 1));
  const ajuste = regressaoLinear(logs);
  return {
    r2: ajuste?.r2 ?? null,
    inclinacao: ajuste?.inclinacao ?? null,
    maiorQuedaRelativa,
    horas: segmento.length,
  };
}

function medirRepeticao(
  views: number[],
  pico: number,
): {
  lag: number | null;
  autocorr: number;
  mape: number;
  cvMedias: number;
  amplitude: number;
  contraste: number;
} {
  const vale = Math.max(percentil(views, 0.1), 1);
  const amplitude = pico / vale;
  let melhor = {
    lag: null as number | null,
    autocorr: 0,
    mape: 1,
    cvMedias: 1,
    contraste: 1,
    detectaria: false,
  };

  const lagMax = Math.min(18, Math.floor(views.length / LIMIARES.ciclosMinimos));
  for (let lag = 3; lag <= lagMax; lag++) {
    const nCiclos = Math.floor(views.length / lag);
    if (nCiclos < LIMIARES.ciclosMinimos) continue;
    const ciclos: number[][] = [];
    for (let c = 0; c < nCiclos; c++) ciclos.push(views.slice(c * lag, (c + 1) * lag));
    const autocorr = pearson(views.slice(0, views.length - lag), views.slice(lag));
    const mape = erroMedioRelativo(ciclos);
    const cvMedias = coeficienteVariacao(ciclos.map((ciclo) => media(ciclo)));
    const template = templateMedio(ciclos);
    const contraste = (Math.max(...template) || 0) / Math.max(Math.min(...template), 1);
    const detectaria =
      amplitude >= LIMIARES.amplitudeRepeticao &&
      autocorr >= LIMIARES.autocorrRepeticao &&
      mape <= LIMIARES.mapeRepeticao &&
      cvMedias <= LIMIARES.cvMediasRepeticao &&
      contraste >= LIMIARES.contrasteBloco;

    const melhorQueAtual = detectaria
      ? !melhor.detectaria || autocorr > melhor.autocorr
      : !melhor.detectaria && autocorr > melhor.autocorr;
    if (melhor.lag === null || melhorQueAtual) {
      melhor = { lag, autocorr, mape, cvMedias, contraste, detectaria };
    }
  }

  return {
    lag: melhor.lag,
    autocorr: melhor.autocorr,
    mape: melhor.mape,
    cvMedias: melhor.cvMedias,
    amplitude,
    contraste: melhor.contraste,
  };
}

function templateMedio(ciclos: number[][]): number[] {
  const lag = ciclos[0]?.length ?? 0;
  const template: number[] = [];
  for (let i = 0; i < lag; i++) {
    let soma = 0;
    for (const ciclo of ciclos) soma += ciclo[i] ?? 0;
    template.push(soma / ciclos.length);
  }
  return template;
}

function erroMedioRelativo(ciclos: number[][]): number {
  const template = templateMedio(ciclos);
  const escala = Math.max(media(template), 1);
  let acumulado = 0;
  let quantidade = 0;
  for (const ciclo of ciclos) {
    for (let i = 0; i < ciclo.length; i++) {
      acumulado += Math.abs((ciclo[i] ?? 0) - (template[i] ?? 0));
      quantidade++;
    }
  }
  if (quantidade === 0) return 1;
  return acumulado / quantidade / escala;
}

function medirBlocoQuaseIgual(views: number[], tolerancia: number): { horas: number; media: number } {
  const trechos: { horas: number; media: number }[] = [];
  for (let i = 0; i < views.length; i++) {
    const referencia = views[i] ?? 0;
    const folga = tolerancia * Math.max(referencia, 1);
    let j = i + 1;
    while (j < views.length && Math.abs((views[j] ?? 0) - referencia) <= folga) j++;
    const horas = j - i;
    if (horas >= LIMIARES.horasQuaseIdenticas) {
      trechos.push({ horas, media: media(views.slice(i, j)) });
    }
  }
  if (trechos.length === 0) {
    let horas = 0;
    for (let i = 0; i < views.length; i++) {
      const referencia = views[i] ?? 0;
      const folga = tolerancia * Math.max(referencia, 1);
      let j = i + 1;
      while (j < views.length && Math.abs((views[j] ?? 0) - referencia) <= folga) j++;
      horas = Math.max(horas, j - i);
    }
    return { horas, media: 0 };
  }
  // Entre os blocos longos, fica o de maior nível: a base plana não esconde o platô.
  return trechos.reduce((melhor, trecho) => (trecho.media > melhor.media ? trecho : melhor));
}

function aderenciaDiaria(views: number[]): number {
  const somas = Array.from({ length: 24 }, () => 0);
  const contagens = Array.from({ length: 24 }, () => 0);
  for (let i = 0; i < views.length; i++) {
    const hora = i % 24;
    somas[hora] = (somas[hora] ?? 0) + (views[i] ?? 0);
    contagens[hora] = (contagens[hora] ?? 0) + 1;
  }
  const perfil = somas.map((soma, hora) => soma / Math.max(contagens[hora] ?? 1, 1));
  const reconstruida = views.map((_, i) => perfil[i % 24] ?? 0);
  return pearson(views, reconstruida);
}
