# Classificador de alcance

API que lê uma série de **views por hora** e diz se o desenho parece alcance orgânico, alcance suspeito (pico comprado ou repetição mecânica) ou se é melhor não acusar. A decisão é uma combinação de regras. Não há modelo opaco e não há dado de rede social.

## Por onde começar

1. Este README: o critério, os limiares e a taxa medida.
2. [`test/pico-organico-vs-comprado.test.ts`](test/pico-organico-vs-comprado.test.ts): o mesmo tipo de estouro cai em baldes diferentes.
3. [`test/inconclusivo.test.ts`](test/inconclusivo.test.ts): o caso em que o classificador prefere não acusar.
4. [`src/classificador/classificar.ts`](src/classificador/classificar.ts): a regra, em português, ao lado dos limiares de [`src/limiares.ts`](src/limiares.ts).
5. [`data/avaliacao.json`](data/avaliacao.json): a matriz medida na seed 42.

## Como rodar

Requer Node 22+.

```bash
npm install
npm test
npm run avaliar
npm start
```

`npm run generate` reescreve `data/dataset.json`. Com a seed **42** o arquivo sai idêntico ao que está no repositório. `npm run avaliar` reescreve `data/avaliacao.json` e imprime a matriz.

A API sobe em `http://localhost:3000`.

```bash
curl -s localhost:3000/classificar \
  -H 'content-type: application/json' \
  -d '{"views":[100,100,100,100,100,100,8000,8000,8000,8000,8000,8000,100,100,100,100]}'
```

Essa série (base, seis horas cravadas em 8.000 e queda) responde `suspeito`. Com menos de 12 horas a mesma forma fica `inconclusivo`: o recorte é curto demais para acusar.

Corpo: `{ "views": [número por hora, ...] }`. Cada item é um número finito ≥ 0. No máximo 504 horas (21 dias). Resposta:

```json
{
  "classificacao": "legitimo | suspeito | inconclusivo",
  "motivo": "texto em português, com os números da série",
  "sinais": [
    { "nome": "razao_pico_baseline", "descricao": "...", "valor": 80, "limiar": 5, "disparou": true }
  ]
}
```

`GET /health` e `GET /limiares` devolvem o estado e a tabela numérica. `disparou: true` num sinal isolado só quer dizer que aquele limiar foi cruzado. A acusação está em `formato_comprado`, `repeticao_mecanica` ou `bloco_cravado`.

## Critério

A base é a mediana das 40% horas mais baixas. O pico é o máximo. Nenhum número sozinho condena o criador.

**Suspeito** só nestes casos:

- **Formato comprado:** o pico é pelo menos 5 vezes a base, uma hora concentra pelo menos 70% da subida (e a passagem de 20% a 80% leva no máximo 2 horas), e além disso há platô mecânico ou queda abrupta. O trecho depois do pico não pode parecer um decaimento contínuo.
- **Repetição mecânica:** um bloco de 3 a 18 horas se repete por pelo menos 4 ciclos, com autocorrelação ≥ 0,9, diferença média ≤ 10%, médias dos ciclos quase iguais (CV ≤ 0,08), amplitude ≥ 4 e contraste dentro do bloco ≥ 2,5.
- **Bloco cravado:** 6 horas ou mais dentro de 3% do mesmo número, num patamar pelo menos 4 vezes acima da base.

**Legítimo** quando o pico alto sobe ao longo de várias horas e desce contínuo, sem platô e sem queda abrupta; ou quando simplesmente não aparece nenhum desses três ataques (série estável, crescimento, ciclo diário).

**Inconclusivo** — o classificador não acusa — quando a série tem menos de 12 horas, quando é quase constante (CV ≤ 0,02, sem contraste com uma base) ou quando a subida é em degrau mas não há platô nem queda sustentada.

Platô mecânico exige, ao mesmo tempo, pico notável, pelo menos 4 horas dentro de 5% do pico, CV ≤ 0,08 e topo parado (perda de no máximo 6%, e sem estar subindo). A crista de um ciclo diário fica algumas horas perto do próprio máximo, mas a razão pico/base fica perto de 2, abaixo de 5, então não entra.

Queda abrupta é perder pelo menos 60% do pico numa hora, saindo de um nível que já estava alto (70% do pico) por pelo menos 3 horas. Um pico de uma hora só não sustenta essa conta.

Decaimento orgânico é aderência ≥ 0,75 a uma curva que desce, com nenhuma hora caindo mais que 45% em relação à anterior. Um R² alto com um tombo no meio não conta.

## Resultados medidos

Dataset sintético, seed 42, 134 séries (98 com rótulo legítimo, 36 com rótulo suspeito). Medido por `npm run avaliar` em `data/avaliacao.json`. Falso positivo aqui é **rótulo legítimo classificado como suspeito**, dividido pelos legítimos.

| Rótulo | Legítimo | Suspeito | Inconclusivo |
| --- | ---: | ---: | ---: |
| legítimo (98) | 80 | 0 | 18 |
| suspeito (36) | 0 | 36 | 0 |

**Taxa de falso positivo medida: 0 / 98 = 0%.**

Nenhum suspeito foi chamado de legítimo e nenhum suspeito ficou inconclusivo. Os 18 inconclusivos são todos rótulos legítimos em que a regra prefere não acusar: 10 `ignicao_rapida` e 8 `flash_uma_hora`. Nos outros cenários legítimos (ciclo diário, série estável, crescimento, declínio, pico orgânico, pico orgânico rápido, dois picos) as 80 séries foram todas legítimas. Os 36 suspeitos (`pico_comprado`, `plato_longo`, `repeticao_mecanica`) foram todos suspeitos.

## Caso em que prefere não acusar

`serieIgnicaoRapida` em [`src/casos/canonicos.ts`](src/casos/canonicos.ts), coberto por [`test/inconclusivo.test.ts`](test/inconclusivo.test.ts).

A série sai de 120 views por hora e vai a 10.000 na hora seguinte (100% da subida numa hora — o limiar do degrau é 70%). Depois desce como uma curva contínua, com aderência 1 ao decaimento, sem ficar 4 horas no topo e sem perder 60% do pico de uma vez. Isso cabe num vídeo que um perfil grande compartilhou de verdade. O classificador devolve `inconclusivo` e o motivo diz que não acusa.

O pico orgânico do teste ao lado também é cerca de 100 vezes a base, mas a maior hora concentra 18,4% da subida e a rampa de 20% a 80% leva 3 horas, com decaimento contínuo: `legitimo`. O retângulo comprado (base 100, seis horas em 8.000, queda na hora seguinte) é `suspeito`. Os dois passam de 5 vezes a base; o balde muda pelo formato, não pela altura.

## O que não detecta

- Compra que imita rampa e decaimento contínuo, com ruído parecido com audiência. Sem degrau, platô ou repetição, não acusamos.
- Subida instantânea seguida de decaimento bonito. Fica inconclusivo de propósito: o custo de punir um estouro real é alto.
- Pico de uma hora (live, story, buraco de medição). Não há horas suficientes no alto para sustentar uma queda abrupta.
- Série já cortada no meio do pico, sem a base antes, quando o pedaço que sobrou não repete nem crava.
- Volume comprado baixo e espalhado, com razão pico/base abaixo de 5 e sem bloco repetido.
- Série quase constante. Pode ser audiência estável ou gotejamento sem contraste; a resposta é inconclusivo.
- Qualquer coisa que não esteja na série horária: comentários, retenção, origem, várias contas ao mesmo tempo.
- Menos de 12 horas de dados.

Correlação alta com o ciclo de 24 horas não absolve. A repetição de 6 horas do teste casa com o relógio diário (aderência 1) e ainda assim é suspeita, porque o bloco copiado é mais curto que um dia e quase idêntico entre ciclos.

## Dataset

`data/dataset.json` é a saída de `gerarDataset(42)` (`src/dataset/gerar.ts`), com gerador mulberry32. Cada amostra tem `id`, `cenario`, `descricao`, `rotulo` (`legitimo` ou `suspeito`) e `views`. O rótulo da ignição rápida e do flash é legítimo: são criadores honestos com um formato ambíguo, e o comportamento esperado do classificador é não acusar.

## Uso de IA

O código deste repositório foi gerado por um agente de IA (Cursor). Os números da matriz e a taxa de falso positivo não foram estimados pelo modelo: saem de `npm run avaliar` sobre o dataset da seed 42, e o teste `dataset.test.ts` confere esse arquivo.

Revisado por Nicolas: [preencher]
