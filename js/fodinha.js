/* Fodinha — rodadas sobe-e-desce, apostas x vazas feitas e a conta de pedrinhas.
   Regra: quem erra a aposta leva 1 pedrinha. Vence quem tiver MENOS pedrinhas. */

(function () {

  var qs = UI.qs;
  var qsa = UI.qsa;
  var escapar = UI.escapar;
  var CHAVE = Storage.CHAVES.fodinha;

  var MAX_JOGADORES = 20;
  var MAX_CARTAS_ABS = 20;
  var CARTAS_BARALHO = 40;

  var estado = null;
  var pedrinhasAnteriores = {};   /* pra animar só as pedrinhas novas */

  /* ============================================================ Estado */

  function novoId(i) { return 'j' + (i + 1) + '_' + Math.random().toString(36).slice(2, 7); }

  function maxCartasSugerido(qtdJogadores) {
    return Math.max(1, Math.floor(CARTAS_BARALHO / Math.max(2, qtdJogadores)));
  }

  function estadoValido(e) {
    return !!(e && Array.isArray(e.jogadores) && e.jogadores.length >= 2 &&
      e.rodadaAtual && Array.isArray(e.historicoRodadas));
  }

  function carregar() {
    var salvo = Storage.ler(CHAVE);
    if (!estadoValido(salvo)) return null;

    salvo.maxCartas = UI.inteiro(salvo.maxCartas, 1, MAX_CARTAS_ABS, maxCartasSugerido(salvo.jogadores.length));
    salvo.jogadores.forEach(function (j, i) {
      if (!j.id) j.id = novoId(i);
      j.nome = String(j.nome || 'Jogador ' + (i + 1));
      j.pedrinhas = UI.inteiro(j.pedrinhas, 0, 9999, 0);
    });

    var r = salvo.rodadaAtual;
    r.numeroCartas = UI.inteiro(r.numeroCartas, 1, MAX_CARTAS_ABS, 1);
    r.direcao = r.direcao === 'descendo' ? 'descendo' : 'subindo';
    if (!r.jogadas || typeof r.jogadas !== 'object') r.jogadas = {};

    recalcularPedrinhas(salvo);
    return salvo;
  }

  function salvar() {
    if (estado) Storage.escrever(CHAVE, estado);
  }

  /* As pedrinhas são sempre derivadas do histórico — assim editar uma rodada
     antiga recalcula tudo corretamente a partir dali. */
  function recalcularPedrinhas(alvo) {
    var e = alvo || estado;
    var contagem = {};
    e.jogadores.forEach(function (j) { contagem[j.id] = 0; });

    e.historicoRodadas.forEach(function (rodada) {
      (rodada.jogadas || []).forEach(function (jogada) {
        jogada.levouPedrinha = jogada.apostado !== jogada.realizado;
        if (jogada.levouPedrinha && contagem[jogada.jogadorId] != null) contagem[jogada.jogadorId] += 1;
      });
    });

    e.jogadores.forEach(function (j) { j.pedrinhas = contagem[j.id] || 0; });
  }

  /* Valor atual (apostado/realizado) do jogador na rodada em aberto. */
  function valorAtual(jogadorId, campo) {
    var j = estado.rodadaAtual.jogadas[jogadorId];
    return j ? UI.inteiro(j[campo], 0, estado.rodadaAtual.numeroCartas, 0) : 0;
  }

  function definirValor(jogadorId, campo, valor) {
    var jogadas = estado.rodadaAtual.jogadas;
    if (!jogadas[jogadorId]) jogadas[jogadorId] = { apostado: 0, realizado: 0 };
    jogadas[jogadorId][campo] = UI.inteiro(valor, 0, estado.rodadaAtual.numeroCartas, 0);
    salvar();
  }

  /* Sequência sobe-e-desce: 1,2,...,max,...,2,1,2,... */
  function proximaRodada(numeroCartas, direcao, maxCartas) {
    if (maxCartas <= 1) return { numeroCartas: 1, direcao: 'subindo' };
    if (direcao === 'subindo') {
      if (numeroCartas >= maxCartas) return { numeroCartas: maxCartas - 1, direcao: 'descendo' };
      return { numeroCartas: numeroCartas + 1, direcao: 'subindo' };
    }
    if (numeroCartas <= 1) return { numeroCartas: 2, direcao: 'subindo' };
    return { numeroCartas: numeroCartas - 1, direcao: 'descendo' };
  }

  /* ============================================================= Setup */

  function montarCamposNomes() {
    var qtd = UI.inteiro(qs('#qtd-jogadores').value, 2, MAX_JOGADORES, 4);
    var container = qs('#nomes-jogadores');
    var atuais = qsa('input', container).map(function (i) { return i.value; });

    container.innerHTML = '';
    for (var i = 0; i < qtd; i++) {
      var linha = document.createElement('div');
      linha.className = 'linha-nome';
      linha.innerHTML =
        '<span class="linha-nome__num" aria-hidden="true">' + (i + 1) + '</span>' +
        '<input class="entrada" type="text" maxlength="18" ' +
          'aria-label="Nome do jogador ' + (i + 1) + '" ' +
          'placeholder="Jogador ' + (i + 1) + '" ' +
          'value="' + escapar(atuais[i] != null ? atuais[i] : '') + '">';
      container.appendChild(linha);
    }
    sincronizarMaxCartas(qtd);
  }

  /* Sugere o máximo de cartas pelo baralho de 40, mas sem sobrescrever
     um valor que a pessoa já ajustou na mão. */
  var maxCartasEditadoManualmente = false;

  function sincronizarMaxCartas(qtd) {
    var campo = qs('#max-cartas');
    var sugerido = maxCartasSugerido(qtd);
    if (!maxCartasEditadoManualmente) campo.value = sugerido;
    qs('#nota-max-cartas').innerHTML =
      'Sugestão para ' + qtd + ' jogadores: <strong>' + sugerido + '</strong> ' +
      UI.plural(sugerido, 'carta', 'cartas') + ' (baralho de 40 ÷ jogadores). Pode mudar se o grupo joga diferente.';
  }

  function iniciarPartida() {
    var nomes = qsa('#nomes-jogadores input').map(function (campo, i) {
      return campo.value.trim() || 'Jogador ' + (i + 1);
    });
    var maxCartas = UI.inteiro(qs('#max-cartas').value, 1, MAX_CARTAS_ABS, maxCartasSugerido(nomes.length));

    estado = {
      jogadores: nomes.map(function (nome, i) {
        return { id: novoId(i), nome: nome, pedrinhas: 0 };
      }),
      maxCartas: maxCartas,
      rodadaAtual: { numeroCartas: 1, direcao: 'subindo', jogadas: {} },
      historicoRodadas: []
    };
    pedrinhasAnteriores = {};
    salvar();
    mostrarJogo();
  }

  /* ==================================================== Aba: rodada */

  function miniPedrinhas(qtd) {
    if (!qtd) return '<span class="jogada__pedrinhas-mini">sem pedrinhas</span>';
    return '<span class="jogada__pedrinhas-mini">' + UI.PEDRINHA_SVG.replace('class="pedrinha"',
      'class="pedrinha" style="width:15px;height:13px;display:inline-block;vertical-align:-2px"') +
      ' ' + qtd + '</span>';
  }

  function renderizarRodada() {
    var r = estado.rodadaAtual;

    qs('#rodada-cartas').textContent = r.numeroCartas + ' ' + UI.plural(r.numeroCartas, 'carta', 'cartas');

    var prox = proximaRodada(r.numeroCartas, r.direcao, estado.maxCartas);
    qs('#rodada-direcao').textContent =
      (r.direcao === 'subindo' ? '↑ subindo' : '↓ descendo') +
      ' · máx ' + estado.maxCartas +
      ' · próxima: ' + prox.numeroCartas + ' ' + UI.plural(prox.numeroCartas, 'carta', 'cartas');

    qs('#lista-jogadas').innerHTML = estado.jogadores.map(function (j) {
      var apostado = valorAtual(j.id, 'apostado');
      var realizado = valorAtual(j.id, 'realizado');

      return '' +
        '<article class="jogada" data-jogador="' + j.id + '">' +
          '<div class="jogada__topo">' +
            '<span class="jogada__nome">' + escapar(j.nome) + '</span>' +
            miniPedrinhas(j.pedrinhas) +
          '</div>' +
          '<div class="jogada__campos">' +
            campoStepper(j, 'apostado', 'Apostou', apostado) +
            campoStepper(j, 'realizado', 'Fez', realizado) +
          '</div>' +
          '<p class="jogada__aviso"></p>' +
        '</article>';
    }).join('');

    atualizarDerivados();
    atualizarBarra();
  }

  function campoStepper(jogador, campo, rotulo, valor) {
    var idCampo = campo + '-' + jogador.id;
    var max = estado.rodadaAtual.numeroCartas;
    return '' +
      '<div class="stepper">' +
        '<label class="stepper__rotulo" for="' + idCampo + '">' + rotulo + '</label>' +
        '<div class="stepper__controles">' +
          '<button type="button" class="stepper__btn" data-jogador="' + jogador.id + '" data-campo="' + campo + '" data-delta="-1" ' +
            'aria-label="Diminuir ' + rotulo.toLowerCase() + ' de ' + escapar(jogador.nome) + '">−</button>' +
          '<input class="stepper__valor" id="' + idCampo + '" type="number" inputmode="numeric" step="1" ' +
            'min="0" max="' + max + '" value="' + valor + '" ' +
            'data-jogador="' + jogador.id + '" data-campo="' + campo + '">' +
          '<button type="button" class="stepper__btn" data-jogador="' + jogador.id + '" data-campo="' + campo + '" data-delta="1" ' +
            'aria-label="Aumentar ' + rotulo.toLowerCase() + ' de ' + escapar(jogador.nome) + '">+</button>' +
        '</div>' +
      '</div>';
  }

  /* Atualiza avisos e destaques sem re-renderizar (não rouba o foco dos inputs). */
  function atualizarDerivados() {
    var r = estado.rodadaAtual;
    var somaApostas = 0;
    var somaFeitas = 0;

    estado.jogadores.forEach(function (j) {
      var apostado = valorAtual(j.id, 'apostado');
      var realizado = valorAtual(j.id, 'realizado');
      somaApostas += apostado;
      somaFeitas += realizado;

      var card = qs('.jogada[data-jogador="' + j.id + '"]');
      if (!card) return;
      var bateu = apostado === realizado;
      card.classList.toggle('jogada--bateu', bateu);
      card.classList.toggle('jogada--errou', !bateu);
      var aviso = qs('.jogada__aviso', card);
      aviso.textContent = bateu ? '✓ bateu a aposta' : '✗ vai levar pedrinha';
      aviso.className = 'jogada__aviso ' + (bateu ? 'jogada__aviso--bateu' : 'jogada__aviso--errou');
    });

    var el = qs('#aviso-soma');
    var ok = somaFeitas === r.numeroCartas;
    el.hidden = false;
    el.className = 'aviso-soma' + (ok ? ' aviso-soma--ok' : '');
    el.innerHTML = ok
      ? 'Mão(s) feitas: <strong>' + somaFeitas + '</strong> de ' + r.numeroCartas + ' — bate certinho. Apostas somam ' + somaApostas + '.'
      : 'Mão(s) feitas somam <strong>' + somaFeitas + '</strong>, mas a rodada tem <strong>' + r.numeroCartas + '</strong>. ' +
        'Confira antes de fechar. (Apostas somam ' + somaApostas + '.)';
  }

  function ajustarValor(jogadorId, campo, delta) {
    var novo = valorAtual(jogadorId, campo) + delta;
    definirValor(jogadorId, campo, novo);
    var input = qs('.stepper__valor[data-jogador="' + jogadorId + '"][data-campo="' + campo + '"]');
    if (input) input.value = valorAtual(jogadorId, campo);
    atualizarDerivados();
  }

  function fecharRodada() {
    var r = estado.rodadaAtual;

    var jogadas = estado.jogadores.map(function (j) {
      var apostado = valorAtual(j.id, 'apostado');
      var realizado = valorAtual(j.id, 'realizado');
      return {
        jogadorId: j.id,
        jogador: j.nome,
        apostado: apostado,
        realizado: realizado,
        levouPedrinha: apostado !== realizado
      };
    });

    var somaFeitas = jogadas.reduce(function (s, j) { return s + j.realizado; }, 0);
    var levaram = jogadas.filter(function (j) { return j.levouPedrinha; });

    function aplicar() {
      estado.historicoRodadas.push({
        numeroCartas: r.numeroCartas,
        direcao: r.direcao,
        jogadas: jogadas
      });

      var prox = proximaRodada(r.numeroCartas, r.direcao, estado.maxCartas);
      estado.rodadaAtual = { numeroCartas: prox.numeroCartas, direcao: prox.direcao, jogadas: {} };

      recalcularPedrinhas();
      salvar();
      renderizarTudo();

      UI.toast(levaram.length
        ? levaram.length + ' ' + UI.plural(levaram.length, 'pedrinha', 'pedrinhas') + ' na conta'
        : 'Rodada limpa: ninguém levou pedrinha');
    }

    if (somaFeitas !== r.numeroCartas) {
      UI.confirmar(
        'As Mão(s) não fecham',
        'Foram marcadas ' + somaFeitas + ' Mão(s), mas a rodada tem ' + r.numeroCartas +
        '. Quer fechar assim mesmo?',
        { confirmar: 'Fechar assim mesmo', perigo: false }
      ).then(function (ok) { if (ok) aplicar(); });
      return;
    }

    aplicar();
  }

  function desfazerRodada() {
    if (!estado.historicoRodadas.length) return;

    UI.confirmar(
      'Desfazer a última rodada?',
      'As pedrinhas dessa rodada são removidas e os valores voltam para edição.',
      { confirmar: 'Sim, desfazer', perigo: false }
    ).then(function (ok) {
      if (!ok) return;

      var rodada = estado.historicoRodadas.pop();
      var jogadas = {};
      (rodada.jogadas || []).forEach(function (j) {
        jogadas[j.jogadorId] = { apostado: j.apostado, realizado: j.realizado };
      });

      estado.rodadaAtual = {
        numeroCartas: rodada.numeroCartas,
        direcao: rodada.direcao || 'subindo',
        jogadas: jogadas
      };

      recalcularPedrinhas();
      salvar();
      trocarAba('rodada');
      renderizarTudo();
      UI.toast('Rodada reaberta para edição');
    });
  }

  /* =================================================== Aba: ranking */

  function ordenarRanking() {
    return estado.jogadores.slice().sort(function (a, b) {
      if (a.pedrinhas !== b.pedrinhas) return a.pedrinhas - b.pedrinhas;
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });
  }

  function renderizarRanking() {
    var ordenados = ordenarRanking();
    var posicao = 0;
    var anteriorPedrinhas = null;

    /* só existe líder quando alguém está de fato na frente */
    var todosIguais = ordenados.every(function (j) { return j.pedrinhas === ordenados[0].pedrinhas; });

    qs('#lista-ranking').innerHTML = ordenados.map(function (j, i) {
      if (anteriorPedrinhas === null || j.pedrinhas !== anteriorPedrinhas) posicao = i + 1;
      anteriorPedrinhas = j.pedrinhas;

      var eLider = posicao === 1 && !todosIguais;
      var antes = pedrinhasAnteriores[j.id];
      var novas = typeof antes === 'number' && j.pedrinhas > antes ? j.pedrinhas - antes : 0;

      return '' +
        '<article class="rank' + (eLider ? ' rank--lider' : '') + '">' +
          '<span class="rank__pos" aria-label="Posição ' + posicao + '">' + posicao + '</span>' +
          '<div class="rank__corpo">' +
            '<h3 class="rank__nome">' +
              escapar(j.nome) +
              (eLider ? '<span class="rank__coroa" aria-label="Em primeiro">♛</span>' : '') +
            '</h3>' +
            '<div class="pedrinhas" role="img" aria-label="' + j.pedrinhas + ' ' +
              UI.plural(j.pedrinhas, 'pedrinha', 'pedrinhas') + '">' +
              UI.pedrinhasHTML(j.pedrinhas, { novas: novas, textoVazio: 'limpo, sem pedrinhas' }) +
            '</div>' +
          '</div>' +
        '</article>';
    }).join('');

    estado.jogadores.forEach(function (j) { pedrinhasAnteriores[j.id] = j.pedrinhas; });
  }

  /* ================================================= Aba: histórico */

  function renderizarHistorico() {
    var container = qs('#lista-historico');

    if (!estado.historicoRodadas.length) {
      container.innerHTML =
        '<p class="vazio"><span class="vazio__icone" aria-hidden="true">♠</span>' +
        'Nenhuma rodada fechada ainda.<br>Feche a primeira rodada para ela aparecer aqui — ' +
        'depois é só tocar numa rodada pra corrigir os valores.</p>';
      return;
    }

    container.innerHTML = estado.historicoRodadas.map(function (rodada, i) {
      var levaram = (rodada.jogadas || []).filter(function (j) { return j.levouPedrinha; });
      var resumo = levaram.length
        ? 'Pedrinha: ' + levaram.map(function (j) { return escapar(j.jogador); }).join(', ')
        : 'Ninguém levou pedrinha';

      return '' +
        '<button type="button" class="rodada-item" data-rodada="' + i + '">' +
          '<span class="rodada-item__selo" aria-hidden="true">' + rodada.numeroCartas + '</span>' +
          '<span class="rodada-item__info">' +
            '<span class="rodada-item__titulo">Rodada ' + (i + 1) + ' · ' +
              rodada.numeroCartas + ' ' + UI.plural(rodada.numeroCartas, 'carta', 'cartas') + '</span>' +
            '<span class="rodada-item__resumo">' + resumo + '</span>' +
          '</span>' +
          '<span class="rodada-item__seta" aria-hidden="true">›</span>' +
        '</button>';
    }).reverse().join('');
  }

  function editarRodada(indice) {
    var rodada = estado.historicoRodadas[indice];
    if (!rodada) return;

    var corpo = '<div class="pilha-12">' + rodada.jogadas.map(function (j, k) {
      return '' +
        '<div>' +
          '<span class="campo__rotulo">' + escapar(j.jogador) + '</span>' +
          '<div class="jogada__campos">' +
            '<div class="stepper">' +
              '<label class="stepper__rotulo" for="edit-ap-' + k + '">Apostou</label>' +
              '<input class="stepper__valor" id="edit-ap-' + k + '" type="number" inputmode="numeric" ' +
                'step="1" min="0" max="' + rodada.numeroCartas + '" value="' + j.apostado + '">' +
            '</div>' +
            '<div class="stepper">' +
              '<label class="stepper__rotulo" for="edit-fe-' + k + '">Fez</label>' +
              '<input class="stepper__valor" id="edit-fe-' + k + '" type="number" inputmode="numeric" ' +
                'step="1" min="0" max="' + rodada.numeroCartas + '" value="' + j.realizado + '">' +
            '</div>' +
          '</div>' +
        '</div>';
    }).join('') + '</div>';

    UI.abrirModal({
      titulo: 'Rodada ' + (indice + 1) + ' · ' + rodada.numeroCartas +
        ' ' + UI.plural(rodada.numeroCartas, 'carta', 'cartas'),
      texto: 'Corrija os valores. As pedrinhas de todo mundo são recalculadas na hora.',
      corpoHTML: corpo,
      confirmar: 'Salvar correção',
      perigo: false,
      aoConfirmar: function (modalEl) {
        rodada.jogadas.forEach(function (j, k) {
          j.apostado = UI.inteiro(qs('#edit-ap-' + k, modalEl).value, 0, rodada.numeroCartas, j.apostado);
          j.realizado = UI.inteiro(qs('#edit-fe-' + k, modalEl).value, 0, rodada.numeroCartas, j.realizado);
          j.levouPedrinha = j.apostado !== j.realizado;
        });
      }
    }).then(function (ok) {
      if (!ok) return;
      recalcularPedrinhas();
      salvar();
      renderizarTudo();
      UI.toast('Rodada ' + (indice + 1) + ' corrigida');
    });
  }

  /* ======================================================== Ajustes */

  function ajustarCartasDaRodada() {
    UI.pedirNumero({
      titulo: 'Cartas desta rodada',
      texto: 'Quantas cartas cada jogador recebeu nesta rodada? A sequência automática continua a partir daqui.',
      rotulo: 'Número de cartas',
      valor: estado.rodadaAtual.numeroCartas,
      min: 1,
      max: MAX_CARTAS_ABS
    }).then(function (valor) {
      if (valor === null) return;
      estado.rodadaAtual.numeroCartas = valor;
      if (valor > estado.maxCartas) estado.maxCartas = valor;

      /* mantém apostas/vazas dentro do novo limite */
      Object.keys(estado.rodadaAtual.jogadas).forEach(function (id) {
        definirValor(id, 'apostado', estado.rodadaAtual.jogadas[id].apostado);
        definirValor(id, 'realizado', estado.rodadaAtual.jogadas[id].realizado);
      });

      salvar();
      renderizarRodada();
      UI.toast('Rodada de ' + valor + ' ' + UI.plural(valor, 'carta', 'cartas'));
    });
  }

  function ajustarMaximo() {
    UI.pedirNumero({
      titulo: 'Máximo de cartas',
      texto: 'É onde a sequência vira e começa a descer. Sugestão para ' + estado.jogadores.length +
        ' jogadores: ' + maxCartasSugerido(estado.jogadores.length) + '.',
      rotulo: 'Máximo por rodada',
      valor: estado.maxCartas,
      min: 1,
      max: MAX_CARTAS_ABS
    }).then(function (valor) {
      if (valor === null) return;
      estado.maxCartas = valor;
      if (estado.rodadaAtual.numeroCartas > valor) {
        estado.rodadaAtual.numeroCartas = valor;
        estado.rodadaAtual.direcao = 'descendo';
      }
      salvar();
      renderizarRodada();
      UI.toast('Máximo agora é ' + valor);
    });
  }

  function reiniciar() {
    UI.confirmar(
      'Reiniciar a partida?',
      'Apaga todas as pedrinhas e o histórico de rodadas. Os jogadores continuam os mesmos.',
      { confirmar: 'Sim, zerar tudo' }
    ).then(function (ok) {
      if (!ok) return;
      estado.historicoRodadas = [];
      estado.rodadaAtual = { numeroCartas: 1, direcao: 'subindo', jogadas: {} };
      recalcularPedrinhas();
      pedrinhasAnteriores = {};
      salvar();
      trocarAba('rodada');
      renderizarTudo();
      UI.toast('Partida zerada');
    });
  }

  function trocarJogadores() {
    UI.confirmar(
      'Trocar os jogadores?',
      'Você volta para o cadastro. Pedrinhas e histórico desta partida serão descartados.',
      { confirmar: 'Sim, trocar' }
    ).then(function (ok) {
      if (!ok) return;
      Storage.remover(CHAVE);
      estado = null;
      pedrinhasAnteriores = {};
      mostrarSetup();
    });
  }

  /* =========================================================== Telas */

  function trocarAba(nome) {
    qsa('.aba').forEach(function (btn) {
      btn.setAttribute('aria-selected', String(btn.dataset.aba === nome));
    });
    qs('#painel-rodada').hidden = nome !== 'rodada';
    qs('#painel-ranking').hidden = nome !== 'ranking';
    qs('#painel-historico').hidden = nome !== 'historico';
    qs('#barra-jogo').hidden = nome !== 'rodada';
    qs('#tela-jogo').classList.toggle('shell--com-barra', nome === 'rodada');
    window.scrollTo(0, 0);
  }

  function atualizarBarra() {
    var btn = qs('#desfazer-rodada');
    var tem = estado.historicoRodadas.length > 0;
    btn.disabled = !tem;
    btn.textContent = tem ? '↺ Rodada ' + estado.historicoRodadas.length : '↺ Desfazer';
  }

  function renderizarTudo() {
    renderizarRodada();
    renderizarRanking();
    renderizarHistorico();
  }

  function mostrarSetup() {
    qs('#tela-jogo').hidden = true;
    qs('#barra-jogo').hidden = true;
    qs('#tela-setup').hidden = false;
    montarCamposNomes();
  }

  function mostrarJogo() {
    qs('#tela-setup').hidden = true;
    qs('#tela-jogo').hidden = false;
    trocarAba('rodada');
    renderizarTudo();
  }

  /* ========================================================= Eventos */

  UI.pronto(function () {
    var campoQtd = qs('#qtd-jogadores');
    var campoMax = qs('#max-cartas');

    function mudarQtd(delta) {
      campoQtd.value = UI.inteiro(UI.inteiro(campoQtd.value, 2, MAX_JOGADORES, 4) + delta, 2, MAX_JOGADORES, 4);
      montarCamposNomes();
    }

    qs('#menos-jogadores').addEventListener('click', function () { mudarQtd(-1); });
    qs('#mais-jogadores').addEventListener('click', function () { mudarQtd(1); });
    campoQtd.addEventListener('change', function () {
      campoQtd.value = UI.inteiro(campoQtd.value, 2, MAX_JOGADORES, 4);
      montarCamposNomes();
    });

    qs('#menos-cartas').addEventListener('click', function () {
      maxCartasEditadoManualmente = true;
      campoMax.value = UI.inteiro(UI.inteiro(campoMax.value, 1, MAX_CARTAS_ABS, 1) - 1, 1, MAX_CARTAS_ABS, 1);
    });
    qs('#mais-cartas').addEventListener('click', function () {
      maxCartasEditadoManualmente = true;
      campoMax.value = UI.inteiro(UI.inteiro(campoMax.value, 1, MAX_CARTAS_ABS, 1) + 1, 1, MAX_CARTAS_ABS, 1);
    });
    campoMax.addEventListener('input', function () { maxCartasEditadoManualmente = true; });

    qs('#iniciar-fodinha').addEventListener('click', iniciarPartida);

    /* abas */
    qsa('.aba').forEach(function (btn) {
      btn.addEventListener('click', function () { trocarAba(btn.dataset.aba); });
    });

    /* steppers da rodada (delegação) */
    var lista = qs('#lista-jogadas');

    lista.addEventListener('click', function (ev) {
      var btn = ev.target.closest('.stepper__btn');
      if (!btn) return;
      ajustarValor(btn.dataset.jogador, btn.dataset.campo, parseInt(btn.dataset.delta, 10));
    });

    lista.addEventListener('input', function (ev) {
      var input = ev.target.closest('.stepper__valor');
      if (!input) return;
      if (input.value === '') return;              /* deixa apagar pra digitar */
      definirValor(input.dataset.jogador, input.dataset.campo, input.value);
      /* se digitou acima do número de cartas, corrige na hora */
      var guardado = valorAtual(input.dataset.jogador, input.dataset.campo);
      if (parseInt(input.value, 10) !== guardado) input.value = guardado;
      atualizarDerivados();
    });

    lista.addEventListener('blur', function (ev) {
      var input = ev.target.closest && ev.target.closest('.stepper__valor');
      if (!input) return;
      definirValor(input.dataset.jogador, input.dataset.campo, input.value);
      input.value = valorAtual(input.dataset.jogador, input.dataset.campo);
      atualizarDerivados();
    }, true);

    /* histórico (delegação) */
    qs('#lista-historico').addEventListener('click', function (ev) {
      var item = ev.target.closest('[data-rodada]');
      if (!item) return;
      editarRodada(parseInt(item.dataset.rodada, 10));
    });

    qs('#editar-cartas').addEventListener('click', ajustarCartasDaRodada);
    qs('#editar-max').addEventListener('click', ajustarMaximo);
    qs('#fechar-rodada').addEventListener('click', fecharRodada);
    qs('#desfazer-rodada').addEventListener('click', desfazerRodada);
    qs('#reiniciar').addEventListener('click', reiniciar);
    qs('#trocar-jogadores').addEventListener('click', trocarJogadores);

    estado = carregar();
    if (estado) {
      estado.jogadores.forEach(function (j) { pedrinhasAnteriores[j.id] = j.pedrinhas; });
      mostrarJogo();
    } else {
      mostrarSetup();
    }
  });

})();
