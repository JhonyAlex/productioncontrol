
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

  test('debe retornar gris si hay múltiples clientes', async () => {
    const { getColumnColorByClientes } = await import('../kanban.js');
    const pedidos = [
      { cliente: 'Cliente A' },
      { cliente: 'Cliente B' }
    ];
    expect(getColumnColorByClientes(pedidos)).toBe('lightgray');
  });
});
