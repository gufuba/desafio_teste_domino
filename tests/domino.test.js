const { Domino, pecasDoDomino } = require('../src/domino');
const { aleatorioComSemente } = require('./helpers');

const chave = ([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`;
const somaDePontos = (pecas) => pecas.reduce((soma, [a, b]) => soma + a + b, 0);

// Monta a ordem de distribuicao: 7 pecas para o jogador 1, 7 para o jogador 2 e o restante (monte).
function baralho(maoUm, maoDois) {
  const usadas = new Set([...maoUm, ...maoDois].map(chave));
  const resto = pecasDoDomino().filter((p) => !usadas.has(chave(p)));
  return [...maoUm, ...maoDois, ...resto];
}

// Partida em um estado escolhido (mesa, maos, monte e jogador da vez), sem sorteio.
function situacao({ mesa, maos, monte = [], vez = 1 }) {
  return new Domino({ situacao: { mesa, maos, monte, vez } });
}

// Jogador automatico: joga a primeira jogada possivel, compra se nao ha jogada, passa se o monte acabou.
function jogarPartidaCompleta(jogo) {
  let passos = 0;
  while (jogo.estado === 'jogando') {
    passos++;
    if (passos > 1000) throw new Error('a partida nao terminou');
    const jogador = jogo.vez;
    const jogadas = jogo.jogadas(jogador);
    if (jogadas.length > 0) jogo.jogar(jogador, jogadas[0].peca, jogadas[0].lado);
    else if (jogo.monte.length > 0) jogo.comprar(jogador);
    else jogo.passar(jogador);
    verificarIntegridade(jogo);
  }
}

// As 28 pecas continuam todas distintas (maos + monte + mesa) e a mesa forma uma corrente valida.
function verificarIntegridade(jogo) {
  const todas = [...jogo.mao(1), ...jogo.mao(2), ...jogo.monte, ...jogo.mesa];
  expect(todas).toHaveLength(28);
  expect(new Set(todas.map(chave)).size).toBe(28);
  const mesa = jogo.mesa;
  for (let i = 0; i < mesa.length - 1; i++) expect(mesa[i][1]).toBe(mesa[i + 1][0]);
}

describe('As pecas do domino', () => {
  test('existem 28 pecas distintas, de [0,0] a [6,6]', () => {
    const pecas = pecasDoDomino();
    expect(pecas).toHaveLength(28);
    expect(new Set(pecas.map(chave)).size).toBe(28);
    pecas.forEach(([a, b]) => {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(6);
      expect(a).toBeLessThanOrEqual(b);
    });
  });

  test('o total de pontos do jogo e 168', () => {
    expect(somaDePontos(pecasDoDomino())).toBe(168);
  });

  test('devolve uma copia: alterar o resultado nao altera as pecas do jogo', () => {
    const pecas = pecasDoDomino();
    pecas.pop();
    expect(pecasDoDomino()).toHaveLength(28);
  });
});

describe('Distribuicao das pecas (2 jogadores)', () => {
  test('cada jogador recebe 7 pecas e o monte fica com 14', () => {
    const jogo = new Domino({ aleatorio: aleatorioComSemente(1) });
    // a abertura ja tirou 1 peca da mao de um dos jogadores
    expect(jogo.mao(1).length + jogo.mao(2).length).toBe(13);
    expect(jogo.monte).toHaveLength(14);
    expect(jogo.mesa).toHaveLength(1);
    verificarIntegridade(jogo);
  });

  test('sem repeticao de pecas para varias sementes', () => {
    for (let semente = 1; semente <= 30; semente++) {
      verificarIntegridade(new Domino({ aleatorio: aleatorioComSemente(semente) }));
    }
  });

  test('a mesma semente gera a mesma distribuicao e sementes diferentes geram distribuicoes diferentes', () => {
    const gerar = (s) => JSON.stringify(new Domino({ aleatorio: aleatorioComSemente(s) }).mao(1));
    expect(gerar(4)).toBe(gerar(4));
    expect(gerar(4)).not.toBe(gerar(5));
  });

  test('funciona com o gerador aleatorio padrao (Math.random)', () => {
    verificarIntegridade(new Domino());
  });

  test('aceita uma ordem de distribuicao fixa: 7 pecas para cada jogador, depois o monte', () => {
    const maoUm = [[6, 6], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6]];
    const maoDois = [[1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [2, 2]];
    const jogo = new Domino({ pecasEmbaralhadas: baralho(maoUm, maoDois) });
    expect(jogo.mao(2)).toEqual(maoDois);
    expect(jogo.mao(1)).toEqual(maoUm.slice(1)); // [6,6] foi a abertura
    expect(jogo.monte).toHaveLength(14);
  });

  test.each([
    ['menos de 28 pecas', () => pecasDoDomino().slice(0, 27)],
    ['pecas repetidas', () => [...pecasDoDomino().slice(0, 27), [0, 0]]],
    ['peca invalida', () => [...pecasDoDomino().slice(0, 27), [7, 7]]],
    ['nao e uma lista', () => 'domino'],
  ])('rejeita ordem de distribuicao invalida: %s', (_nome, criar) => {
    expect(() => new Domino({ pecasEmbaralhadas: criar() })).toThrow(RangeError);
  });
});

describe('Abertura da partida', () => {
  test('quem tem o maior carretao (dupla) abre a partida: [6,6] com o jogador 1', () => {
    const maoUm = [[6, 6], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 2]];
    const maoDois = [[5, 5], [1, 3], [1, 4], [1, 5], [2, 3], [2, 4], [2, 5]];
    const jogo = new Domino({ pecasEmbaralhadas: baralho(maoUm, maoDois) });
    expect(jogo.mesa).toEqual([[6, 6]]);
    expect(jogo.mao(1)).toHaveLength(6);
    expect(jogo.vez).toBe(2);
    expect(jogo.estado).toBe('jogando');
  });

  test('o jogador 2 abre quando tem o maior carretao', () => {
    const maoUm = [[4, 4], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 2]];
    const maoDois = [[5, 5], [1, 3], [1, 4], [1, 5], [2, 3], [2, 4], [2, 6]];
    const jogo = new Domino({ pecasEmbaralhadas: baralho(maoUm, maoDois) });
    expect(jogo.mesa).toEqual([[5, 5]]);
    expect(jogo.mao(2)).toHaveLength(6);
    expect(jogo.vez).toBe(1);
  });

  test('sem carretoes nas maos, abre quem tem a peca de maior soma', () => {
    const maoUm = [[5, 6], [0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
    const maoDois = [[4, 6], [0, 4], [0, 5], [1, 4], [1, 5], [2, 4], [2, 5]];
    const jogo = new Domino({ pecasEmbaralhadas: baralho(maoUm, maoDois) });
    expect(jogo.mesa).toEqual([[5, 6]]);
    expect(jogo.vez).toBe(2);
  });

  test('em caso de empate na soma, abre a peca com o maior lado', () => {
    const maoUm = [[4, 5], [0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
    const maoDois = [[3, 6], [0, 4], [0, 5], [1, 4], [1, 5], [2, 4], [2, 5]];
    const jogo = new Domino({ pecasEmbaralhadas: baralho(maoUm, maoDois) });
    expect(jogo.mesa).toEqual([[3, 6]]);
    expect(jogo.vez).toBe(1);
  });
});

describe('Jogadas possiveis', () => {
  test('lista as pecas que encaixam em cada ponta da mesa', () => {
    const jogo = situacao({
      mesa: [[3, 4]],
      maos: [[[4, 5], [2, 3], [0, 0]], [[1, 1]]],
    });
    expect(jogo.pontasDaMesa()).toEqual([3, 4]);
    const jogadas = jogo.jogadas(1);
    expect(jogadas).toContainEqual({ peca: [4, 5], lado: 'direita' });
    expect(jogadas).toContainEqual({ peca: [2, 3], lado: 'esquerda' });
    expect(jogadas).toHaveLength(2);
  });

  test('uma peca que encaixa nas duas pontas gera uma jogada para cada lado', () => {
    const jogo = situacao({ mesa: [[3, 3]], maos: [[[3, 5]], [[1, 1]]] });
    expect(jogo.jogadas(1)).toEqual([
      { peca: [3, 5], lado: 'esquerda' },
      { peca: [3, 5], lado: 'direita' },
    ]);
  });

  test('sem pecas que encaixem, nao ha jogadas', () => {
    const jogo = situacao({ mesa: [[5, 5]], maos: [[[0, 0], [1, 2]], [[3, 4]]] });
    expect(jogo.jogadas(1)).toEqual([]);
  });
});

describe('Jogar uma peca', () => {
  test('a peca encaixa na ponta direita com o lado igual voltado para a mesa', () => {
    const jogo = situacao({ mesa: [[3, 4]], maos: [[[4, 5], [2, 3]], [[0, 0]]] });
    jogo.jogar(1, [4, 5], 'direita');
    expect(jogo.mesa).toEqual([[3, 4], [4, 5]]);
    expect(jogo.pontasDaMesa()).toEqual([3, 5]);
  });

  test('a peca encaixa na ponta esquerda', () => {
    const jogo = situacao({ mesa: [[3, 4]], maos: [[[2, 3], [4, 5]], [[0, 0]]] });
    jogo.jogar(1, [2, 3], 'esquerda');
    expect(jogo.mesa).toEqual([[2, 3], [3, 4]]);
    expect(jogo.pontasDaMesa()).toEqual([2, 4]);
  });

  test('a peca e girada quando necessario, e pode ser informada nos dois sentidos', () => {
    const direita = situacao({ mesa: [[3, 4]], maos: [[[5, 4], [0, 1]], [[0, 0]]] });
    direita.jogar(1, [5, 4], 'direita'); // o 4 encosta no 4 da mesa
    expect(direita.mesa).toEqual([[3, 4], [4, 5]]);

    const esquerda = situacao({ mesa: [[3, 4]], maos: [[[3, 2], [0, 1]], [[0, 0]]] });
    esquerda.jogar(1, [3, 2], 'esquerda'); // o 3 encosta no 3 da mesa
    expect(esquerda.mesa).toEqual([[2, 3], [3, 4]]);
  });

  test('a peca sai da mao do jogador e a vez passa para o adversario', () => {
    const jogo = situacao({ mesa: [[3, 4]], maos: [[[4, 5], [0, 0]], [[1, 1]]] });
    jogo.jogar(1, [4, 5], 'direita');
    expect(jogo.mao(1)).toEqual([[0, 0]]);
    expect(jogo.vez).toBe(2);
  });

  test('uma partida em varias jogadas: a corrente cresce pelas duas pontas', () => {
    const jogo = situacao({
      mesa: [[6, 6]],
      maos: [[[2, 5], [0, 0], [3, 3]], [[2, 6], [6, 4], [1, 1]]],
      vez: 2,
    });
    jogo.jogar(2, [2, 6], 'direita'); // 6-6 | 6-2
    jogo.jogar(1, [2, 5], 'direita'); // 6-6 | 6-2 | 2-5
    jogo.jogar(2, [6, 4], 'esquerda'); // 4-6 | 6-6 | 6-2 | 2-5
    expect(jogo.mesa).toEqual([[4, 6], [6, 6], [6, 2], [2, 5]]);
    expect(jogo.pontasDaMesa()).toEqual([4, 5]);
  });

  test('rejeita peca que nao esta na mao do jogador', () => {
    const jogo = situacao({ mesa: [[3, 4]], maos: [[[4, 5]], [[0, 0]]] });
    expect(() => jogo.jogar(1, [3, 6], 'direita')).toThrow('Jogada invalida');
  });

  test('rejeita peca que nao encaixa na ponta escolhida', () => {
    const jogo = situacao({ mesa: [[3, 4]], maos: [[[4, 5]], [[0, 0]]] });
    expect(() => jogo.jogar(1, [4, 5], 'esquerda')).toThrow('Jogada invalida');
    expect(jogo.mao(1)).toHaveLength(1);
    expect(jogo.vez).toBe(1);
  });

  test('rejeita lado diferente de esquerda ou direita', () => {
    const jogo = situacao({ mesa: [[3, 4]], maos: [[[4, 5]], [[0, 0]]] });
    expect(() => jogo.jogar(1, [4, 5], 'meio')).toThrow(RangeError);
  });

  test('so o jogador da vez pode jogar', () => {
    const jogo = situacao({ mesa: [[3, 4]], maos: [[[4, 5]], [[4, 4]]] });
    expect(() => jogo.jogar(2, [4, 4], 'direita')).toThrow('Nao e a vez do jogador');
  });

  test('rejeita jogador diferente de 1 ou 2', () => {
    const jogo = situacao({ mesa: [[3, 4]], maos: [[[4, 5]], [[4, 4]]] });
    expect(() => jogo.jogar(3, [4, 5], 'direita')).toThrow(RangeError);
    expect(() => jogo.mao(0)).toThrow(RangeError);
    expect(() => jogo.jogadas('a')).toThrow(RangeError);
    expect(() => jogo.comprar(3)).toThrow(RangeError);
    expect(() => jogo.passar(3)).toThrow(RangeError);
  });
});

describe('Comprar do monte', () => {
  test('sem jogada possivel, o jogador compra a primeira peca do monte', () => {
    const jogo = situacao({
      mesa: [[5, 5]],
      maos: [[[0, 0]], [[1, 1]]],
      monte: [[1, 2], [3, 5]],
    });
    expect(jogo.comprar(1)).toEqual([1, 2]);
    expect(jogo.mao(1)).toEqual([[0, 0], [1, 2]]);
    expect(jogo.monte).toEqual([[3, 5]]);
    expect(jogo.vez).toBe(1); // continua sendo a vez de quem comprou
  });

  test('depois de comprar uma peca que encaixa, o jogador pode joga-la', () => {
    const jogo = situacao({ mesa: [[5, 5]], maos: [[[0, 0]], [[1, 1]]], monte: [[1, 2], [3, 5]] });
    jogo.comprar(1);
    jogo.comprar(1);
    jogo.jogar(1, [3, 5], 'direita');
    expect(jogo.mesa).toEqual([[5, 5], [5, 3]]);
  });

  test('nao pode comprar quem tem jogada disponivel', () => {
    const jogo = situacao({ mesa: [[5, 5]], maos: [[[5, 0]], [[1, 1]]], monte: [[1, 2]] });
    expect(() => jogo.comprar(1)).toThrow('Voce tem jogada disponivel');
  });

  test('nao pode comprar com o monte vazio', () => {
    const jogo = situacao({ mesa: [[5, 5]], maos: [[[0, 0]], [[1, 1]]], monte: [] });
    expect(() => jogo.comprar(1)).toThrow('Monte vazio');
  });

  test('so o jogador da vez pode comprar', () => {
    const jogo = situacao({ mesa: [[5, 5]], maos: [[[0, 0]], [[1, 1]]], monte: [[1, 2]] });
    expect(() => jogo.comprar(2)).toThrow('Nao e a vez do jogador');
  });
});

describe('Passar a vez', () => {
  test('sem jogada e com o monte vazio, o jogador passa a vez', () => {
    const jogo = situacao({ mesa: [[5, 5]], maos: [[[0, 0]], [[5, 1]]], monte: [] });
    jogo.passar(1);
    expect(jogo.vez).toBe(2);
    expect(jogo.estado).toBe('jogando');
  });

  test('nao pode passar quem tem jogada disponivel', () => {
    const jogo = situacao({ mesa: [[5, 5]], maos: [[[5, 0]], [[1, 1]]], monte: [] });
    expect(() => jogo.passar(1)).toThrow('Voce tem jogada disponivel');
  });

  test('nao pode passar enquanto houver pecas no monte (deve comprar)', () => {
    const jogo = situacao({ mesa: [[5, 5]], maos: [[[0, 0]], [[1, 1]]], monte: [[1, 2]] });
    expect(() => jogo.passar(1)).toThrow('Ainda ha pecas no monte');
  });

  test('so o jogador da vez pode passar', () => {
    const jogo = situacao({ mesa: [[5, 5]], maos: [[[0, 0]], [[1, 1]]], monte: [] });
    expect(() => jogo.passar(2)).toThrow('Nao e a vez do jogador');
  });
});

describe('Fim da partida: batida', () => {
  test('quem joga a ultima peca bate e vence com os pontos da mao do adversario', () => {
    const jogo = situacao({
      mesa: [[3, 4]],
      maos: [[[4, 5]], [[0, 0], [1, 1], [2, 3]]],
    });
    jogo.jogar(1, [4, 5], 'direita');
    expect(jogo.estado).toBe('fim');
    expect(jogo.vencedor).toBe(1);
    expect(jogo.motivo).toBe('batida');
    expect(jogo.pontos).toBe(0 + 2 + 5);
    expect(jogo.vez).toBeNull();
  });

  test('o jogador 2 tambem pode bater', () => {
    const jogo = situacao({ mesa: [[3, 4]], maos: [[[0, 1]], [[3, 6]]], vez: 2 });
    jogo.jogar(2, [3, 6], 'esquerda');
    expect(jogo.vencedor).toBe(2);
    expect(jogo.pontos).toBe(1);
  });

  test('depois do fim nao e possivel jogar, comprar nem passar', () => {
    const jogo = situacao({ mesa: [[3, 4]], maos: [[[4, 5]], [[0, 0]]] });
    jogo.jogar(1, [4, 5], 'direita');
    expect(() => jogo.jogar(2, [0, 0], 'direita')).toThrow('Jogo encerrado');
    expect(() => jogo.comprar(2)).toThrow('Jogo encerrado');
    expect(() => jogo.passar(2)).toThrow('Jogo encerrado');
  });
});

describe('Fim da partida: jogo travado', () => {
  test('quando os dois jogadores passam em seguida o jogo trava e vence quem tem menos pontos', () => {
    const jogo = situacao({ mesa: [[3, 4]], maos: [[[0, 1]], [[0, 2], [0, 0]]], monte: [] });
    jogo.passar(1);
    expect(jogo.estado).toBe('jogando');
    jogo.passar(2);
    expect(jogo.estado).toBe('fim');
    expect(jogo.motivo).toBe('travado');
    expect(jogo.vencedor).toBe(1); // 1 ponto contra 2
    expect(jogo.pontos).toBe(2 - 1);
  });

  test('o jogador 2 vence o jogo travado se tiver menos pontos', () => {
    const jogo = situacao({ mesa: [[3, 4]], maos: [[[6, 6]], [[0, 1]]], monte: [] });
    jogo.passar(1);
    jogo.passar(2);
    expect(jogo.vencedor).toBe(2);
    expect(jogo.pontos).toBe(12 - 1);
  });

  test('empate de pontos no jogo travado nao tem vencedor', () => {
    const jogo = situacao({ mesa: [[3, 4]], maos: [[[0, 1]], [[0, 1]]], monte: [] });
    jogo.passar(1);
    jogo.passar(2);
    expect(jogo.estado).toBe('fim');
    expect(jogo.vencedor).toBeNull();
    expect(jogo.pontos).toBe(0);
  });

  test('uma jogada entre dois passes evita o travamento', () => {
    const jogo = situacao({ mesa: [[3, 4]], maos: [[[0, 1]], [[4, 6], [0, 0]]], monte: [] });
    jogo.passar(1);
    jogo.jogar(2, [4, 6], 'direita'); // o jogador 2 consegue jogar
    jogo.passar(1);
    expect(jogo.estado).toBe('jogando');
  });
});

describe('Situacao e pontos', () => {
  test('pontosNaMao soma os pontos das pecas do jogador', () => {
    const jogo = situacao({ mesa: [[3, 4]], maos: [[[6, 6], [0, 1]], [[2, 3]]] });
    expect(jogo.pontosNaMao(1)).toBe(13);
    expect(jogo.pontosNaMao(2)).toBe(5);
  });

  test('mao, monte e mesa devolvem copias', () => {
    const jogo = situacao({ mesa: [[3, 4]], maos: [[[6, 6]], [[2, 3]]], monte: [[0, 0]] });
    jogo.mao(1).pop();
    jogo.monte.pop();
    jogo.mesa.pop();
    expect(jogo.mao(1)).toHaveLength(1);
    expect(jogo.monte).toHaveLength(1);
    expect(jogo.mesa).toHaveLength(1);
  });

  test.each([
    ['sem mesa', { mesa: [], maos: [[[1, 1]], [[2, 2]]], monte: [], vez: 1 }],
    ['maos que nao sao duas', { mesa: [[3, 4]], maos: [[[1, 1]]], monte: [], vez: 1 }],
    ['vez invalida', { mesa: [[3, 4]], maos: [[[1, 1]], [[2, 2]]], monte: [], vez: 3 }],
    ['peca invalida', { mesa: [[3, 9]], maos: [[[1, 1]], [[2, 2]]], monte: [], vez: 1 }],
    ['nao e um objeto', 'situacao'],
  ])('rejeita situacao invalida: %s', (_nome, dados) => {
    expect(() => new Domino({ situacao: dados })).toThrow(RangeError);
  });
});

describe('Partidas completas', () => {
  test('partidas automaticas terminam, mantem as 28 pecas e a corrente de pecas valida', () => {
    for (let semente = 1; semente <= 60; semente++) {
      const jogo = new Domino({ aleatorio: aleatorioComSemente(semente) });
      jogarPartidaCompleta(jogo);
      expect(jogo.estado).toBe('fim');
      expect([1, 2, null]).toContain(jogo.vencedor);
      expect(['batida', 'travado']).toContain(jogo.motivo);
    }
  });

  test('em toda batida o vencedor ficou sem pecas e os pontos sao os da mao do adversario', () => {
    for (let semente = 1; semente <= 60; semente++) {
      const jogo = new Domino({ aleatorio: aleatorioComSemente(semente) });
      jogarPartidaCompleta(jogo);
      if (jogo.motivo === 'batida') {
        const perdedor = jogo.vencedor === 1 ? 2 : 1;
        expect(jogo.mao(jogo.vencedor)).toHaveLength(0);
        expect(jogo.pontos).toBe(jogo.pontosNaMao(perdedor));
      }
    }
  });
});
