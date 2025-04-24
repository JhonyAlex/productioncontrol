// Dependencias necesarias (ajusta los imports según tu estructura real)
import { etapasImpresion, etapasComplementarias, currentPedidos } from './firestore.js'; // O ajusta según donde declares estas variables
import { addDragAndDropListeners } from './kanban.js'; // Si hay dependencia circular, ajusta
import { openPedidoModal, completeStage } from './pedidoModal.js';
import { db } from './app.js'; // Asegúrate de exponer db en window o importar correctamente
import { updatePedido } from './firestore.js';

// Renderiza el tablero Kanban
export function renderKanban(pedidos) {
    const kanbanBoard = document.getElementById('kanban-board');
    if (!kanbanBoard) {
        console.error("renderKanban: Elemento #kanban-board no encontrado.");
        return;
    }
    console.log(`Renderizando Kanban con ${pedidos.length} pedidos.`);
    kanbanBoard.innerHTML = ''; // Limpiar contenido previo

    // Grupo 1: Etapas de impresión
    const printingGroup = createKanbanGroup("Impresión", etapasImpresion, pedidos);
    kanbanBoard.appendChild(printingGroup);

    // Grupo 2: Etapas complementarias
    const complementaryGroup = createKanbanGroup("Etapas Complementarias", etapasComplementarias, pedidos);
    kanbanBoard.appendChild(complementaryGroup);

    // Listeners de drag & drop
    addDragAndDropListeners();

    // Habilitar drag-to-scroll horizontal
    enableKanbanDragToScroll(kanbanBoard);
}

function createKanbanGroup(groupTitle, etapasInGroup, allPedidos) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'kanban-group';
    groupDiv.innerHTML = `<h4>${groupTitle}</h4>`;

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

function createKanbanCard(pedido) {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.id = `pedido-${pedido.id}`;
    card.draggable = true;
    card.dataset.id = pedido.id;

    // Formateo de campos
    const fechaDisplay = pedido.fecha ? ` (${pedido.fecha})` : '';
    const superficieDisplay = pedido.superficie === 'true' ? ' <span class="badge bg-info text-dark">SUP</span>' : '';
    const transparenciaDisplay = pedido.transparencia === 'true' ? ' <span class="badge bg-secondary">TTE</span>' : '';
    const etapasHtml = pedido.etapasSecuencia && pedido.etapasSecuencia.length > 0
        ? `<div class="etapas-display">Secuencia: ${pedido.etapasSecuencia.join(' -> ')}</div>`
        : '';

    card.innerHTML = `
        <div class="kanban-card-header">
            <h6>${pedido.numeroPedido || 'N/A'}${fechaDisplay}</h6>
            <div>
              ${superficieDisplay}
              ${transparenciaDisplay}
            </div>
        </div>
        <div class="kanban-card-body">
            ${pedido.cliente ? `<p><strong>Cliente:</strong> ${pedido.cliente}</p>` : ''}
            <p><strong>Máquina:</strong> ${pedido.maquinaImpresion || 'N/A'}</p>
            ${pedido.desarrTexto ? `<p><strong>Desarr:</strong> ${pedido.desarrTexto}${pedido.desarrNumero ? ` (${pedido.desarrNumero})` : ''}</p>` : ''}
            ${pedido.metros ? `<p><strong>Metros:</strong> ${pedido.metros}</p>` : ''}
            ${pedido.capa ? `<p><strong>Capa:</strong> ${pedido.capa}</p>` : ''}
            ${pedido.camisa ? `<p><strong>Camisa:</strong> ${pedido.camisa}</p>` : ''}
            ${pedido.observaciones ? `<p><strong>Obs:</strong> ${pedido.observaciones}</p>` : ''}
            ${etapasHtml}
        </div>
        <div class="kanban-card-footer">
            <button class="btn btn-sm btn-outline-primary" onclick="openPedidoModal('${pedido.id}')">Ver/Editar</button>
            ${pedido.etapaActual !== 'Completado' && pedido.etapasSecuencia && pedido.etapasSecuencia.length > 0 ?
                `<button class="btn btn-sm btn-outline-success mt-1" onclick="completeStage('${pedido.id}')">Completar Etapa</button>` : ''
            }
        </div>
    `;
    return card;
}

// Drag & Drop
export function addDragAndDropListeners() {
    const cards = document.querySelectorAll('.kanban-card');
    const columns = document.querySelectorAll('.kanban-column');

    cards.forEach(card => {
        card.addEventListener('dragstart', dragStart);
        card.addEventListener('dragend', dragEnd);
    });

    columns.forEach(column => {
        column.addEventListener('dragover', dragOver);
        column.addEventListener('dragenter', dragEnter);
        column.addEventListener('dragleave', dragLeave);
        column.addEventListener('drop', drop);
    });
    console.log(`Listeners D&D añadidos a ${cards.length} tarjetas y ${columns.length} columnas.`);
}

let draggedItemId = null;

function dragStart(e) {
    draggedItemId = e.target.dataset.id;
    e.dataTransfer.setData('text/plain', draggedItemId);
    setTimeout(() => e.target.classList.add('dragging'), 0);
    console.log(`Drag Start: ${draggedItemId}`);
}

function dragEnd(e) {
    e.target.classList.remove('dragging');
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

    // Actualiza la etapa en Firestore
    try {
        await updatePedido(db, pedidoId, { etapaActual: nuevaEtapa });
        console.log(`Pedido ${pedidoId} movido a etapa ${nuevaEtapa}`);
    } catch (error) {
        alert("Error al mover el pedido. Intenta de nuevo.");
    }
}

// --- DRAG TO SCROLL HORIZONTAL EN KANBAN ---
function enableKanbanDragToScroll(container) {
    let isDown = false;
    let startX;
    let scrollLeft;

    // Evita conflicto con drag de tarjetas
    container.addEventListener('mousedown', (e) => {
        // Solo si el click no es sobre una tarjeta Kanban
        if (e.target.closest('.kanban-card')) return;
        isDown = true;
        container.classList.add('drag-scroll-active');
        startX = e.pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
    });
    container.addEventListener('mouseleave', () => {
        isDown = false;
        container.classList.remove('drag-scroll-active');
    });
    container.addEventListener('mouseup', () => {
        isDown = false;
        container.classList.remove('drag-scroll-active');
    });
    container.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - container.offsetLeft;
        const walk = (x - startX) * 1.2; // Ajusta la velocidad si quieres
        container.scrollLeft = scrollLeft - walk;
    });

    // Soporte touch
    container.addEventListener('touchstart', (e) => {
        if (e.target.closest('.kanban-card')) return;
        isDown = true;
        startX = e.touches[0].pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
    });
    container.addEventListener('touchend', () => {
        isDown = false;
    });
    container.addEventListener('touchmove', (e) => {
        if (!isDown) return;
        const x = e.touches[0].pageX - container.offsetLeft;
        const walk = (x - startX) * 1.2;
        container.scrollLeft = scrollLeft - walk;
    });
}
