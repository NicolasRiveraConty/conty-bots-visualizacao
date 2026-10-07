export type Classificacao = 'legitimo' | 'suspeito' | 'inconclusivo';

export type RotuloDataset = 'legitimo' | 'suspeito';

export type Sinal = {
  nome: string;
  descricao: string;
  valor: number | null;
  limiar: number | null;
  disparou: boolean;
};

export type ResultadoClassificacao = {
  classificacao: Classificacao;
  motivo: string;
  sinais: Sinal[];
};

export type Amostra = {
  id: string;
  cenario: string;
  descricao: string;
  rotulo: RotuloDataset;
  views: number[];
};

export type Dataset = {
  seed: number;
  descricao: string;
  amostras: Amostra[];
};
