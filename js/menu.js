/* Tela inicial: mostra as partidas em andamento e deixa continuar ou recomeçar. */

(function () {

  var qs = UI.qs;
  var escapar = UI.escapar;

  /* Resume o estado salvo de cada jogo em algo legível, ou null se não há partida. */
  function resumoTruco() {
    var estado = Storage.ler(Storage.CHAVES.truco);
    if (!estado || !estado.times || !estado.times.length) return null;

    var placar = estado.times.map(function (t) {
      return escapar(t.nome || 'Time') + ' ' + (t.pontos || 0);
    }).join('  ×  ');

    return {
      jogo: 'Truco',
      href: 'truco.html',
      chave: Storage.CHAVES.truco,
      detalhe: placar
    };
  }

  function resumoFodinha() {
    var estado = Storage.ler(Storage.CHAVES.fodinha);
    if (!estado || !estado.jogadores || !estado.jogadores.length) return null;

    var n = estado.jogadores.length;
    var rodadas = (estado.historicoRodadas || []).length;
    var cartas = estado.rodadaAtual && estado.rodadaAtual.numeroCartas ? estado.rodadaAtual.numeroCartas : 1;

    var detalhe = n + ' ' + UI.plural(n, 'jogador', 'jogadores') +
      ' · ' + rodadas + ' ' + UI.plural(rodadas, 'rodada fechada', 'rodadas fechadas') +
      ' · agora com ' + cartas + ' ' + UI.plural(cartas, 'carta', 'cartas');

    return {
      jogo: 'Fodinha',
      href: 'fodinha.html',
      chave: Storage.CHAVES.fodinha,
      detalhe: detalhe
    };
  }

  /* Avisos dispensados com o X ficam escondidos só enquanto o app estiver
     aberto — a partida continua salva e o aviso volta numa próxima visita. */
  function chaveDispensado(chave) { return 'dispensado_' + chave; }

  function foiDispensado(chave) {
    try {
      return window.sessionStorage.getItem(chaveDispensado(chave)) === '1';
    } catch (e) {
      return false;
    }
  }

  function marcarDispensado(chave) {
    try {
      window.sessionStorage.setItem(chaveDispensado(chave), '1');
    } catch (e) { /* sem sessionStorage: só some da tela mesmo */ }
  }

  function montarAviso(resumo) {
    var el = document.createElement('section');
    el.className = 'retomar';
    el.innerHTML =
      '<button type="button" class="retomar__fechar" data-acao="fechar" ' +
        'aria-label="Dispensar aviso da partida de ' + escapar(resumo.jogo) + '">&times;</button>' +
      '<h2 class="retomar__titulo">Partida de ' + escapar(resumo.jogo) + ' em andamento</h2>' +
      '<p class="retomar__texto">' + resumo.detalhe + '</p>' +
      '<div class="retomar__acoes">' +
        '<button type="button" class="btn" data-acao="nova">Começar nova</button>' +
        '<a class="btn btn--principal" href="' + resumo.href + '" ' +
           'style="display:grid;place-items:center;text-decoration:none">Continuar</a>' +
      '</div>';

    qs('[data-acao="fechar"]', el).addEventListener('click', function () {
      marcarDispensado(resumo.chave);
      el.classList.add('retomar--saindo');
      window.setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 200);
    });

    qs('[data-acao="nova"]', el).addEventListener('click', function () {
      UI.confirmar(
        'Descartar a partida de ' + resumo.jogo + '?',
        'A partida salva será apagada e você começa do zero. Não dá pra desfazer.',
        { confirmar: 'Sim, descartar' }
      ).then(function (ok) {
        if (!ok) return;
        Storage.remover(resumo.chave);
        window.location.href = resumo.href;
      });
    });

    return el;
  }

  UI.pronto(function () {
    var container = qs('#retomadas');
    [resumoTruco(), resumoFodinha()].forEach(function (resumo) {
      if (resumo && !foiDispensado(resumo.chave)) container.appendChild(montarAviso(resumo));
    });

    if (!Storage.disponivel) {
      var aviso = qs('#aviso-storage');
      if (aviso) aviso.hidden = false;
    }
  });

})();
