const { getColumnColorByClientes } = require('../kanban');

describe('getColumnColorByClientes', () => {
  test('debe retornar verde si todos los pedidos son del mismo cliente', () => {
    const pedidos = [
      { cliente: 'Cliente A' },
      { cliente: 'Cliente A' }
    ];
    expect(getColumnColorByClientes(pedidos)).toBe('lightgreen');
  });

  test('debe retornar gris si hay múltiples clientes', () => {
    const pedidos = [
      { cliente: 'Cliente A' },
      { cliente: 'Cliente B' }
    ];
    expect(getColumnColorByClientes(pedidos)).toBe('lightgray');
  });
});
