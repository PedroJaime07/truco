/* Truco — contador simples de pontos por time, com desfazer e persistência. */

(function () {

  var qs = UI.qs;
  var escapar = UI.escapar;
  var CHAVE = Storage.CHAVES.truco;

  var LIMITE_HISTORICO = 60;   /* snapshots guardados para o desfazer */
  var MAX_TIMES = 12;

  var estado = null;

  /* ------------------------------------------------------------- Estado */

  function estadoValido(e) {
    return !!(e && Array.isArray(e.times) && e.times.length >= 2 &&
      e.times.every(function (t) { return t && typeof t.nome === 'string'; }));
  }

  function carregar() {
    var salvo = Storage.ler(CHAVE);
    if (!estadoValido(salvo)) return null;
    salvo.times.forEach(function (t) { t.pontos = UI.inteiro(t.pontos, -999, 9999, 0); });
    if (!Array.isArray(salvo.historico)) salvo.historico = [];
    return salvo;
  }

  function salvar() {
    Storage.escrever(CHAVE, estado);
  }

  /* Guarda o placar atual antes de alterá-lo (base do desfazer). */
  function registrarSnapshot() {
    estado.historico.push(estado.times.map(function (t) { return t.pontos; }));
    if (estado.historico.length > LIMITE_HISTORICO) estado.historico.shift();
  }

  /* -------------------------------------------------------------- Setup */

  function nomePadrao(i) {
    var padroes = ['Nós', 'Eles'];
    return padroes[i] || 'Time ' + (i + 1);
  }

  function montarCamposNomes() {
    var qtd = UI.inteiro(qs('#qtd-times').value, 2, MAX_TIMES, 2);
    var container = qs('#nomes-times');
    var atuais = UI.qsa('input', container).map(function (i) { return i.value; });

    container.innerHTML = '';
    for (var i = 0; i < qtd; i++) {
      var linha = document.createElement('div');
      linha.className = 'linha-nome';
      linha.innerHTML =
        '<span class="linha-nome__num" aria-hidden="true">' + (i + 1) + '</span>' +
        '<input class="entrada" type="text" maxlength="18" ' +
          'aria-label="Nome do time ' + (i + 1) + '" ' +
          'placeholder="' + escapar(nomePadrao(i)) + '" ' +
          'value="' + escapar(atuais[i] != null ? atuais[i] : '') + '">';
      container.appendChild(linha);
    }
  }

  function iniciarPartida() {
    var nomes = UI.qsa('#nomes-times input').map(function (campo, i) {
      var v = campo.value.trim();
      return v || nomePadrao(i);
    });

    estado = {
      times: nomes.map(function (nome) { return { nome: nome, pontos: 0 }; }),
      historico: []
    };
    salvar();
    mostrarJogo();
  }

  /* --------------------------------------------------------- Tela de jogo */

  function maiorPontuacao() {
    return estado.times.reduce(function (max, t) { return Math.max(max, t.pontos); }, 0);
  }

  function renderizarTimes() {
    var container = qs('#lista-times');
    var lider = maiorPontuacao();
    /* empate geral não tem líder */
    var todosIguais = estado.times.every(function (t) { return t.pontos === estado.times[0].pontos; });

    container.innerHTML = estado.times.map(function (time, i) {
      var eLider = lider > 0 && !todosIguais && time.pontos === lider;
      return '' +
        '<section class="time' + (eLider ? ' time--lider' : '') + '">' +
          '<div class="time__cabecalho">' +
            '<h2 class="time__nome">' + escapar(time.nome) + '</h2>' +
            '<span class="time__pontos" aria-label="Pontos de ' + escapar(time.nome) + '">' + time.pontos + '</span>' +
          '</div>' +
          '<div class="time__fichas">' +
            '<button type="button" class="ficha" data-time="' + i + '" data-delta="1">+1</button>' +
            '<button type="button" class="ficha" data-time="' + i + '" data-delta="2">+2</button>' +
            '<button type="button" class="ficha" data-time="' + i + '" data-delta="3">+3</button>' +
          '</div>' +
          '<div class="time__secundarios">' +
            '<button type="button" class="btn-sec" data-time="' + i + '" data-delta="-1">−1</button>' +
            '<button type="button" class="btn-sec" data-time="' + i + '" data-acao="customizado">Outro valor…</button>' +
          '</div>' +
        '</section>';
    }).join('');
  }

  function somar(indice, delta) {
    if (!delta) return;
    registrarSnapshot();
    var time = estado.times[indice];
    time.pontos = UI.inteiro(time.pontos + delta, -999, 9999, time.pontos);
    salvar();
    renderizarTimes();
    atualizarBotaoDesfazer();
  }

  function pedirValorCustomizado(indice) {
    var time = estado.times[indice];
    UI.pedirNumero({
      titulo: 'Somar pontos — ' + time.nome,
      texto: 'Digite quanto somar. Use número negativo pra tirar pontos (ex: −4).',
      rotulo: 'Pontos a somar',
      valor: '',
      min: -99,
      max: 99,
      confirmar: 'Somar'
    }).then(function (valor) {
      if (valor === null || valor === 0) return;
      somar(indice, valor);
      UI.toast((valor > 0 ? '+' : '') + valor + ' para ' + time.nome);
    });
  }

  function desfazer() {
    if (!estado.historico.length) return;
    var anterior = estado.historico.pop();
    estado.times.forEach(function (t, i) {
      t.pontos = UI.inteiro(anterior[i], -999, 9999, 0);
    });
    salvar();
    renderizarTimes();
    atualizarBotaoDesfazer();
    UI.toast('Última jogada desfeita');
  }

  function atualizarBotaoDesfazer() {
    var btn = qs('#desfazer');
    var temHistorico = estado.historico.length > 0;
    btn.disabled = !temHistorico;
    btn.textContent = temHistorico ? '↺ Desfazer (' + estado.historico.length + ')' : '↺ Desfazer';
  }

  function reiniciar() {
    UI.confirmar(
      'Reiniciar a partida?',
      'Os placares voltam para zero. Os times e os nomes continuam os mesmos.',
      { confirmar: 'Sim, zerar' }
    ).then(function (ok) {
      if (!ok) return;
      registrarSnapshot();
      estado.times.forEach(function (t) { t.pontos = 0; });
      salvar();
      renderizarTimes();
      atualizarBotaoDesfazer();
      UI.toast('Placar zerado');
    });
  }

  function trocarTimes() {
    UI.confirmar(
      'Mudar os times?',
      'Você volta para a tela de cadastro. A partida atual (placar e desfazer) será descartada.',
      { confirmar: 'Sim, mudar' }
    ).then(function (ok) {
      if (!ok) return;
      Storage.remover(CHAVE);
      estado = null;
      mostrarSetup();
    });
  }

  /* ------------------------------------------------------------- Telas */

  function mostrarSetup() {
    qs('#tela-jogo').hidden = true;
    qs('#barra-jogo').hidden = true;
    qs('#tela-setup').hidden = false;
    montarCamposNomes();
  }

  function mostrarJogo() {
    qs('#tela-setup').hidden = true;
    qs('#tela-jogo').hidden = false;
    qs('#barra-jogo').hidden = false;
    renderizarTimes();
    atualizarBotaoDesfazer();
  }

  /* ------------------------------------------------------------ Eventos */

  UI.pronto(function () {
    var campoQtd = qs('#qtd-times');

    qs('#menos-times').addEventListener('click', function () {
      campoQtd.value = UI.inteiro(campoQtd.value, 2, MAX_TIMES, 2) - 1;
      campoQtd.value = UI.inteiro(campoQtd.value, 2, MAX_TIMES, 2);
      montarCamposNomes();
    });

    qs('#mais-times').addEventListener('click', function () {
      campoQtd.value = UI.inteiro(UI.inteiro(campoQtd.value, 2, MAX_TIMES, 2) + 1, 2, MAX_TIMES, 2);
      montarCamposNomes();
    });

    campoQtd.addEventListener('change', function () {
      campoQtd.value = UI.inteiro(campoQtd.value, 2, MAX_TIMES, 2);
      montarCamposNomes();
    });

    qs('#iniciar-truco').addEventListener('click', iniciarPartida);

    /* delegação nos botões de pontuação */
    qs('#lista-times').addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-time]');
      if (!btn) return;
      var indice = parseInt(btn.dataset.time, 10);
      if (isNaN(indice) || !estado.times[indice]) return;

      if (btn.dataset.acao === 'customizado') pedirValorCustomizado(indice);
      else somar(indice, parseInt(btn.dataset.delta, 10));
    });

    qs('#desfazer').addEventListener('click', desfazer);
    qs('#reiniciar').addEventListener('click', reiniciar);
    qs('#editar-times').addEventListener('click', trocarTimes);

    estado = carregar();
    if (estado) mostrarJogo();
    else mostrarSetup();
  });

})();
