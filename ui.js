import { openPedidoModal, savePedido, deletePedido, returnToPrintStage } from './pedidoModal.js';
import { handleSearch } from './utils.js';
import { renderKanban } from './kanban.js';
import { renderList } from './listView.js';
import { currentPedidos } from './firestore.js';

export function initializeAppEventListeners() {
    const pedidoForm = document.getElementById('pedido-form');
    const deletePedidoBtn = document.getElementById('delete-pedido-btn');
    const returnToPrintBtn = document.getElementById('return-to-print-btn');
    const searchInput = document.getElementById('search-input');

    if (pedidoForm && !pedidoForm.dataset.listenerAttached) {
        pedidoForm.addEventListener('submit', savePedido);
        pedidoForm.dataset.listenerAttached = 'true';
    }
    if (deletePedidoBtn && !deletePedidoBtn.dataset.listenerAttached) {
        deletePedidoBtn.addEventListener('click', deletePedido);
        deletePedidoBtn.dataset.listenerAttached = 'true';
    }
    if (returnToPrintBtn && !returnToPrintBtn.dataset.listenerAttached) {
        returnToPrintBtn.addEventListener('click', returnToPrintStage);
        returnToPrintBtn.dataset.listenerAttached = 'true';
    }
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
}

export function loadMainAppData() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    // Crea los contenedores si no existen
    let kanbanBoard = document.getElementById('kanban-board');
    if (!kanbanBoard) {
        kanbanBoard = document.createElement('div');
        kanbanBoard.id = 'kanban-board';
        mainContent.appendChild(kanbanBoard);
    }
    let listView = document.getElementById('list-view');
    if (!listView) {
        listView = document.createElement('div');
        listView.id = 'list-view';
        mainContent.appendChild(listView);
    }

    // Limpia los contenedores
    kanbanBoard.innerHTML = '';
    listView.innerHTML = '';

    // Renderiza Kanban y lista si hay pedidos
    if (currentPedidos && currentPedidos.length > 0) {
        renderKanban(currentPedidos);
        renderList(currentPedidos);
    } else {
        mainContent.innerHTML = '<h2 class="text-center">No hay pedidos para mostrar.</h2>';
    }
}

export function resetUIOnLogout(domRefs, unsubscribePedidosRef) {
    // Limpia la UI y vuelve a mostrar el login
    if (domRefs && domRefs.loginContainer && domRefs.appContainer && domRefs.userEmailSpan && domRefs.mainContent) {
        domRefs.loginContainer.style.display = 'block';
        domRefs.appContainer.style.display = 'none';
        domRefs.userEmailSpan.textContent = '';
        domRefs.mainContent.innerHTML = '<h1 class="text-center">Por favor, inicia sesión</h1>';
    }
    // Si hay un listener de Firestore, desuscribirse
    if (typeof unsubscribePedidosRef === 'function') {
        unsubscribePedidosRef();
    }
}
