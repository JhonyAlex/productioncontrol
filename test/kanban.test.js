import { getColumnColorByClientes, stringToColor } from '../kanbanUtils.js';

describe('getColumnColorByClientes', () => {
  test('debe retornar el color del cliente cuando todos son iguales', () => {
    const pedidos = [
      { cliente: 'Cliente A' },
      { cliente: 'Cliente A' }
    ];
    expect(getColumnColorByClientes(pedidos)).toBe(stringToColor('Cliente A', 90, 96));
  });

  test('debe retornar el color del cliente más frecuente o el primero', () => {
    const pedidos = [
      { cliente: 'Cliente A' },
      { cliente: 'Cliente B' }
    ];
    expect(getColumnColorByClientes(pedidos)).toBe(stringToColor('Cliente A', 90, 96));
  });
});
