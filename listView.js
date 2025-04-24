let currentSort = { key: null, asc: true };
let currentFilters = {};
let quickStageFilter = null; // Puede ser 'laminacion', 'rebobinado', 'perforado', 'pendiente' o null

function normalizeValue(val) {
    if (typeof val === 'string') return val.toLowerCase().trim();
    if (typeof val === 'number') return val;
    return val || '';
}

export function renderList(pedidos) {
    const listView = document.getElementById('list-view');
    if (!listView) {
        console.error("renderList: Elemento #list-view no encontrado.");
        return;
    }

    // --- Filtros rápidos y ordenamiento (sin inputs de filtro por columna) ---
    let filteredPedidos = pedidos.slice();
    if (quickStageFilter) {
        const startsWith = {
            laminacion: 'lamin',
            rebobinado: 'rebob',
            perforado: 'perfor',
            pendiente: 'pendiente'
        };
        filteredPedidos = filteredPedidos.filter(p =>
            (p.etapaActual || '').toLowerCase().startsWith(startsWith[quickStageFilter])
        );
    }

    // Aplica ordenamiento
    if (currentSort.key) {
        filteredPedidos.sort((a, b) => {
            let va = a[currentSort.key], vb = b[currentSort.key];
            if (!isNaN(Number(va)) && !isNaN(Number(vb))) {
                va = Number(va); vb = Number(vb);
            } else {
                va = normalizeValue(va); vb = normalizeValue(vb);
            }
            if (va < vb) return currentSort.asc ? -1 : 1;
            if (va > vb) return currentSort.asc ? 1 : -1;
            return 0;
        });
    }

    const columns = [
        { key: 'numeroPedido', label: 'Nº Pedido' },
        { key: 'cliente', label: 'Cliente' },
        { key: 'maquinaImpresion', label: 'Máquina Imp.' },
        { key: 'desarrTexto', label: 'Desarr.' },
        { key: 'metros', label: 'Metros' },
        { key: 'superficie', label: 'SUP' },
        { key: 'transparencia', label: 'TTE' },
        { key: 'capa', label: 'Capa' },
        { key: 'camisa', label: 'Camisa' },
        { key: 'fecha', label: 'Fecha' },
        { key: 'etapaActual', label: 'Etapa Actual' },
        { key: 'acciones', label: 'Acciones' }
    ];

    let tableHTML = `
        <table class="table table-striped table-hover table-bordered">
            <thead>
                <tr>
                    ${columns.map(col => `
                        <th style="cursor:pointer;" data-key="${col.key}">
                            ${col.label}
                            ${currentSort.key === col.key ? (currentSort.asc ? '▲' : '▼') : ''}
                        </th>
                    `).join('')}
                </tr>
            </thead>
            <tbody>
    `;

    if (filteredPedidos.length === 0) {
        tableHTML += '<tr><td colspan="12" class="text-center">No hay pedidos para mostrar.</td></tr>';
    } else {
        filteredPedidos.forEach(pedido => {
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

    // --- Listeners para ordenamiento ---
    columns.forEach(col => {
        const th = listView.querySelector(`th[data-key="${col.key}"]`);
        if (th) {
            th.onclick = () => {
                if (currentSort.key === col.key) {
                    currentSort.asc = !currentSort.asc;
                } else {
                    currentSort.key = col.key;
                    currentSort.asc = true;
                }
                renderList(pedidos);
            };
        }
    });
}

// --- NUEVO: listeners para los botones de filtro rápido ---
if (typeof window !== 'undefined') {
    setTimeout(() => {
        const btns = [
            { id: 'btn-filtrar-laminacion', val: 'laminacion' },
            { id: 'btn-filtrar-rebobinado', val: 'rebobinado' },
            { id: 'btn-filtrar-perforado', val: 'perforado' },
            { id: 'btn-filtrar-pendiente', val: 'pendiente' },
            { id: 'btn-filtrar-todos', val: null }
        ];
        btns.forEach(({ id, val }) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.onclick = () => {
                    quickStageFilter = val;
                    btns.forEach(({ id }) => {
                        const b = document.getElementById(id);
                        if (b) b.classList.remove('active');
                    });
                    if (val !== null) btn.classList.add('active');
                    else document.getElementById('btn-filtrar-todos').classList.add('active');
                    renderList(window.currentPedidos || []);
                };
            }
        });
    }, 0);
}
