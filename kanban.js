// Dependencias necesarias (ajusta los imports según tu estructura real)
import { etapasImpresion, etapasComplementarias, currentPedidos } from './firestore.js'; // O ajusta según donde declares estas variables
import { openPedidoModal, completeStage } from './pedidoModal.js';
import { updatePedido } from './firestore.js';

// Variables para ordenación
let kanbanSortKey = 'secuenciaPedido'; // 'secuenciaPedido' o 'cliente'
let kanbanSortAsc = true;

// Renderiza el tablero Kanban
export function renderKanban(pedidos, options = {}) {
    let kanbanBoard;
    if (options.only === 'complementarias') {
        kanbanBoard = document.getElementById('kanban-board-complementarias');
    } else {
        kanbanBoard = document.getElementById('kanban-board');
    }
    if (!kanbanBoard) {
        console.error("renderKanban: Elemento de Kanban no encontrado.");
        return;
    }
    console.log(`Renderizando Kanban con ${pedidos.length} pedidos.`);
    kanbanBoard.innerHTML = ''; // Limpiar contenido previo

    // --- NUEVO: Ordenar pedidos según selección ---
    let sortedPedidos = pedidos.slice();
    if (kanbanSortKey === 'cliente') {
        sortedPedidos.sort((a, b) => {
            const va = (a.cliente || '').toLowerCase();
            const vb = (b.cliente || '').toLowerCase();
            if (va < vb) return kanbanSortAsc ? -1 : 1;
            if (va > vb) return kanbanSortAsc ? 1 : -1;
            return 0;
        });
    } else {
        sortedPedidos.sort((a, b) => {
            const va = Number(a.secuenciaPedido) || 0;
            const vb = Number(b.secuenciaPedido) || 0;
            return kanbanSortAsc ? va - vb : vb - va;
        });
    }

    // --- CORREGIDO: Actualizar solo contenido, no visibilidad ---
    let sortContainer = document.getElementById('kanban-sort-buttons');
    if (sortContainer) {
        sortContainer.innerHTML = `
            <button class="btn btn-outline-secondary btn-sm${kanbanSortKey === 'secuenciaPedido' ? ' active' : ''}" id="btn-kanban-sort-secuencia">Ordenar por Nº Secuencia</button>
            <button class="btn btn-outline-secondary btn-sm${kanbanSortKey === 'cliente' ? ' active' : ''}" id="btn-kanban-sort-cliente">Ordenar por Cliente</button>
            <button class="btn btn-outline-secondary btn-sm" id="btn-kanban-sort-toggle">${kanbanSortAsc ? 'Ascendente' : 'Descendente'}</button>
        `;
        
        document.getElementById('btn-kanban-sort-secuencia').onclick = () => {
            kanbanSortKey = 'secuenciaPedido';
            renderKanban(window.currentPedidos || [], options);
        };
        document.getElementById('btn-kanban-sort-cliente').onclick = () => {
            kanbanSortKey = 'cliente';
            renderKanban(window.currentPedidos || [], options);
        };
        document.getElementById('btn-kanban-sort-toggle').onclick = () => {
            kanbanSortAsc = !kanbanSortAsc;
            renderKanban(window.currentPedidos || [], options);
        };
    }

    // Renderiza solo el grupo solicitado
    if (!options.only || options.only === 'impresion') {
        const printingGroup = createKanbanGroup(null, etapasImpresion, sortedPedidos);
        kanbanBoard.appendChild(printingGroup);
    }
    if (!options.only || options.only === 'complementarias') {
        const complementaryGroup = createKanbanGroup(null, etapasComplementarias, sortedPedidos);
        kanbanBoard.appendChild(complementaryGroup);
    }

    // Listeners de drag & drop
    addDragAndDropListeners();

    // Habilitar drag-to-scroll horizontal en el contenedor correcto
    enableKanbanDragToScroll(kanbanBoard);
}

function createKanbanGroup(groupTitle, etapasInGroup, allPedidos) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'kanban-group';
    const columnsContainer = document.createElement('div');
    columnsContainer.className = 'kanban-columns-container';

    etapasInGroup.forEach(etapa => {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'kanban-column';
        columnDiv.dataset.etapa = etapa;
        columnDiv.innerHTML = `<h5>${etapa}</h5>`;

        // Filtrar pedidos para la etapa actual
        const pedidosInEtapa = allPedidos.filter(p => p.etapaActual === etapa);

        pedidosInEtapa.forEach(pedido => {
            const card = createKanbanCard(pedido);
            columnDiv.appendChild(card);
        });

        columnsContainer.appendChild(columnDiv);
    });

    groupDiv.appendChild(columnsContainer);
    return groupDiv;
}

function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 60%, 80%)`;
}

function etapaToColor(etapa) {
    let hash = 0;
    for (let i = 0; i < etapa.length; i++) {
        hash = etapa.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 40%, 85%)`;
}

function createKanbanCard(pedido) {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.id = `pedido-${pedido.id}`;
    card.draggable = true;
    card.dataset.id = pedido.id;

    const fechaDisplay = pedido.fecha ? ` (${pedido.fecha})` : '';
    let clienteBadge = '';
    if (pedido.cliente) {
        const color = stringToColor(pedido.cliente);
        clienteBadge = `<span class="badge badge-cliente ms-1" style="background:${color};color:#333;font-size:0.75em;">${pedido.cliente}</span>`;
    }
    const metrosBadge = pedido.metros
        ? `<span class="badge bg-secondary ms-1" style="font-size:0.75em;">${pedido.metros} m</span>`
        : '';

    const etapasHtml = pedido.etapasSecuencia && pedido.etapasSecuencia.length > 0
        ? `<div class="etapas-display">Secuencia: ${
            pedido.etapasSecuencia
                .filter(et => !etapasImpresion.includes(et))
                .join(' -> ') || 'N/A'
        }</div>`
        : '';

    let etapaBtnText = '';
    let showEtapaBtn = false;
    if (pedido.etapaActual !== 'Completado' && pedido.etapasSecuencia && pedido.etapasSecuencia.length > 0) {
        const idx = pedido.etapasSecuencia.indexOf(pedido.etapaActual);
        if (etapasImpresion.includes(pedido.etapaActual)) {
            etapaBtnText = 'Iniciar trabajo';
            showEtapaBtn = true;
        } else if (idx > -1 && idx < pedido.etapasSecuencia.length - 1) {
            etapaBtnText = 'Siguiente trabajo';
            showEtapaBtn = true;
        } else if (idx === pedido.etapasSecuencia.length - 1) {
            etapaBtnText = 'Completar';
            showEtapaBtn = true;
        }
    }

    const etapaColor = etapaToColor(pedido.etapaActual || '');

    card.innerHTML = `
        <div class="kanban-card-header">
            <h6>${pedido.numeroPedido || 'N/A'}${fechaDisplay}</h6>
            <div>
                ${clienteBadge}
                ${metrosBadge}
            </div>
        </div>
        <div class="kanban-card-body">
            <p><strong>Máquina:</strong> ${pedido.maquinaImpresion || 'N/A'}</p>
            <div class="etapa-badge-kanban" style="background:${etapaColor};color:#333;display:inline-block;padding:0.2em 0.7em;border-radius:0.7em;font-size:0.85em;margin-bottom:0.3em;">
                ${pedido.etapaActual || ''}
            </div>
            ${etapasHtml}
        </div>
        <div class="kanban-card-footer">
            <button class="btn btn-sm btn-outline-primary" onclick="openPedidoModal('${pedido.id}')">Ver/Editar</button>
            ${showEtapaBtn ? `<button class="btn btn-sm btn-outline-success mt-1" onclick="completeStage('${pedido.id}')">${etapaBtnText}</button>` : ''}
        </div>
    `;
    return card;
}

// Drag & Drop
export function addDragAndDropListeners() {
    const cards = document.querySelectorAll('.kanban-card');
    const columns = document.querySelectorAll('.kanban-column');

    cards.forEach(card => {
        card.removeEventListener('dragstart', dragStart);
        card.removeEventListener('dragend', dragEnd);
        card.addEventListener('dragstart', dragStart);
        card.addEventListener('dragend', dragEnd);
    });

    columns.forEach(column => {
        column.removeEventListener('dragover', dragOver);
        column.removeEventListener('dragenter', dragEnter);
        column.removeEventListener('dragleave', dragLeave);
        column.removeEventListener('drop', drop);
        column.addEventListener('dragover', dragOver);
        column.addEventListener('dragenter', dragEnter);
        column.addEventListener('dragleave', dragLeave);
        column.addEventListener('drop', drop);
    });
    console.log(`Listeners D&D añadidos a ${cards.length} tarjetas y ${columns.length} columnas.`);
}

let draggedItemId = null;

function dragStart(e) {
    const card = e.target.closest('.kanban-card');
    if (!card || !card.dataset.id) {
        e.preventDefault();
        draggedItemId = null;
        return;
    }
    draggedItemId = card.dataset.id;
    e.dataTransfer.setData('text/plain', draggedItemId);
    setTimeout(() => card.classList.add('dragging'), 0);
    console.log(`Drag Start: ${draggedItemId}`);
}

function dragEnd(e) {
    const card = e.target.closest('.kanban-card');
    if (card) card.classList.remove('dragging');
    draggedItemId = null;
    console.log("Drag End");
}

function dragOver(e) {
    e.preventDefault();
}

function dragEnter(e) {
    e.preventDefault();
    const column = e.target.closest('.kanban-column');
    if (column) {
        column.classList.add('drag-over');
        console.log(`Drag Enter: Column ${column.dataset.etapa}`);
    }
}

function dragLeave(e) {
    const column = e.target.closest('.kanban-column');
    if (column) {
        if (!column.contains(e.relatedTarget)) {
            column.classList.remove('drag-over');
            console.log(`Drag Leave: Column ${column.dataset.etapa}`);
        }
    } else {
        document.querySelectorAll('.kanban-column.drag-over').forEach(c => c.classList.remove('drag-over'));
    }
}

async function drop(e) {
    e.preventDefault();
    const column = e.target.closest('.kanban-column');
    if (!column) return;

    column.classList.remove('drag-over');
    const pedidoId = e.dataTransfer.getData('text/plain');
    const nuevaEtapa = column.dataset.etapa;

    try {
        await updatePedido(window.db, pedidoId, { etapaActual: nuevaEtapa });
        // --- NUEVO: Actualiza la UI localmente para feedback inmediato ---
        if (typeof renderKanban === 'function' && window.currentPedidos) {
            // Actualiza el pedido localmente
            const pedidosActualizados = window.currentPedidos.map(p =>
                p.id === pedidoId ? { ...p, etapaActual: nuevaEtapa } : p
            );
            // Detecta si estamos en impresión o complementarias
            const kanbanBoard = column.closest('#kanban-board-complementarias') ? 'complementarias' : 'impresion';
            renderKanban(pedidosActualizados, { only: kanbanBoard });
        }
        console.log(`Pedido ${pedidoId} movido a etapa ${nuevaEtapa}`);
    } catch (error) {
        alert("Error al mover el pedido. Intenta de nuevo.");
    }
}

function enableKanbanDragToScroll(container) {
    let isDown = false;
    let startX;
    let scrollLeft;

    container.addEventListener('mousedown', (e) => {
        if (e.target.closest('.kanban-card')) return;
        isDown = true;
        container.classList.add('drag-scroll-active');
        container.classList.add('no-user-select');
        startX = e.pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
    });
    container.addEventListener('mouseleave', () => {
        isDown = false;
        container.classList.remove('drag-scroll-active');
        container.classList.remove('no-user-select');
    });
    container.addEventListener('mouseup', () => {
        isDown = false;
        container.classList.remove('drag-scroll-active');
        container.classList.remove('no-user-select');
    });
    container.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - container.offsetLeft;
        const walk = (x - startX) * 1.2;
        container.scrollLeft = scrollLeft - walk;
    });

    container.addEventListener('touchstart', (e) => {
        if (e.target.closest('.kanban-card')) return;
        isDown = true;
        container.classList.add('no-user-select');
        startX = e.touches[0].pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
    });
    container.addEventListener('touchend', () => {
        isDown = false;
        container.classList.remove('no-user-select');
    });
    container.addEventListener('touchmove', (e) => {
        if (!isDown) return;
        const x = e.touches[0].pageX - container.offsetLeft;
        const walk = (x - startX) * 1.2;
        container.scrollLeft = scrollLeft - walk;
    });
}
