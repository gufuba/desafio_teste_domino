'use strict';

const MAIOR_NUMERO = 6;
const TOTAL_DE_PECAS = 28;
const PECAS_POR_JOGADOR = 7;
const LADOS = ['esquerda', 'direita'];

const chave = ([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`;
const soma = (pecas) => pecas.reduce((total, [a, b]) => total + a + b, 0);
const copiar = (pecas) => pecas.map((p) => [...p]);

/** As 28 pecas do domino duplo-seis, de [0,0] a [6,6]. */
function pecasDoDomino() {
  const pecas = [];
  for (let a = 0; a <= MAIOR_NUMERO; a++) {
    for (let b = a; b <= MAIOR_NUMERO; b++) pecas.push([a, b]);
  }
  return pecas;
}

function pecaValida(peca) {
  return Array.isArray(peca) && peca.length === 2
    && peca.every((n) => Number.isInteger(n) && n >= 0 && n <= MAIOR_NUMERO);
}

function listaDePecasValida(lista) {
  return Array.isArray(lista) && lista.every(pecaValida);
}

// Verdadeiro se `a` deve abrir a partida antes de `b`: maior soma; em empate, o maior lado.
function abreAntes(a, b) {
  const [somaA, somaB] = [a[0] + a[1], b[0] + b[1]];
  if (somaA !== somaB) return somaA > somaB;
  return Math.max(...a) > Math.max(...b);
}

/**
 * Partida de domino para 2 jogadores (1 e 2).
 *
 * - 28 pecas: cada jogador recebe 7 e as 14 restantes formam o monte.
 * - Abre a partida (automaticamente) quem tem o maior carretao (dupla); sem duplas nas maos,
 *   quem tem a peca de maior soma (empate: maior lado). Depois da abertura, joga o adversario.
 * - Cada jogada encaixa uma peca em uma ponta da mesa ('esquerda' ou 'direita').
 * - Sem jogada, o jogador compra do monte; com o monte vazio e sem jogada, passa a vez.
 * - Fim: "batida" (um jogador fica sem pecas e ganha os pontos da mao do adversario) ou
 *   "jogo travado" (os dois passam em seguida: vence quem tem menos pontos na mao e ganha a
 *   diferenca; pontos iguais = empate).
 *
 * Opcoes: aleatorio (funcao [0,1)), pecasEmbaralhadas (ordem fixa das 28 pecas: 7 + 7 + monte)
 * e situacao ({ mesa, maos: [maoJ1, maoJ2], monte, vez }) para retomar uma partida em andamento.
 */
class Domino {
  constructor({ aleatorio = Math.random, pecasEmbaralhadas, situacao } = {}) {
    this.estado = 'jogando';
    this.vez = null;
    this.vencedor = null;
    this.motivo = null;
    this.pontos = 0;
    this._passes = 0;

    if (situacao !== undefined) {
      this._carregarSituacao(situacao);
    } else {
      const ordem = pecasEmbaralhadas !== undefined
        ? this._validarOrdem(pecasEmbaralhadas)
        : this._embaralhar(pecasDoDomino(), aleatorio);
      this._distribuir(ordem);
      this._abrir();
    }
  }

  get mesa() {
    return copiar(this._mesa);
  }

  get monte() {
    return copiar(this._monte);
  }

  mao(jogador) {
    this._validarJogador(jogador);
    return copiar(this._maos[jogador]);
  }

  pontosNaMao(jogador) {
    this._validarJogador(jogador);
    return soma(this._maos[jogador]);
  }

  /** Numeros livres nas duas pontas da mesa: [esquerda, direita]. */
  pontasDaMesa() {
    return [this._mesa[0][0], this._mesa[this._mesa.length - 1][1]];
  }

  /** Pecas da mao do jogador que encaixam em cada ponta: [{ peca, lado }]. */
  jogadas(jogador) {
    this._validarJogador(jogador);
    const pontas = this.pontasDaMesa();
    const lista = [];
    this._maos[jogador].forEach((peca) => {
      LADOS.forEach((lado, i) => {
        if (peca.includes(pontas[i])) lista.push({ peca: [...peca], lado });
      });
    });
    return lista;
  }

  jogar(jogador, peca, lado) {
    this._validarVez(jogador);
    if (!LADOS.includes(lado)) throw new RangeError('Lado invalido: use esquerda ou direita');
    const mao = this._maos[jogador];
    const indice = pecaValida(peca) ? mao.findIndex((p) => chave(p) === chave(peca)) : -1;
    if (indice === -1) throw new Error('Jogada invalida');

    const encaixa = this.jogadas(jogador).some((j) => chave(j.peca) === chave(peca) && j.lado === lado);
    if (!encaixa) throw new Error('Jogada invalida');

    const [a, b] = mao.splice(indice, 1)[0];
    if (lado === 'direita') {
      const ponta = this.pontasDaMesa()[1];
      this._mesa.push(a === ponta ? [a, b] : [b, a]);
    } else {
      const ponta = this.pontasDaMesa()[0];
      this._mesa.unshift(b === ponta ? [a, b] : [b, a]);
    }
    this._passes = 0;

    if (mao.length === 0) {
      this._encerrar(jogador, 'batida', this.pontosNaMao(this._adversario(jogador)));
    } else {
      this.vez = this._adversario(jogador);
    }
  }

  /** Sem jogada possivel, compra a primeira peca do monte e a devolve. A vez continua a mesma. */
  comprar(jogador) {
    this._validarVez(jogador);
    if (this.jogadas(jogador).length > 0) throw new Error('Voce tem jogada disponivel');
    if (this._monte.length === 0) throw new Error('Monte vazio');
    const peca = this._monte.shift();
    this._maos[jogador].push(peca);
    return [...peca];
  }

  /** Passa a vez: so e permitido sem jogada possivel e com o monte vazio. */
  passar(jogador) {
    this._validarVez(jogador);
    if (this.jogadas(jogador).length > 0) throw new Error('Voce tem jogada disponivel');
    if (this._monte.length > 0) throw new Error('Ainda ha pecas no monte');

    this._passes++;
    if (this._passes < 2) {
      this.vez = this._adversario(jogador);
      return;
    }
    const [pontosUm, pontosDois] = [this.pontosNaMao(1), this.pontosNaMao(2)];
    let vencedor = null;
    if (pontosUm !== pontosDois) vencedor = pontosUm < pontosDois ? 1 : 2;
    this._encerrar(vencedor, 'travado', Math.abs(pontosUm - pontosDois));
  }

  // ---------------------------------------------------------------- privados

  _validarJogador(jogador) {
    if (jogador !== 1 && jogador !== 2) throw new RangeError('Jogador invalido: use 1 ou 2');
  }

  _validarVez(jogador) {
    this._validarJogador(jogador);
    if (this.estado === 'fim') throw new Error('Jogo encerrado');
    if (this.vez !== jogador) throw new Error('Nao e a vez do jogador');
  }

  _adversario(jogador) {
    return jogador === 1 ? 2 : 1;
  }

  _encerrar(vencedor, motivo, pontos) {
    this.estado = 'fim';
    this.vez = null;
    this.vencedor = vencedor;
    this.motivo = motivo;
    this.pontos = pontos;
  }

  _validarOrdem(ordem) {
    const valida = listaDePecasValida(ordem)
      && ordem.length === TOTAL_DE_PECAS
      && new Set(ordem.map(chave)).size === TOTAL_DE_PECAS;
    if (!valida) throw new RangeError('A distribuicao deve conter as 28 pecas, sem repeticao');
    return ordem;
  }

  // Embaralhamento de Fisher-Yates.
  _embaralhar(pecas, aleatorio) {
    const lista = [...pecas];
    for (let i = lista.length - 1; i > 0; i--) {
      const j = Math.floor(aleatorio() * (i + 1));
      [lista[i], lista[j]] = [lista[j], lista[i]];
    }
    return lista;
  }

  _distribuir(ordem) {
    const pecas = copiar(ordem);
    this._maos = {
      1: pecas.slice(0, PECAS_POR_JOGADOR),
      2: pecas.slice(PECAS_POR_JOGADOR, 2 * PECAS_POR_JOGADOR),
    };
    this._monte = pecas.slice(2 * PECAS_POR_JOGADOR);
    this._mesa = [];
  }

  // Abre com o maior carretao (ou a maior peca): joga a peca automaticamente e passa a vez.
  _abrir() {
    const candidatas = [1, 2].flatMap((jogador) => this._maos[jogador].map((peca) => ({ jogador, peca })));
    const duplas = candidatas.filter(({ peca }) => peca[0] === peca[1]);
    const grupo = duplas.length > 0 ? duplas : candidatas;
    const escolhida = grupo.reduce((melhor, atual) => (abreAntes(atual.peca, melhor.peca) ? atual : melhor));

    const mao = this._maos[escolhida.jogador];
    mao.splice(mao.findIndex((p) => chave(p) === chave(escolhida.peca)), 1);
    this._mesa = [[...escolhida.peca]];
    this.vez = this._adversario(escolhida.jogador);
  }

  _carregarSituacao(situacao) {
    const valida = typeof situacao === 'object' && situacao !== null
      && listaDePecasValida(situacao.mesa) && situacao.mesa.length > 0
      && Array.isArray(situacao.maos) && situacao.maos.length === 2 && situacao.maos.every(listaDePecasValida)
      && listaDePecasValida(situacao.monte)
      && (situacao.vez === 1 || situacao.vez === 2);
    if (!valida) throw new RangeError('Situacao invalida');

    this._mesa = copiar(situacao.mesa);
    this._maos = { 1: copiar(situacao.maos[0]), 2: copiar(situacao.maos[1]) };
    this._monte = copiar(situacao.monte);
    this.vez = situacao.vez;
  }
}

module.exports = { Domino, pecasDoDomino };
