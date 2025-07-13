// Funciones de renderizado de columnas y tableros
import { etapasImpresion, etapasComplementarias } from '../firestore.js';
import { updatePedido } from '../firestore.js';
import { createKanbanCard, getColumnColorByClientes } from './card.js';
import { setupKanbanScrolling, trackBoardScroll, enableKanbanDragToScroll, fixAllContainerTranslates, setContainerPosition } from './scroll.js';
import { openPedidoModal } from '../pedidoModal.js';

let kanbanSortKey = 'secuenciaPedido';
let kanbanSortAsc = true;

export function renderJKanban(pedidos, options = {}) {
    const boardId = options.only === 'complementarias' ? '#kanban-board-complementarias' : '#kanban-board';
    const boardElement = document.querySelector(boardId);
    if (!boardElement || !window.jKanban) return;

    const etapas = options.only === 'impresion'
        ? etapasImpresion
        : options.only === 'complementarias'
            ? etapasComplementarias
            : [...etapasImpresion, ...etapasComplementarias];

    const boards = etapas.map(etapa => ({ id: etapa, title: etapa, item: [] }));
    const pedidosPorEtapa = {};
    etapas.forEach(e => pedidosPorEtapa[e] = []);

    pedidos.forEach(p => {
        const board = boards.find(b => b.id === p.etapaActual);
        if (board) {
            const card = createKanbanCard(p);
            board.item.push({ id: p.id, class: 'kanban-card', title: card.innerHTML });
            pedidosPorEtapa[board.id].push(p);
        }
    });

    boardElement.classList.add('jkanban-active');
    const prevScroll = boardElement.scrollLeft;
    boardElement.innerHTML = '';
    const kanban = new window.jKanban({
        element: boardId,
        boards,
        click: el => {
            const id = el.getAttribute('data-eid');
            if (id) openPedidoModal(id);
        },
        dropEl: (el, target) => {
            const id = el.getAttribute('data-eid');
            const stage = target.parentElement.getAttribute('data-id');
            const scrollBefore = boardElement.scrollLeft;
            if (id && stage) updatePedido(window.db, id, { etapaActual: stage });
            requestAnimationFrame(() => { boardElement.scrollLeft = scrollBefore; });
        }
    });

    requestAnimationFrame(() => { boardElement.scrollLeft = prevScroll; });
    trackBoardScroll(boardElement);
    enableKanbanDragToScroll(boardElement);

    Object.entries(pedidosPorEtapa).forEach(([etapa, pedidosEtapa]) => {
        const color = getColumnColorByClientes(pedidosEtapa);
        const boardEl = kanban.findBoard(etapa);
        if (boardEl) boardEl.style.background = color;
    });
}

function createKanbanGroup(etapasInGroup, allPedidos) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'kanban-group';
    groupDiv.style.width = '100%';
    groupDiv.style.overflowX = 'hidden';

    const columnsContainer = document.createElement('div');
    columnsContainer.className = 'kanban-columns-container';

    const columnWidth = 300;
    const columnContentWidth = columnWidth - 27;
    let totalWidth = 0;
    for (let i = 0; i < etapasInGroup.length; i++) {
        totalWidth += columnContentWidth;
        if (i < etapasInGroup.length - 1) totalWidth += 10;
    }
    columnsContainer.style.width = `${totalWidth}px`;
    columnsContainer.style.minWidth = `${totalWidth}px`;
    columnsContainer.style.display = 'flex';
    columnsContainer.style.flexDirection = 'row';
    columnsContainer.style.flexWrap = 'nowrap';
    columnsContainer.style.gap = '10px';

    etapasInGroup.forEach(etapa => {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'kanban-column';
        columnDiv.dataset.etapa = etapa;
        columnDiv.style.width = `${columnContentWidth}px`;
        columnDiv.style.minWidth = `${columnContentWidth}px`;
        columnDiv.style.flexShrink = '0';
        const pedidosInEtapa = allPedidos.filter(p => p.etapaActual === etapa);
        columnDiv.style.background = getColumnColorByClientes(pedidosInEtapa);
        columnDiv.innerHTML = `<h5>${etapa}</h5>`;
        pedidosInEtapa.forEach(pedido => {
            const card = createKanbanCard(pedido);
            columnDiv.appendChild(card);
        });
        columnsContainer.appendChild(columnDiv);
    });

    groupDiv.appendChild(columnsContainer);
    return groupDiv;
}

export function renderKanban(pedidos, options = {}) {
    let kanbanBoard = options.only === 'complementarias'
        ? document.getElementById('kanban-board-complementarias')
        : document.getElementById('kanban-board');
    if (!kanbanBoard) return;
    kanbanBoard.innerHTML = '';

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

    if (!options.only || options.only === 'impresion') {
        const printingGroup = createKanbanGroup(etapasImpresion, sortedPedidos);
        kanbanBoard.appendChild(printingGroup);
    }
    if (!options.only || options.only === 'complementarias') {
        const complementaryGroup = createKanbanGroup(etapasComplementarias, sortedPedidos);
        kanbanBoard.appendChild(complementaryGroup);
    }

    setupKanbanScrolling();
    fixAllContainerTranslates();
    trackBoardScroll(kanbanBoard);
}
