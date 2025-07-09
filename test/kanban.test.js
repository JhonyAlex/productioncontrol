

describe('getColumnColorByClientes', () => {
  test('debe retornar verde si todos los pedidos son del mismo cliente', async () => {
    const { getColumnColorByClientes } = await import('../kanban.js');
    const pedidos = [
      { cliente: 'Cliente A' },
      { cliente: 'Cliente A' }
    ];
    expect(getColumnColorByClientes(pedidos)).toBe('lightgreen');
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
