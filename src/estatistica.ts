export function media(valores: number[]): number {
  if (valores.length === 0) return 0;
  let soma = 0;
  for (const valor of valores) soma += valor;
  return soma / valores.length;
}

export function mediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  if (ordenados.length % 2 === 0) {
    return ((ordenados[meio - 1] ?? 0) + (ordenados[meio] ?? 0)) / 2;
  }
  return ordenados[meio] ?? 0;
}

export function percentil(valores: number[], p: number): number {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const indice = Math.min(ordenados.length - 1, Math.max(0, Math.floor(p * (ordenados.length - 1))));
  return ordenados[indice] ?? 0;
}

export function coeficienteVariacao(valores: number[]): number {
  if (valores.length < 2) return 0;
  const m = media(valores);
  if (m === 0) return 0;
  let acumulado = 0;
  for (const valor of valores) acumulado += (valor - m) ** 2;
  return Math.sqrt(acumulado / (valores.length - 1)) / Math.abs(m);
}

export function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  const x = xs.slice(0, n);
  const y = ys.slice(0, n);
  const mx = media(x);
  const my = media(y);
  let numerador = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = (x[i] ?? 0) - mx;
    const b = (y[i] ?? 0) - my;
    numerador += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return 0;
  return numerador / Math.sqrt(dx * dy);
}

export function regressaoLinear(ys: number[]): { inclinacao: number; r2: number } | null {
  const n = ys.length;
  if (n < 3) return null;
  let somaX = 0;
  let somaY = 0;
  let somaXX = 0;
  let somaXY = 0;
  for (let i = 0; i < n; i++) {
    const y = ys[i] ?? 0;
    somaX += i;
    somaY += y;
    somaXX += i * i;
    somaXY += i * y;
  }
  const denominador = n * somaXX - somaX * somaX;
  if (denominador === 0) return null;
  const inclinacao = (n * somaXY - somaX * somaY) / denominador;
  const intercepto = (somaY - inclinacao * somaX) / n;
  const mediaY = somaY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const y = ys[i] ?? 0;
    const previsto = intercepto + inclinacao * i;
    ssTot += (y - mediaY) ** 2;
    ssRes += (y - previsto) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { inclinacao, r2 };
}

export function baselineRobusta(views: number[]): number {
  if (views.length === 0) return 0;
  const corte = percentil(views, 0.4);
  const baixos = views.filter((valor) => valor <= corte);
  return mediana(baixos.length > 0 ? baixos : views);
}

export function arredondarSinal(valor: number | null): number | null {
  if (valor === null || !Number.isFinite(valor)) return null;
  return Math.round(valor * 10000) / 10000;
}

const numeroPt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const percentualPt = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  maximumFractionDigits: 1,
});

export function fmt(valor: number): string {
  return numeroPt.format(valor);
}

export function fmtPct(fracao: number): string {
  return percentualPt.format(fracao);
}
