const { filterPedidosBase } = require('../listView.js');

describe('filterPedidosBase', () => {
  const pedidos = [
    { id: 1, etapaActual: 'Laminación SL2' },
    { id: 2, etapaActual: 'Rebobinado S2DT' },
    { id: 3, etapaActual: 'Completado' }
  ];

  test('filtra solo laminación', () => {
    const result = filterPedidosBase(pedidos, { quickStageFilter: 'laminacion' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  test('excluye completados cuando showCompleted es false', () => {
    const result = filterPedidosBase(pedidos, { showCompleted: false });
    expect(result.some(p => p.etapaActual === 'Completado')).toBe(false);
  });
});
