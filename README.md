# Desafio de Teste — Dominó

Casos de teste em **JavaScript (Jest)** para uma **partida de Dominó para 2 jogadores**.
Desenvolvido com TDD: primeiro os testes (commit `test:`, falhando), depois a implementação
(commit `feat:`).

## Colaborador

- **Gustavo Fumagalli** — [@gufuba](https://github.com/gufuba)

## Especificação do desafio

- Casos de teste para testar **uma partida para 02 jogadores**.
- Casos de teste em **JavaScript** para testar **JavaScript**.

### Regras implementadas

| Item | Decisão |
|---|---|
| Peças | **28 peças** (duplo-seis), de `[0,0]` a `[6,6]`; 168 pontos no total |
| Distribuição | Cada jogador recebe **7 peças**; as **14 restantes** formam o **monte** |
| Abertura | Abre quem tem o **maior carretão** (dupla); sem duplas nas mãos, a peça de **maior soma** (empate: maior lado). A abertura é jogada automaticamente e a vez passa ao adversário |
| Jogada | Encaixar uma peça em uma ponta da mesa (`esquerda` ou `direita`); a peça é girada se necessário |
| Sem jogada | O jogador **compra** do monte (a primeira peça); com o monte vazio e sem jogada, **passa** a vez |
| Batida | Quem jogar a última peça vence e ganha os **pontos da mão do adversário** |
| Jogo travado | Os dois jogadores passam em seguida: vence quem tem **menos pontos** na mão e ganha a **diferença**; pontos iguais = empate (`vencedor = null`) |

## Como executar

```bash
npm install
npm test        # roda os testes com relatório de cobertura (exige 100%)
```

Requer Node.js 18 ou superior.

## Estrutura

```text
src/domino.js            # classe Domino e pecasDoDomino()
tests/domino.test.js     # casos de teste (Jest)
tests/helpers.js         # gerador pseudoaleatório com semente
```

### API usada pelos testes

```js
const jogo = new Domino();                  // sorteia, distribui e faz a abertura
jogo.jogadas(jogador);                      // [{ peca, lado }] que encaixam na mesa
jogo.jogar(jogador, [4, 5], 'direita');     // joga uma peça
jogo.comprar(jogador);                      // compra do monte (só sem jogada)
jogo.passar(jogador);                       // passa a vez (só sem jogada e com o monte vazio)
jogo.mao(jogador);  jogo.monte;  jogo.mesa;  jogo.pontasDaMesa();  jogo.pontosNaMao(jogador);
jogo.estado;   // 'jogando' | 'fim'
jogo.vez;  jogo.vencedor;  jogo.motivo;  jogo.pontos;
```

Para tornar os testes **determinísticos** o construtor aceita:

```js
new Domino({ aleatorio: minhaFuncao });                  // sorteio com semente
new Domino({ pecasEmbaralhadas: [...28 peças...] });     // 7 (J1) + 7 (J2) + monte
new Domino({ situacao: { mesa, maos: [m1, m2], monte, vez } });  // retoma uma partida em andamento
```

## Funcionamento dos casos de teste

55 testes, organizados em grupos (`describe`):

| Grupo | O que verifica |
|---|---|
| **As peças do dominó** | 28 peças distintas de `[0,0]` a `[6,6]`; total de 168 pontos; a função devolve cópia. |
| **Distribuição das peças** | 7 peças para cada jogador e 14 no monte (13 nas mãos após a abertura); sem repetição em 30 sementes; mesma semente = mesma distribuição; `Math.random`; ordem fixa; rejeição de distribuição inválida (menos de 28, repetidas, peça inválida, não é lista). |
| **Abertura da partida** | Maior carretão abre (jogador 1 e jogador 2); sem carretões, abre a peça de maior soma; empate de soma resolve pelo maior lado; a vez passa ao adversário. |
| **Jogadas possíveis** | Peças que encaixam em cada ponta; peça que encaixa nas duas pontas gera uma jogada por lado; nenhuma jogada quando nada encaixa. |
| **Jogar uma peça** | Encaixe à direita e à esquerda; peça girada e aceita nos dois sentidos; a peça sai da mão e a vez passa; partida em várias jogadas com a corrente crescendo pelas duas pontas; rejeita peça fora da mão, em formato inválido, que não encaixa, lado inválido, jogador fora da vez e jogador inválido. |
| **Comprar do monte** | Sem jogada, compra a primeira peça e mantém a vez; pode jogar a peça comprada; não compra com jogada disponível, com monte vazio nem fora da vez. |
| **Passar a vez** | Só passa sem jogada e com o monte vazio; rejeita passar com jogada disponível, com peças no monte ou fora da vez. |
| **Fim da partida: batida** | Vencedor, motivo e pontos (soma da mão do adversário) para os dois jogadores; nada é permitido depois do fim. |
| **Fim da partida: jogo travado** | Dois passes seguidos travam o jogo; vence quem tem menos pontos e ganha a diferença; empate sem vencedor; uma jogada entre dois passes evita o travamento. |
| **Situação e pontos** | `pontosNaMao`; `mao`/`monte`/`mesa` devolvem cópias; rejeição de situações inválidas. |
| **Partidas completas** | 60 partidas automáticas (sementes diferentes) terminam; as 28 peças permanecem distintas a cada jogada e a corrente da mesa é sempre válida; em toda batida o vencedor fica sem peças e os pontos são os da mão do adversário. |

**Cobertura:** `jest.coverageThreshold` exige **100 %** de instruções, ramos, funções e linhas;
o `npm test` falha se a cobertura cair. O workflow do GitHub Actions
(`.github/workflows/testes.yml`) roda os testes a cada push.
