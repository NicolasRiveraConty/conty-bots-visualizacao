import { analisarSerie, type Metricas } from './analisar.js';
import { arredondarSinal, fmt, fmtPct } from '../estatistica.js';
import { LIMIARES } from '../limiares.js';
import type { Classificacao, ResultadoClassificacao, Sinal } from '../tipos.js';

type Julgamento = {
  platoMecanico: boolean;
  quedaConfirmada: boolean;
  decaimentoOrganico: boolean;
  repeticaoMecanica: boolean;
  blocoCravado: boolean;
  picoNotavel: boolean;
  degrau: boolean;
  formatoComprado: boolean;
  picoOrganico: boolean;
  serieQuaseConstante: boolean;
  subidaSemConfirmacao: boolean;
};

export function classificar(views: number[]): ResultadoClassificacao {
  const metricas = analisarSerie(views);
  const julgamento = julgar(metricas);
  const sinais = montarSinais(metricas, julgamento);
  const { classificacao, motivo } = decidir(metricas, julgamento);
  return { classificacao, motivo, sinais };
}

function julgar(m: Metricas): Julgamento {
  const picoNotavel = m.razaoPicoBaseline >= LIMIARES.razaoPicoNotavel;
  const degrau =
    picoNotavel &&
    m.fracaoSubidaEm1h >= LIMIARES.fracaoSubidaDegrau &&
    m.horasDeRampa <= LIMIARES.horasRampaCurta;
  // A crista de um ciclo diário também fica algumas horas perto do próprio máximo.
  // Sem um pico alto em relação à base, isso não é platô comprado.
  const platoMecanico =
    picoNotavel &&
    m.duracaoPlato >= LIMIARES.duracaoPlatoMinHoras &&
    m.cvPlato <= LIMIARES.cvPlatoMecanico &&
    m.declinioPlato <= LIMIARES.declinioMaxPlato &&
    m.declinioPlato >= -0.02;
  const quedaConfirmada =
    m.quedaAbrupta >= LIMIARES.quedaAbruptaFracao &&
    m.horasSustentadasAntesDaQueda >= LIMIARES.sustentacaoMinAntesQueda;
  const decaimentoOrganico =
    m.r2Decaimento !== null &&
    m.r2Decaimento >= LIMIARES.r2DecaimentoOrganico &&
    m.inclinacaoLog !== null &&
    m.inclinacaoLog < 0 &&
    m.maiorQuedaRelativa <= LIMIARES.maiorQuedaRelativaOrganica &&
    m.horasDecaimento >= LIMIARES.horasDecaimentoMin;
  const repeticaoMecanica =
    m.repeticaoLag !== null &&
    m.repeticaoAmplitude >= LIMIARES.amplitudeRepeticao &&
    m.repeticaoAutocorr >= LIMIARES.autocorrRepeticao &&
    m.repeticaoMape <= LIMIARES.mapeRepeticao &&
    m.repeticaoCvMedias <= LIMIARES.cvMediasRepeticao &&
    m.repeticaoContraste >= LIMIARES.contrasteBloco;
  const blocoCravado =
    m.horasQuaseIdenticas >= LIMIARES.horasQuaseIdenticas &&
    m.mediaBlocoIdentico >= m.baseline * LIMIARES.razaoBlocoSobreBaseline;
  const formatoComprado =
    picoNotavel && degrau && (platoMecanico || quedaConfirmada) && !decaimentoOrganico;
  const picoOrganico =
    picoNotavel && !degrau && decaimentoOrganico && !platoMecanico && !quedaConfirmada;
  const serieQuaseConstante = m.horas >= LIMIARES.horasMinimas && m.cvSerie <= LIMIARES.cvSerieConstante;
  const subidaSemConfirmacao = degrau && !platoMecanico && !quedaConfirmada && !repeticaoMecanica && !blocoCravado;

  return {
    platoMecanico,
    quedaConfirmada,
    decaimentoOrganico,
    repeticaoMecanica,
    blocoCravado,
    picoNotavel,
    degrau,
    formatoComprado,
    picoOrganico,
    serieQuaseConstante,
    subidaSemConfirmacao,
  };
}

function decidir(m: Metricas, j: Julgamento): { classificacao: Classificacao; motivo: string } {
  if (m.horas < LIMIARES.horasMinimas) {
    return { classificacao: 'inconclusivo', motivo: motivoSerieCurta(m) };
  }
  if (j.formatoComprado) {
    return { classificacao: 'suspeito', motivo: motivoComprado(m, j) };
  }
  if (j.repeticaoMecanica) {
    return { classificacao: 'suspeito', motivo: motivoRepeticao(m) };
  }
  if (j.blocoCravado) {
    return { classificacao: 'suspeito', motivo: motivoBloco(m) };
  }
  if (j.serieQuaseConstante) {
    return { classificacao: 'inconclusivo', motivo: motivoConstante(m) };
  }
  if (j.subidaSemConfirmacao) {
    return { classificacao: 'inconclusivo', motivo: motivoSemConfirmacao(m, j) };
  }
  if (j.picoOrganico) {
    return { classificacao: 'legitimo', motivo: motivoOrganico(m) };
  }
  if (!j.degrau && !j.platoMecanico && !j.quedaConfirmada) {
    return { classificacao: 'legitimo', motivo: motivoTranquilo(m, j) };
  }
  return { classificacao: 'inconclusivo', motivo: motivoMisturado(m) };
}

function motivoSerieCurta(m: Metricas): string {
  return `A série tem ${fmt(m.horas)} horas. Com menos de ${fmt(LIMIARES.horasMinimas)} horas não dá para separar um estouro real de um pico comprado, de um buraco na medição ou de um recorte no meio do dia. O classificador não acusa.`;
}

function motivoComprado(m: Metricas, j: Julgamento): string {
  const partes = [
    `O volume sai de uma base de cerca de ${fmt(m.baseline)} views por hora e chega a ${fmt(m.pico)} (${fmt(m.razaoPicoBaseline)} vezes a base).`,
    `Uma única hora concentra ${fmtPct(m.fracaoSubidaEm1h)} dessa subida, em vez de crescer ao longo de várias horas.`,
  ];
  if (j.platoMecanico) {
    partes.push(
      `Depois fica ${fmt(m.duracaoPlato)} horas perto do pico, com variação de ${fmtPct(m.cvPlato)} e quase sem descer (${fmtPct(Math.max(0, m.declinioPlato))} de perda dentro do topo).`,
    );
  }
  if (j.quedaConfirmada) {
    partes.push(
      `Em seguida perde ${fmtPct(m.quedaAbrupta)} do pico em uma hora, depois de ${fmt(m.horasSustentadasAntesDaQueda)} horas sustentado no alto.`,
    );
  }
  partes.push(
    'Degrau, topo estável ou queda abrupta — e a ausência de um decaimento contínuo — formam o desenho de alcance comprado, não o de um vídeo que espalhou.',
  );
  if (j.repeticaoMecanica && m.repeticaoLag !== null) {
    partes.push(`O mesmo bloco ainda se repete a cada ${fmt(m.repeticaoLag)} horas.`);
  }
  return partes.join(' ');
}

function motivoRepeticao(m: Metricas): string {
  return `O mesmo desenho de views se repete a cada ${fmt(m.repeticaoLag ?? 0)} horas. A autocorrelação nesse intervalo é ${fmt(m.repeticaoAutocorr)} e a diferença média entre os ciclos é ${fmtPct(m.repeticaoMape)}. Audiência orgânica oscila com o dia; ela não copia um bloco quase idêntico várias vezes. Isso indica repetição mecânica.`;
}

function motivoBloco(m: Metricas): string {
  return `Há um bloco de ${fmt(m.horasQuaseIdenticas)} horas em que as views ficam quase no mesmo número (cerca de ${fmt(m.mediaBlocoIdentico)} por hora, dentro de uma folga de ${fmtPct(LIMIARES.toleranciaIdentica)}), bem acima da base de ${fmt(m.baseline)}. Um pico orgânico não fica cravado assim. Isso indica entrega mecânica de views.`;
}

function motivoConstante(m: Metricas): string {
  return `As views mal saem do lugar: a variação da série inteira é ${fmtPct(m.cvSerie)}, em torno de ${fmt(m.baseline)} por hora. Sem uma base mais baixa antes ou depois, um gotejamento comprado e uma audiência estável ficam iguais. O classificador não acusa.`;
}

function motivoSemConfirmacao(m: Metricas, j: Julgamento): string {
  const decaimento = j.decaimentoOrganico
    ? ` O que vem depois parece orgânico: o volume desce de forma contínua (aderência ${fmt(m.r2Decaimento ?? 0)} a uma curva de decaimento) ao longo de ${fmt(m.horasDecaimento)} horas.`
    : ' O trecho seguinte não completa o padrão de compra: não há topo cravado nem queda abrupta depois de várias horas no alto.';
  return `A série sai de uma base de cerca de ${fmt(m.baseline)} views por hora e chega a ${fmt(m.pico)} com ${fmtPct(m.fracaoSubidaEm1h)} da subida concentrada em uma hora. Isso, sozinho, parece impulsionamento.${decaimento} Um perfil grande pode ter compartilhado o vídeo de verdade, e um pico de uma hora só também cabe numa live. Sem platô mecânico nem queda abrupta sustentada, o classificador não acusa.`;
}

function motivoOrganico(m: Metricas): string {
  const ciclo =
    m.aderenciaCicloDiario !== null && m.aderenciaCicloDiario >= LIMIARES.aderenciaCicloDiario
      ? ` Por baixo disso, o ciclo de 24 horas ainda aparece, com correlação ${fmt(m.aderenciaCicloDiario)}.`
      : '';
  return `O pico de ${fmt(m.pico)} views é cerca de ${fmt(m.razaoPicoBaseline)} vezes a base de ${fmt(m.baseline)}, então o volume realmente estourou. A subida não acontece de uma vez: a maior hora concentra ${fmtPct(m.fracaoSubidaEm1h)} do caminho, e a passagem de 20% a 80% da subida leva ${fmt(m.horasDeRampa)} horas. Depois o volume desce aos poucos, com aderência ${fmt(m.r2Decaimento ?? 0)} a uma curva de decaimento, sem topo cravado e sem perder ${fmtPct(LIMIARES.quedaAbruptaFracao)} do pico numa hora só. É o formato de alcance orgânico.${ciclo}`;
}

function motivoTranquilo(m: Metricas, j: Julgamento): string {
  const ciclo =
    m.aderenciaCicloDiario !== null
      ? ` A correlação com o ciclo de 24 horas é ${fmt(m.aderenciaCicloDiario)}.`
      : '';
  if (j.picoNotavel) {
    return `Há um pico de ${fmt(m.pico)} views (cerca de ${fmt(m.razaoPicoBaseline)} vezes a base de ${fmt(m.baseline)}), mas a maior hora concentra só ${fmtPct(m.fracaoSubidaEm1h)} da subida. Não há topo mecânico, queda abrupta nem bloco repetido. Sem o desenho de alcance comprado, a série é tratada como legítima.${ciclo}`;
  }
  return `A série fica em torno de ${fmt(m.baseline)} views por hora e o pico de ${fmt(m.pico)} não chega a ${fmt(LIMIARES.razaoPicoNotavel)} vezes a base (a razão é ${fmt(m.razaoPicoBaseline)}). Não há subida em degrau, topo mecânico, queda abrupta nem repetição de bloco.${ciclo} A variação é compatível com audiência orgânica.`;
}

function motivoMisturado(m: Metricas): string {
  return `Os sinais não fecham um diagnóstico. A razão entre o pico de ${fmt(m.pico)} e a base de ${fmt(m.baseline)} é ${fmt(m.razaoPicoBaseline)}, a maior hora concentra ${fmtPct(m.fracaoSubidaEm1h)} da subida e a maior perda numa hora é ${fmtPct(m.quedaAbrupta)} do pico. Como o padrão fica no meio do caminho, o classificador não acusa.`;
}

function montarSinais(m: Metricas, j: Julgamento): Sinal[] {
  return [
    sinal(
      'horas_observadas',
      'Quantidade de horas na série. Abaixo do limiar, o recorte é curto demais para acusar.',
      m.horas,
      LIMIARES.horasMinimas,
      m.horas < LIMIARES.horasMinimas,
    ),
    sinal(
      'baseline_views',
      'Base típica: mediana das horas mais baixas (as 40% menores). É o volume “normal” contra o qual o pico é comparado.',
      m.baseline,
      null,
      false,
    ),
    sinal(
      'pico_views',
      'Maior valor da série, em views naquela hora.',
      m.pico,
      null,
      false,
    ),
    sinal(
      'razao_pico_baseline',
      'Pico dividido pela base. Cruzar o limiar só diz que houve um estouro; não diz se ele foi comprado.',
      m.razaoPicoBaseline,
      LIMIARES.razaoPicoNotavel,
      j.picoNotavel,
    ),
    sinal(
      'fracao_subida_em_1h',
      'Fatia da subida (do nível da base até o pico) que cabe na maior diferença entre duas horas seguidas. Perto de 100%, a série sobe em degrau.',
      m.fracaoSubidaEm1h,
      LIMIARES.fracaoSubidaDegrau,
      m.fracaoSubidaEm1h >= LIMIARES.fracaoSubidaDegrau,
    ),
    sinal(
      'horas_de_rampa',
      'Horas para ir de 20% a 80% da subida até o pico. Rampa curta, junto com a fração acima, caracteriza degrau.',
      m.horasDeRampa,
      LIMIARES.horasRampaCurta,
      m.horasDeRampa <= LIMIARES.horasRampaCurta,
    ),
    sinal(
      'duracao_plato_horas',
      'Horas consecutivas dentro de 5% do pico. Um estouro orgânico passa rápido por esse topo; um pacote comprado fica nele.',
      m.duracaoPlato,
      LIMIARES.duracaoPlatoMinHoras,
      m.duracaoPlato >= LIMIARES.duracaoPlatoMinHoras,
    ),
    sinal(
      'cv_plato',
      'Variação relativa dentro do topo. Valor baixo significa views cravadas, quase sem oscilar.',
      m.cvPlato,
      LIMIARES.cvPlatoMecanico,
      m.cvPlato <= LIMIARES.cvPlatoMecanico,
    ),
    sinal(
      'declinio_no_plato',
      'Quanto o topo perde do início ao fim da janela perto do pico. Perto de zero, o topo está parado; negativo, ainda está subindo.',
      m.declinioPlato,
      LIMIARES.declinioMaxPlato,
      m.declinioPlato <= LIMIARES.declinioMaxPlato,
    ),
    sinal(
      'queda_abrupta_fracao',
      'Maior perda numa única hora, como fração do pico, saindo de um nível ainda alto (pelo menos 70% do pico).',
      m.quedaAbrupta,
      LIMIARES.quedaAbruptaFracao,
      m.quedaAbrupta >= LIMIARES.quedaAbruptaFracao,
    ),
    sinal(
      'horas_sustentadas_antes_da_queda',
      'Quantas horas seguidas o volume ficou alto imediatamente antes dessa queda. Uma hora isolada não basta para acusar.',
      m.horasSustentadasAntesDaQueda,
      LIMIARES.sustentacaoMinAntesQueda,
      m.horasSustentadasAntesDaQueda >= LIMIARES.sustentacaoMinAntesQueda,
    ),
    sinal(
      'r2_decaimento_exponencial',
      'Aderência do trecho depois do pico a uma descida contínua. Dispara só quando o valor passa do limiar, a curva desce e nenhuma hora desse trecho cai mais que 45% em relação à anterior.',
      m.r2Decaimento,
      LIMIARES.r2DecaimentoOrganico,
      j.decaimentoOrganico,
    ),
    sinal(
      'maior_queda_relativa_entre_horas',
      'Maior tombo de uma hora para a seguinte dentro do trecho de decaimento, relativo à hora anterior. Um decaimento orgânico não despenca.',
      m.maiorQuedaRelativa,
      LIMIARES.maiorQuedaRelativaOrganica,
      m.maiorQuedaRelativa > LIMIARES.maiorQuedaRelativaOrganica,
    ),
    sinal(
      'repeticao_lag_horas',
      'Intervalo, em horas, do bloco repetido mais parecido com ele mesmo. Vazio quando a série é curta demais para procurar ciclos.',
      m.repeticaoLag,
      null,
      false,
    ),
    sinal(
      'repeticao_autocorr',
      'Autocorrelação no intervalo acima. Alta significa que o passado da série parece uma cópia do trecho seguinte.',
      m.repeticaoAutocorr,
      LIMIARES.autocorrRepeticao,
      m.repeticaoAutocorr >= LIMIARES.autocorrRepeticao,
    ),
    sinal(
      'repeticao_mape',
      'Diferença média entre os ciclos e o ciclo médio, relativa ao nível do bloco. Baixa significa cópia mecânica.',
      m.repeticaoMape,
      LIMIARES.mapeRepeticao,
      m.repeticaoMape <= LIMIARES.mapeRepeticao,
    ),
    sinal(
      'repeticao_amplitude',
      'Pico dividido pelo patamar baixo (percentil 10). Repetição só importa quando o bloco realmente sobe e desce.',
      m.repeticaoAmplitude,
      LIMIARES.amplitudeRepeticao,
      m.repeticaoAmplitude >= LIMIARES.amplitudeRepeticao,
    ),
    sinal(
      'repeticao_contraste',
      'Dentro do bloco médio, razão entre a hora mais alta e a mais baixa. Um bloco plano não conta como rajada repetida.',
      m.repeticaoContraste,
      LIMIARES.contrasteBloco,
      m.repeticaoContraste >= LIMIARES.contrasteBloco,
    ),
    sinal(
      'horas_quase_identicas',
      'Horas do bloco quase igual de maior nível (dentro de 3% do primeiro valor). A base plana não entra no lugar de um platô alto.',
      m.horasQuaseIdenticas,
      LIMIARES.horasQuaseIdenticas,
      m.horasQuaseIdenticas >= LIMIARES.horasQuaseIdenticas,
    ),
    sinal(
      'aderencia_ciclo_diario',
      'Correlação com o perfil médio de cada hora do dia. Ciclo diário com variação natural é sinal de audiência orgânica, não de fraude.',
      m.aderenciaCicloDiario,
      LIMIARES.aderenciaCicloDiario,
      m.aderenciaCicloDiario !== null && m.aderenciaCicloDiario >= LIMIARES.aderenciaCicloDiario,
    ),
    sinal(
      'cv_serie',
      'Variação da série inteira. Abaixo do limiar, o volume é quase constante e falta contraste para decidir.',
      m.cvSerie,
      LIMIARES.cvSerieConstante,
      m.cvSerie <= LIMIARES.cvSerieConstante,
    ),
    sinal(
      'formato_comprado',
      'Combinação que acusa: pico alto, subida em degrau, platô mecânico ou queda abrupta sustentada, e decaimento que não é contínuo.',
      j.formatoComprado ? 1 : 0,
      1,
      j.formatoComprado,
    ),
    sinal(
      'repeticao_mecanica',
      'Combinação que acusa: bloco de poucas horas que se repete com autocorrelação alta, pouca diferença entre ciclos e amplitude grande.',
      j.repeticaoMecanica ? 1 : 0,
      1,
      j.repeticaoMecanica,
    ),
    sinal(
      'bloco_cravado',
      'Combinação que acusa: seis horas ou mais quase no mesmo número, num patamar pelo menos quatro vezes acima da base.',
      j.blocoCravado ? 1 : 0,
      1,
      j.blocoCravado,
    ),
    sinal(
      'pico_organico',
      'Combinação que inocenta um estouro: pico alto, subida espalhada em várias horas e decaimento contínuo, sem platô nem queda abrupta.',
      j.picoOrganico ? 1 : 0,
      1,
      j.picoOrganico,
    ),
  ];
}

function sinal(
  nome: string,
  descricao: string,
  valor: number | null,
  limiar: number | null,
  disparou: boolean,
): Sinal {
  return {
    nome,
    descricao,
    valor: arredondarSinal(valor),
    limiar,
    disparou,
  };
}
