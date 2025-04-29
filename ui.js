import { openPedidoModal, savePedido, deletePedido, returnToPrintStage } from './pedidoModal.js';
import { handleSearch, setupSearchAutocomplete } from './utils.js';
import { renderKanban } from './kanban.js';
import { renderList } from './listView.js';
import { currentPedidos } from './firestore.js';
import { renderGraficosReportes } from './reportesGraficos.js'; // NUEVO

let currentView = 'kanban-impresion'; // vista por defecto

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
        setupSearchAutocomplete();
    }

    // Botón agregar pedido
    const agregarPedidoBtn = document.getElementById('btn-agregar-pedido');
    if (agregarPedidoBtn && !agregarPedidoBtn.dataset.listenerAttached) {
        agregarPedidoBtn.addEventListener('click', () => window.openPedidoModal());
        agregarPedidoBtn.dataset.listenerAttached = 'true';
    }

    // NUEVO: Listener para tabs Bootstrap
    document.querySelectorAll('#vista-tabs button[data-bs-toggle="tab"]').forEach(tabBtn => {
        tabBtn.addEventListener('shown.bs.tab', (event) => {
            const targetId = event.target.getAttribute('data-bs-target');
            if (targetId === '#tab-pane-kanban-impresion') {
                renderKanban(currentPedidos || [], { only: 'impresion' });
            } else if (targetId === '#tab-pane-kanban-complementarias') {
                renderKanban(currentPedidos || [], { only: 'complementarias' });
            } else if (targetId === '#tab-pane-lista') {
                renderList(currentPedidos || []);
                if (typeof renderGraficosReportes === 'function') {
                    renderGraficosReportes(window.currentFilteredPedidos || currentPedidos || []);
                }
            }
        });
    });
}

export function loadMainAppData() {
    const mainContent = document.getElementById('main-content');
    // Mostrar el contenedor principal y ocultar el login (por si acaso)
    const appContainer = document.getElementById('app-container');
    const loginContainer = document.getElementById('login-container');
    if (appContainer) appContainer.style.display = 'block';
    if (loginContainer) loginContainer.style.display = 'none';
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

    // Renderiza la vista activa por defecto (Impresión)
    renderKanban(currentPedidos || [], { only: 'impresion' });
}

export function resetUIOnLogout(domRefs, unsubscribePedidosRef) {
    // Limpia la UI y vuelve a mostrar el login
    if (domRefs && domRefs.loginContainer && domRefs.appContainer && domRefs.userEmailSpan && domRefs.mainContent) {
        domRefs.loginContainer.style.display = 'block';
        domRefs.appContainer.style.display = 'none';
        domRefs.userEmailSpan.textContent = '';
        // En vez de intentar asignar a una expresión inválida, simplemente reemplaza el contenido:
        domRefs.mainContent.innerHTML = '<h1 class="text-center">Cargando pedidos, actualiza la página.</h1>';
    }
    // Si hay un listener de Firestore, desuscribirse
    if (typeof unsubscribePedidosRef === 'function') {
        unsubscribePedidosRef();
    }
}
