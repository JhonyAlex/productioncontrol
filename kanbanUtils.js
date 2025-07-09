export function getColumnColorByClientes(pedidosInEtapa) {
  if (!pedidosInEtapa || pedidosInEtapa.length === 0) {
    return 'hsl(210, 20%, 97%)';
  }

  const counts = {};
  pedidosInEtapa.forEach(p => {
    const cliente = p.cliente || '';
    counts[cliente] = (counts[cliente] || 0) + 1;
  });

  let maxCliente = '';
  let maxCount = 0;
  Object.entries(counts).forEach(([cliente, count]) => {
    if (count > maxCount) {
      maxCount = count;
      maxCliente = cliente;
    }
  });

  const clienteColor = maxCount === 1
    ? pedidosInEtapa[0].cliente || ''
    : maxCliente;
  if (!clienteColor) return 'hsl(210, 20%, 97%)';
  return stringToColor(clienteColor, 90, 96);
}

export function stringToColor(str, s = 60, l = 80) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, ${s}%, ${l}%)`;
}
