const MAXIMO_HORAS = 24 * 21;

export function validarViews(views: unknown): string | null {
  if (!Array.isArray(views)) {
    return 'Envie um JSON com o campo "views": uma lista de números não negativos, um por hora.';
  }
  if (views.length < 1) return 'A série está vazia.';
  if (views.length > MAXIMO_HORAS) {
    return `A série passa de ${MAXIMO_HORAS} horas (21 dias).`;
  }
  for (let i = 0; i < views.length; i++) {
    const valor = views[i];
    if (typeof valor !== 'number' || !Number.isFinite(valor)) {
      return `A hora ${i} não é um número finito.`;
    }
    if (valor < 0) return `A hora ${i} tem views negativas.`;
  }
  return null;
}
