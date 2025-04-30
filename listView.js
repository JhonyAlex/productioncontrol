import { etapasImpresion, etapasComplementarias } from './firestore.js';
import { updatePedido } from './firestore.js';

let currentSort = { key: null, asc: true };
let currentFilters = {};
let showCompleted = false; // NUEVO: Estado para filtro Activos/Completados
let quickStageFilter = null; // Puede ser 'laminacion', 'rebobinado', 'perforado', 'pendiente' o null

function normalizeValue(val) {
    if (typeof val === 'string') return val.toLowerCase().trim();
    if (typeof val === 'number') return val;
    return val || '';
}

function etapaToColor(etapa) {
    let hash = 0;
    for (let i = 0; i < etapa.length; i++) {
        hash = etapa.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 40%, 85%)`;
}

// --- NUEVO: función para color de cliente consistente ---
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 60%, 80%)`;
}

export function renderList(pedidos) {
    const listView = document.getElementById('list-view');
    if (!listView) {
        console.error("renderList: Elemento #list-view no encontrado.");
        return;
    }

    // --- Filtros rápidos y ordenamiento (sin inputs de filtro por columna) ---
    // --- NUEVO: Aplicar filtro Activos/Completados PRIMERO ---
    let basePedidos = pedidos.filter(p => {
        const esCompletado = (p.etapaActual || '').toLowerCase() === 'completado';
        return showCompleted ? esCompletado : !esCompletado;
    });

    // Aplicar filtro rápido de etapa (laminacion, etc.) sobre los pedidos ya filtrados por estado
    let filteredPedidos = pedidos.slice();
    if (quickStageFilter) {
        const startsWith = {
            laminacion: 'lamin',
            rebobinado: 'rebob',
            perforado: 'perfor',
            pendiente: 'pendiente'
        };
        filteredPedidos = basePedidos.filter(p => // Filtrar sobre basePedidos
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
        { key: 'secuenciaPedido', label: 'Nº Secuencia' },
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
        tableHTML += '<tr><td colspan="13" class="text-center">No hay pedidos para mostrar.</td></tr>';
    } else {
        filteredPedidos.forEach(pedido => {
            const etapaColor = etapaToColor(pedido.etapaActual || '');
            // --- NUEVO: badge de cliente con color consistente ---
            let clienteBadge = '';
            if (pedido.cliente) {
                const color = stringToColor(pedido.cliente);
                clienteBadge = `<span class="badge badge-cliente ms-1" style="background:${color};color:#333;font-size:0.75em;">${pedido.cliente}</span>`;
            }
            tableHTML += `
                <tr>
                    <td>${pedido.secuenciaPedido || ''}</td>
                    <td>${pedido.numeroPedido || 'N/A'}</td>
                    <td>${clienteBadge || '-'}</td>
                    <td>${pedido.maquinaImpresion || 'N/A'}</td>
                    <td>${pedido.desarrTexto || ''}${pedido.desarrNumero ? ` (${pedido.desarrNumero})` : ''}</td>
                    <td>${pedido.metros || '-'}</td>
                    <td>${pedido.superficie === 'true' ? 'Sí' : 'No'}</td>
                    <td>${pedido.transparencia === 'true' ? 'Sí' : 'No'}</td>
                    <td>${pedido.capa || '-'}</td>
                    <td>${pedido.camisa || '-'}</td>
                    <td>${pedido.fecha || '-'}</td>
                    <td>
                        <span class="badge etapa-badge-lista etapa-actual-editable" 
                              style="background:${etapaColor};color:#333;font-size:0.95em;cursor:pointer;"
                              data-pedido-id="${pedido.id}">
                            ${pedido.etapaActual || 'N/A'}
                        </span>
                    </td>
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

    // --- NUEVO: Listener para editar etapa actual ---
    listView.querySelectorAll('.etapa-actual-editable').forEach(span => {
        span.addEventListener('click', function (e) {
            const pedidoId = this.dataset.pedidoId;
            const pedido = (window.currentPedidos || []).find(p => p.id === pedidoId);
            if (!pedido) return;

            // Evita múltiples selects
            if (this.querySelector('select')) return;

            // Determina las etapas posibles para este pedido
            let etapas = [];
            if (pedido.etapasSecuencia && Array.isArray(pedido.etapasSecuencia) && pedido.etapasSecuencia.length > 0) {
                // Incluye todas las etapas de la secuencia + TODAS las complementarias (sin duplicados)
                etapas = pedido.etapasSecuencia
                    .concat(etapasComplementarias)
                    .filter((etapa, idx, arr) => arr.indexOf(etapa) === idx)
                    .concat(['Completado']);
            } else {
                etapas = etapasImpresion.concat(etapasComplementarias, ['Completado']);
            }

            // Crea el select
            const select = document.createElement('select');
            select.className = 'form-select form-select-sm';
            select.style.minWidth = '120px';
            etapas.forEach(etapa => {
                const opt = document.createElement('option');
                opt.value = etapa;
                opt.textContent = etapa;
                if (etapa === pedido.etapaActual) opt.selected = true;
                select.appendChild(opt);
            });

            // Reemplaza el span por el select temporalmente
            this.innerHTML = '';
            this.appendChild(select);
            select.focus();

            // Al perder foco o cambiar, actualiza la etapa
            select.addEventListener('change', async function () {
                const nuevaEtapa = this.value;
                if (nuevaEtapa !== pedido.etapaActual) {
                    try {
                        await updatePedido(window.db, pedidoId, { etapaActual: nuevaEtapa });
                        // La UI se actualizará automáticamente por el listener de Firestore
                    } catch (err) {
                        alert('Error al actualizar la etapa.');
                    }
                }
            });
            select.addEventListener('blur', function () {
                // Si no cambió, vuelve a mostrar el texto
                span.textContent = select.value;
            });
        });
    });

    // Guardar la referencia a los pedidos filtrados para las exportaciones
    window.currentFilteredPedidos = filteredPedidos;

    // --- NUEVO: Actualizar gráficos si estamos en vista lista ---
    if (typeof window.renderGraficosReportes === 'function' && document.getElementById('reportes-graficos')?.style.display !== 'none') {
        window.renderGraficosReportes(filteredPedidos);
    }
}

// --- NUEVO: listeners para los botones de filtro rápido ---
if (typeof window !== 'undefined') {
    setTimeout(() => {
        const btns = [
            { id: 'btn-filtrar-laminacion', val: 'laminacion' },
            { id: 'btn-filtrar-rebobinado', val: 'rebobinado' },
            { id: 'btn-filtrar-perforado', val: 'perforado' },
            { id: 'btn-filtrar-pendiente', val: 'pendiente' },
            { id: 'btn-filtrar-todos', val: null },
            { id: 'btn-filtrar-activos', val: 'activos' },     // NUEVO
            { id: 'btn-filtrar-completados', val: 'completados' } // NUEVO
        ];
        btns.forEach(({ id, val }) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.onclick = () => {
                    // --- NUEVO: Manejar filtros Activos/Completados ---
                    btns.forEach(({ id }) => {
                        const b = document.getElementById(id);
                        if (b) b.classList.remove('active');
                    });
                    if (val !== null) btn.classList.add('active');
                    else document.getElementById('btn-filtrar-todos').classList.add('active');
                    renderList(window.currentPedidos || []);

                    if (val === 'activos') {
                        showCompleted = false;
                        quickStageFilter = null; // Resetea el filtro de etapa
                    } else if (val === 'completados') {
                        showCompleted = true;
                        quickStageFilter = null; // Resetea el filtro de etapa
                    } else {
                        // Si es un filtro de etapa, asegúrate de que no esté activo el de completados
                        showCompleted = false;
                        quickStageFilter = val;
                    }
                    renderList(window.currentPedidos || []); // Re-renderizar con el nuevo estado
                };
            }
        });
    }, 0);
}
