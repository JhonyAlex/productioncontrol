const { addDoc } = require('https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js');
const { savePedido } = require('../pedidoModal.js');

describe('savePedido', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <form id="pedido-form">
        <input id="pedido-id" value="" />
        <input id="numeroPedido" />
        <input id="cliente" />
        <select id="maquinaImpresion"><option value="M1">M1</option></select>
        <input id="desarrTexto" />
        <input id="desarrNumero" />
        <input id="metros" />
        <select id="superficie"></select>
        <select id="transparencia"></select>
        <input id="capa" />
        <input id="camisa" />
        <input id="fecha" />
        <div id="fecha-error" class="d-none"></div>
        <textarea id="observaciones"></textarea>
        <input id="secuenciaPedido" />
        <div id="secuenciaPedido-error" class="d-none"></div>
      </form>
      <ul id="etapas-secuencia-list"></ul>
    `;
    window.currentPedidos = [];
    window.pedidosCollection = {};
    window.db = {};
    addDoc.mockClear();
  });

  test('muestra error si secuenciaPedido es menor a 1000', async () => {
    document.getElementById('numeroPedido').value = '1';
    document.getElementById('maquinaImpresion').value = 'M1';
    document.getElementById('fecha').value = '2023-01-01T10:00';
    document.getElementById('secuenciaPedido').value = '500';

    await savePedido({ preventDefault: () => {} });

    expect(document.getElementById('secuenciaPedido-error').classList.contains('d-none')).toBe(false);
    expect(addDoc).not.toHaveBeenCalled();
  });
});
