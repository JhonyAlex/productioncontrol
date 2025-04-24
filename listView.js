export function renderList(pedidos) {
    const listView = document.getElementById('list-view');
    if (!listView) {
        console.error("renderList: Elemento #list-view no encontrado.");
        return;
    }
    console.log(`Renderizando Lista con ${pedidos.length} pedidos.`);

    // Ordenar pedidos, por ejemplo, por numeroPedido
    pedidos.sort((a, b) => (a.numeroPedido || '').localeCompare(b.numeroPedido || ''));

    let tableHTML = `
        <table class="table table-striped table-hover table-bordered">
            <thead>
                <tr>
                    <th>Nº Pedido</th>
                    <th>Cliente</th>
                    <th>Máquina Imp.</th>
                    <th>Desarr.</th>
                    <th>Metros</th>
                    <th>SUP</th>
                    <th>TTE</th>
                    <th>Capa</th>
                    <th>Camisa</th>
                    <th>Fecha</th>
                    <th>Etapa Actual</th>
                    <th>Secuencia</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (pedidos.length === 0) {
        tableHTML += '<tr><td colspan="13" class="text-center">No hay pedidos para mostrar.</td></tr>';
    } else {
        pedidos.forEach(pedido => {
            const secuenciaStr = pedido.etapasSecuencia ? pedido.etapasSecuencia.join(', ') : 'N/A';
            tableHTML += `
                <tr>
                    <td>${pedido.numeroPedido || 'N/A'}</td>
                    <td>${pedido.cliente || '-'}</td>
                    <td>${pedido.maquinaImpresion || 'N/A'}</td>
                    <td>${pedido.desarrTexto || ''}${pedido.desarrNumero ? ` (${pedido.desarrNumero})` : ''}</td>
                    <td>${pedido.metros || '-'}</td>
                    <td>${pedido.superficie === 'true' ? 'Sí' : 'No'}</td>
                    <td>${pedido.transparencia === 'true' ? 'Sí' : 'No'}</td>
                    <td>${pedido.capa || '-'}</td>
                    <td>${pedido.camisa || '-'}</td>
                    <td>${pedido.fecha || '-'}</td>
                    <td><span class="badge bg-primary">${pedido.etapaActual || 'N/A'}</span></td>
                    <td style="font-size: 0.8em;">${secuenciaStr}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="openPedidoModal('${pedido.id}')">
                            <i class="bi bi-pencil-square"></i> Editar
                        </button>
                    </td>
                </tr>
            `;
        });
    }

    tableHTML += `
            </tbody>
        </table>
    `;

    listView.innerHTML = tableHTML;
}
