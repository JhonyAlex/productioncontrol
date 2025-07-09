const { getColumnColorByClientes } = require('../kanban.js');

describe('getColumnColorByClientes', () => {
  test('retorna un color hsl cuando hay pedidos', () => {
    const pedidos = [
      { cliente: 'Cliente A' },
      { cliente: 'Cliente A' }
    ];
    const color = getColumnColorByClientes(pedidos);
    expect(color.startsWith('hsl(')).toBe(true);
  });

  test('retorna color neutro cuando no hay pedidos', () => {
    const color = getColumnColorByClientes([]);
    expect(color).toBe('hsl(210, 20%, 97%)');
  });
});
