import { etapasImpresion, etapasComplementarias } from './firestore.js';
import { openPedidoModal, completeStage } from './pedidoModal.js';
import { updatePedido } from './firestore.js';

function stringToColor(str, s = 60, l = 80) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, ${s}%, ${l}%)`;
}

function cardHtml(pedido) {
    let fechaDisplay = '';
    if (pedido.fecha) {
        const dateStr = (typeof pedido.fecha === 'string') ? pedido.fecha.slice(0,10) : new Date(pedido.fecha).toISOString().slice(0,10);
        fechaDisplay = ` (${dateStr})`;
    }
    const clienteBadge = pedido.cliente ? `<span class="badge ms-1" style="background:${stringToColor(pedido.cliente)};color:#333;font-size:0.75em;margin-right:0.5em;">${pedido.cliente}</span>` : '';
    const metrosBadge = pedido.metros ? `<span class="badge bg-secondary ms-1" style="font-size:0.75em;">${pedido.metros} m</span>` : '';
    const etapasHtml = pedido.etapasSecuencia && pedido.etapasSecuencia.length > 0
        ? `<div class="etapas-display">Secuencia: ${pedido.etapasSecuencia.filter(et => !etapasImpresion.includes(et)).join(' -> ') || 'N/A'}</div>`
        : '';

    let etapaBtnText = '';
    let showEtapaBtn = false;
    if (pedido.etapaActual !== 'Completado' && Array.isArray(pedido.etapasSecuencia)) {
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
        } else {
            const lastEtapa = pedido.etapasSecuencia[pedido.etapasSecuencia.length - 1];
            if (pedido.etapaActual !== lastEtapa) {
                etapaBtnText = 'Siguiente trabajo';
                showEtapaBtn = true;
            }
        }
    }

    return `
<div class="kanban-card" data-id="${pedido.id}">
  <div class="kanban-card-header">
    ${clienteBadge}
    <div>${metrosBadge}</div>
  </div>
  <div class="kanban-card-body">
    <div style="font-weight:bold;font-size:1em;margin-bottom:0.2em;">${pedido.numeroPedido || 'N/A'}${fechaDisplay}</div>
    <p><strong>Máquina:</strong> ${pedido.maquinaImpresion || 'N/A'}</p>
    ${etapasHtml}
  </div>
  <div class="kanban-card-footer">
    <button class="btn btn-sm btn-outline-primary" onclick="openPedidoModal('${pedido.id}')">Ver/Editar</button>
    ${showEtapaBtn ? `<button class="btn btn-sm btn-outline-success mt-1" onclick="completeStage('${pedido.id}')">${etapaBtnText}</button>` : ''}
  </div>
</div>`;
}

function buildBoards(pedidos, etapas) {
    const boards = etapas.map(et => ({ id: et, title: et, item: [] }));
    pedidos.forEach(p => {
        const board = boards.find(b => b.id === p.etapaActual);
        if (board) {
            board.item.push({ id: p.id, title: cardHtml(p) });
        }
    });
    return boards;
}

export function renderKanban(pedidos, options = {}) {
    if (!window.jKanban) {
        console.warn('jKanban library not loaded');
        return;
    }

    const only = options.only || 'impresion';
    if (only === 'impresion') {
        renderSingle('#kanban-board', etapasImpresion, pedidos);
    } else if (only === 'complementarias') {
        renderSingle('#kanban-board-complementarias', etapasComplementarias, pedidos);
    } else {
        renderSingle('#kanban-board', etapasImpresion, pedidos);
        renderSingle('#kanban-board-complementarias', etapasComplementarias, pedidos);
    }
}

function renderSingle(selector, etapas, pedidos) {
    const el = document.querySelector(selector);
    if (!el) return;
    const boards = buildBoards(pedidos, etapas);
    el.innerHTML = '';
    new window.jKanban({
        element: selector,
        boards,
        dragBoards: false,
        click: (el) => {
            const id = el.dataset.eid;
            if (id) openPedidoModal(id);
        },
        dropEl: (el, target) => {
            const id = el.dataset.eid;
            const stage = target.parentElement.getAttribute('data-id');
            if (id && stage) updatePedido(window.db, id, { etapaActual: stage });
        }
    });
}
