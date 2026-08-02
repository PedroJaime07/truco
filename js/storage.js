/* Leitura/escrita no localStorage, com tolerância a falhas
   (modo privado do Safari, cota cheia, JSON corrompido). */

var Storage = (function () {
  var CHAVES = {
    truco: 'truco_state',
    fodinha: 'fodinha_state'
  };

  var disponivel = (function () {
    try {
      var t = '__teste_placar__';
      window.localStorage.setItem(t, '1');
      window.localStorage.removeItem(t);
      return true;
    } catch (e) {
      return false;
    }
  })();

  /* memória volátil de reserva quando o localStorage não está disponível */
  var reserva = {};

  function ler(chave) {
    try {
      var bruto = disponivel ? window.localStorage.getItem(chave) : reserva[chave];
      if (!bruto) return null;
      return JSON.parse(bruto);
    } catch (e) {
      console.warn('Estado salvo ilegível, descartando:', chave, e);
      remover(chave);
      return null;
    }
  }

  function escrever(chave, valor) {
    var bruto;
    try {
      bruto = JSON.stringify(valor);
    } catch (e) {
      console.error('Não foi possível serializar o estado:', e);
      return false;
    }
    try {
      if (disponivel) window.localStorage.setItem(chave, bruto);
      else reserva[chave] = bruto;
      return true;
    } catch (e) {
      console.warn('Não foi possível salvar (cota?):', e);
      reserva[chave] = bruto;
      return false;
    }
  }

  function remover(chave) {
    try {
      if (disponivel) window.localStorage.removeItem(chave);
    } catch (e) { /* ignora */ }
    delete reserva[chave];
  }

  return {
    CHAVES: CHAVES,
    disponivel: disponivel,
    ler: ler,
    escrever: escrever,
    remover: remover
  };
})();
