/**
 * Limiares do classificador. Nenhum deles, sozinho, condena uma série.
 * A acusação exige uma combinação documentada em `classificar`.
 */
export const LIMIARES = {
  horasMinimas: 12,
  razaoPicoNotavel: 5,
  fracaoSubidaDegrau: 0.7,
  horasRampaCurta: 2,
  duracaoPlatoMinHoras: 4,
  nivelPlato: 0.95,
  cvPlatoMecanico: 0.08,
  declinioMaxPlato: 0.06,
  quedaAbruptaFracao: 0.6,
  sustentacaoMinAntesQueda: 3,
  r2DecaimentoOrganico: 0.75,
  maiorQuedaRelativaOrganica: 0.45,
  horasDecaimentoMin: 4,
  autocorrRepeticao: 0.9,
  mapeRepeticao: 0.1,
  cvMediasRepeticao: 0.08,
  amplitudeRepeticao: 4,
  contrasteBloco: 2.5,
  ciclosMinimos: 4,
  horasQuaseIdenticas: 6,
  toleranciaIdentica: 0.03,
  razaoBlocoSobreBaseline: 4,
  cvSerieConstante: 0.02,
  aderenciaCicloDiario: 0.45,
  horasMinimasCicloDiario: 48,
} as const;

export type NomeLimiar = keyof typeof LIMIARES;
