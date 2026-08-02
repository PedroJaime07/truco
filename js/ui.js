/* Utilidades de interface compartilhadas: modais, toast, pedrinhas e helpers. */

var UI = (function () {

  function qs(seletor, raiz) { return (raiz || document).querySelector(seletor); }
  function qsa(seletor, raiz) {
    return Array.prototype.slice.call((raiz || document).querySelectorAll(seletor));
  }

  function escapar(texto) {
    return String(texto == null ? '' : texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* Converte para inteiro dentro de limites; devolve o padrão se não der. */
  function inteiro(valor, min, max, padrao) {
    var n = parseInt(valor, 10);
    if (isNaN(n)) n = padrao;
    if (typeof min === 'number' && n < min) n = min;
    if (typeof max === 'number' && n > max) n = max;
    return n;
  }

  function plural(n, singular, pluralForma) {
    return n === 1 ? singular : pluralForma;
  }

  /* ---------------------------------------------------------------- Modal */

  var modalAberto = null;

  function fecharModal() {
    if (!modalAberto) return;
    var fundo = modalAberto.fundo;
    var focoAnterior = modalAberto.focoAnterior;
    document.removeEventListener('keydown', modalAberto.aoTeclar);
    if (fundo.parentNode) fundo.parentNode.removeChild(fundo);
    modalAberto = null;
    if (focoAnterior && focoAnterior.focus) focoAnterior.focus();
  }

  /* Modal genérico.
     opcoes: { titulo, texto, corpoHTML, confirmar, cancelar, perigo,
               aoAbrir(modalEl), aoConfirmar(modalEl) -> false cancela o fechamento }
     Resolve com true (confirmou) ou false (cancelou). */
  function abrirModal(opcoes) {
    fecharModal();
    return new Promise(function (resolve) {
      var fundo = document.createElement('div');
      fundo.className = 'modal-fundo';

      var rotuloConfirmar = opcoes.confirmar || 'Confirmar';
      var rotuloCancelar = opcoes.cancelar || 'Cancelar';

      fundo.innerHTML =
        '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">' +
          '<h2 class="modal__titulo" id="modal-titulo">' + escapar(opcoes.titulo || '') + '</h2>' +
          (opcoes.texto ? '<p class="modal__texto">' + escapar(opcoes.texto) + '</p>' : '') +
          (opcoes.corpoHTML ? '<div class="modal__corpo">' + opcoes.corpoHTML + '</div>' : '') +
          '<div class="modal__acoes">' +
            (opcoes.semCancelar ? '' :
              '<button type="button" class="btn" data-acao="cancelar">' + escapar(rotuloCancelar) + '</button>') +
            '<button type="button" class="btn ' + (opcoes.perigo ? 'btn--perigo' : 'btn--principal') + '" data-acao="confirmar">' +
              escapar(rotuloConfirmar) +
            '</button>' +
          '</div>' +
        '</div>';

      var modalEl = qs('.modal', fundo);

      function terminar(resultado) {
        fecharModal();
        resolve(resultado);
      }

      qsa('[data-acao]', fundo).forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (btn.dataset.acao === 'confirmar') {
            if (typeof opcoes.aoConfirmar === 'function' && opcoes.aoConfirmar(modalEl) === false) return;
            terminar(true);
          } else {
            terminar(false);
          }
        });
      });

      fundo.addEventListener('click', function (ev) {
        if (ev.target === fundo) terminar(false);
      });

      function aoTeclar(ev) {
        if (ev.key === 'Escape') { ev.preventDefault(); terminar(false); }
        if (ev.key === 'Enter' && ev.target.tagName === 'INPUT') {
          ev.preventDefault();
          if (typeof opcoes.aoConfirmar === 'function' && opcoes.aoConfirmar(modalEl) === false) return;
          terminar(true);
        }
      }

      document.body.appendChild(fundo);
      modalAberto = { fundo: fundo, aoTeclar: aoTeclar, focoAnterior: document.activeElement };
      document.addEventListener('keydown', aoTeclar);

      if (typeof opcoes.aoAbrir === 'function') opcoes.aoAbrir(modalEl);

      var primeiroCampo = qs('input, select, textarea', modalEl);
      if (primeiroCampo) { primeiroCampo.focus(); if (primeiroCampo.select) primeiroCampo.select(); }
      else qs('[data-acao="confirmar"]', modalEl).focus();
    });
  }

  function confirmar(titulo, texto, opcoes) {
    opcoes = opcoes || {};
    return abrirModal({
      titulo: titulo,
      texto: texto,
      confirmar: opcoes.confirmar || 'Sim, confirmar',
      cancelar: opcoes.cancelar || 'Cancelar',
      perigo: opcoes.perigo !== false
    });
  }

  /* Pede um número ao usuário (teclado numérico no celular). */
  function pedirNumero(opcoes) {
    var min = typeof opcoes.min === 'number' ? opcoes.min : -999;
    var max = typeof opcoes.max === 'number' ? opcoes.max : 999;
    var resultado = null;

    return abrirModal({
      titulo: opcoes.titulo,
      texto: opcoes.texto,
      confirmar: opcoes.confirmar || 'Aplicar',
      perigo: false,
      corpoHTML:
        '<label class="campo__rotulo" for="modal-numero">' + escapar(opcoes.rotulo || 'Valor') + '</label>' +
        '<input id="modal-numero" class="entrada entrada--numero" type="number" inputmode="numeric" ' +
        'step="1" min="' + min + '" max="' + max + '" value="' + escapar(String(opcoes.valor != null ? opcoes.valor : '')) + '">',
      aoConfirmar: function (modalEl) {
        var campo = qs('#modal-numero', modalEl);
        if (campo.value.trim() === '') return false;
        resultado = inteiro(campo.value, min, max, opcoes.valor || 0);
      }
    }).then(function (ok) {
      return ok ? resultado : null;
    });
  }

  /* ---------------------------------------------------------------- Toast */

  var toastAtual = null;

  function toast(mensagem, ms) {
    if (toastAtual && toastAtual.parentNode) toastAtual.parentNode.removeChild(toastAtual);
    var el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.textContent = mensagem;
    document.body.appendChild(el);
    toastAtual = el;
    window.setTimeout(function () {
      el.classList.add('toast--saindo');
      window.setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
        if (toastAtual === el) toastAtual = null;
      }, 260);
    }, ms || 2200);
  }

  /* ------------------------------------------------------------ Pedrinhas */

  /* As pedrinhas do Fodinha, desenhadas à mão em SVG.
     Cinco formatos com carinhas diferentes, alternados na fileira: quem está
     levando pedrinha vê um bando de pedra emburrada olhando de volta.
     Montadas por partes pra não repetir o mesmo trecho cinco vezes. */

  /* Cada pedrinha tem silhueta própria — achatada, lascada, comprida, entalhada,
     roliça — e o rosto é posicionado pro formato dela. `sombra` acompanha a
     largura da base, senão a pedra fica flutuando. */
  function seixo(pedra) {
    return '<svg class="pedrinha" viewBox="0 0 24 21" role="img" aria-hidden="true" focusable="false">' +
      '<ellipse class="pedrinha__sombra" cx="' + pedra.sombraX + '" cy="17.9" rx="' + pedra.sombraR + '" ry="1.6"/>' +
      '<path class="pedrinha__base" d="' + pedra.corpo + '" transform="translate(0 1.2)"/>' +
      '<path class="pedrinha__corpo" d="' + pedra.corpo + '"/>' +
      pedra.textura +
      pedra.rosto +
    '</svg>';
  }

  var PEDRINHAS_SVG = [

    /* 1. achatada e larga, topo com duas corcovas — parada, sem paciência */
    seixo({
      corpo: 'M1.9 12.9c-.6-2.4 1-4.6 3.4-5.7 1.9-.9 3-.3 4.4-1.2 1.6-1 2.6-1.9 4.8-1.3 2.6.7 4.4 2 5.4 3.6 1.3 2 1.4 4.2-.6 5.6-2 1.4-5 2-8.5 1.9-4.3-.1-8.3-.6-8.9-2.9Z',
      sombraX: '11.6', sombraR: '8',
      textura: '<path class="pedrinha__brilho" d="M6.2 8.9c1.1-1.1 2.5-1.7 4.1-1.9"/>' +
               '<circle class="pedrinha__pinta" cx="18" cy="12.4" r=".8"/>' +
               '<circle class="pedrinha__pinta" cx="4.5" cy="12.2" r=".6"/>',
      rosto: '<circle class="pedrinha__olho" cx="9.3" cy="10.4" r="1.15"/>' +
             '<circle class="pedrinha__olho" cx="14.2" cy="10.4" r="1.15"/>' +
             '<path class="pedrinha__boca" d="M10 13.4h3.6"/>'
    }),

    /* 2. lascada, de cantos retos — emburrada */
    seixo({
      corpo: 'M2.6 12.4 4.9 6.1l5.4-2.3 5.8 1.5 3.9 4.2-.8 4.9-5.2 2.1-8-1.2Z',
      sombraX: '11.8', sombraR: '7.2',
      textura: '<path class="pedrinha__brilho" d="M6.4 7.3 9.9 5.9"/>' +
               '<path class="pedrinha__pinta" d="m16.4 11.9 1.8 1.4-2.1.9Z"/>' +
               '<circle class="pedrinha__pinta" cx="5.6" cy="12.4" r=".65"/>',
      rosto: '<circle class="pedrinha__olho" cx="9.2" cy="10.1" r="1.1"/>' +
             '<circle class="pedrinha__olho" cx="14" cy="10.1" r="1.1"/>' +
             '<path class="pedrinha__traco" d="M7.6 7.9 10.3 9M15.6 7.9 12.9 9"/>' +
             '<path class="pedrinha__boca" d="M9.9 13.6c.7-.9 2.6-.9 3.4 0"/>'
    }),

    /* 3. em cunha, com bico apontando pra esquerda — assustada */
    seixo({
      corpo: 'M1.7 11.9 7.4 4.6c3.2-1.1 6.9-.5 9.4 1.3 2.7 2 3.3 4.9 1.5 7.2-1.9 2.4-5.8 3.4-9.7 2.8-3.6-.5-6.3-2.2-6.9-4Z',
      sombraX: '12.3', sombraR: '6.9',
      textura: '<path class="pedrinha__brilho" d="M8.4 6.4c1.7-.4 3.4-.2 4.9.5"/>' +
               '<circle class="pedrinha__pinta" cx="16.8" cy="12.4" r=".75"/>' +
               '<circle class="pedrinha__pinta" cx="6.4" cy="12.9" r=".6"/>',
      rosto: '<circle class="pedrinha__olho" cx="9.4" cy="9.3" r="1.4"/>' +
             '<circle class="pedrinha__olho" cx="14.1" cy="9.5" r="1.4"/>' +
             '<ellipse class="pedrinha__olho" cx="11.7" cy="13.1" rx="1.1" ry="1.3"/>'
    }),

    /* 4. com entalhe no ombro esquerdo — rindo da desgraça alheia */
    seixo({
      corpo: 'M2.4 11.5c.1-2.3 1.9-4.1 4.1-5l1.7 1.6 1.7-2.7c3.4-.9 7.3.3 9 2.6 1.9 2.5 1.2 5.6-1.9 7.1-3.1 1.6-7.7 1.7-11 .4-2.4-1-3.7-2.3-3.6-4Z',
      sombraX: '12', sombraR: '7.6',
      textura: '<path class="pedrinha__brilho" d="M12.6 5.6c1.9.1 3.5.7 4.8 1.8"/>' +
               '<circle class="pedrinha__pinta" cx="5.4" cy="13.1" r=".7"/>' +
               '<circle class="pedrinha__pinta" cx="18.2" cy="12.7" r=".6"/>',
      rosto: '<path class="pedrinha__traco" d="M7.9 10.6c.8-1 2.1-1 2.9 0M13.2 10.6c.8-1 2.1-1 2.9 0"/>' +
             '<path class="pedrinha__boca" d="M9.3 13.1c1.3 1.7 3.5 1.7 4.8 0"/>'
    }),

    /* 5. roliça e desigual, mais gorda de um lado — dormindo no prejuízo */
    seixo({
      corpo: 'M3.9 13.7C2 11.5 2.7 7.7 5.6 5.7 8.4 3.8 12.8 3.3 16 4.7c3.4 1.5 4.9 4.5 3.6 7.3-1.3 2.9-5 4.6-9.2 4.4-3.1-.1-5.3-1-6.5-2.7Z',
      sombraX: '11.5', sombraR: '7.4',
      textura: '<path class="pedrinha__brilho" d="M6.9 8c1.3-1.3 3-2 5-2.1"/>' +
               '<circle class="pedrinha__pinta" cx="17.1" cy="12.9" r=".8"/>' +
               '<circle class="pedrinha__pinta" cx="7.2" cy="13.6" r=".55"/>',
      rosto: '<path class="pedrinha__traco" d="M7.7 9.9c.9.9 2.2.9 3 0M13 9.9c.9.9 2.2.9 3 0"/>' +
             '<path class="pedrinha__boca" d="M10.8 13h1.9"/>'
    })
  ];

  /* versão lisa, sem rosto — usada nos ícones miúdos ao lado do nome */
  var PEDRINHA_SVG = seixo({
    corpo: 'M3.9 13.7C2 11.5 2.7 7.7 5.6 5.7 8.4 3.8 12.8 3.3 16 4.7c3.4 1.5 4.9 4.5 3.6 7.3-1.3 2.9-5 4.6-9.2 4.4-3.1-.1-5.3-1-6.5-2.7Z',
    sombraX: '11.5', sombraR: '7.4',
    textura: '<path class="pedrinha__brilho" d="M6.9 8c1.3-1.3 3-2 5-2.1"/>',
    rosto: ''
  });

  /* HTML de uma fileira de pedrinhas, agrupadas em pilhas de 5.
     Acima de `limite` pedrinhas mostra apenas uma pilha + o número, pra não estourar a linha.
     `novas`: quantas do fim devem entrar com animação de queda. */
  function pedrinhasHTML(quantidade, opcoes) {
    opcoes = opcoes || {};
    var limite = opcoes.limite || 12;
    var novas = opcoes.novas || 0;

    if (quantidade <= 0) {
      return '<span class="pedrinhas__vazio">' + escapar(opcoes.textoVazio || 'sem pedrinhas') + '</span>';
    }

    var desenhadas = Math.min(quantidade, limite);
    var html = '';
    var pilha = '';
    var i;

    for (i = 0; i < desenhadas; i++) {
      var eNova = i >= desenhadas - novas;
      pilha += PEDRINHAS_SVG[i % PEDRINHAS_SVG.length]
        .replace('class="pedrinha"', 'class="pedrinha' + (eNova ? ' pedrinha--nova' : '') + '"')
        .replace('<svg ', '<svg style="animation-delay:' + (eNova ? ((i - (desenhadas - novas)) * 60) + 'ms' : '0ms') + '" ');
      if ((i + 1) % 5 === 0 || i === desenhadas - 1) {
        html += '<span class="pedrinhas__pilha">' + pilha + '</span>';
        pilha = '';
      }
    }

    html += '<span class="pedrinhas__total">' + quantidade + '</span>';
    return html;
  }

  /* ------------------------------------------------------- Ciclo de vida */

  /* Roda a função quando o DOM estiver pronto. */
  function pronto(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  /* Service worker: deixa o app abrir sem internet depois da primeira visita.
     Só faz sentido em http(s) — em file:// falha silenciosamente. */
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* segue sem offline */ });
    });
  }

  return {
    qs: qs,
    qsa: qsa,
    escapar: escapar,
    inteiro: inteiro,
    plural: plural,
    abrirModal: abrirModal,
    fecharModal: fecharModal,
    confirmar: confirmar,
    pedirNumero: pedirNumero,
    toast: toast,
    pedrinhasHTML: pedrinhasHTML,
    PEDRINHA_SVG: PEDRINHA_SVG,
    PEDRINHAS_SVG: PEDRINHAS_SVG,
    pronto: pronto
  };
})();
