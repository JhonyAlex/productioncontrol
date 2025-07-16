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

    // Botón agregar pedido - CORREGIDO: Usar window.openPedidoModal directamente
    const agregarPedidoBtn = document.getElementById('btn-agregar-pedido');
    if (agregarPedidoBtn) {
        // Eliminamos listeners anteriores para evitar duplicados
        agregarPedidoBtn.replaceWith(agregarPedidoBtn.cloneNode(true));
        const newBtn = document.getElementById('btn-agregar-pedido');
        newBtn.addEventListener('click', function() {
            window.openPedidoModal(); // Asegurarse de usar la función global
        });
        newBtn.dataset.listenerAttached = 'true';
    }

    // Botón "Gráficos" dentro de la pestaña Lista
    const btnGraficos = document.getElementById('btn-graficos');
    if (btnGraficos && !btnGraficos.dataset.listenerAttached) {
        btnGraficos.addEventListener('click', () => {
            // Asegura que la pestaña de lista esté activa antes de hacer scroll
            const tabLista = document.getElementById('tab-lista');
            if (tabLista && !tabLista.classList.contains('active')) {
                // Activa la pestaña de lista usando Bootstrap
                const tab = new bootstrap.Tab(tabLista);
                tab.show();
                // Espera a que la pestaña esté visible antes de hacer scroll
                setTimeout(() => {
                    const reportes = document.getElementById('reportes-graficos');
                    if (reportes) reportes.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 250);
            } else {
                const reportes = document.getElementById('reportes-graficos');
                if (reportes) reportes.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
        btnGraficos.dataset.listenerAttached = 'true';
    }

    // NUEVO: Listener para tabs Bootstrap
    document.querySelectorAll('#vista-tabs button[data-bs-toggle="tab"]').forEach(tabBtn => {
        tabBtn.addEventListener('shown.bs.tab', (event) => {
            const targetId = event.target.getAttribute('data-bs-target');
            if (targetId === '#tab-pane-kanban-impresion') {
                renderKanban(currentPedidos || [], { only: 'impresion' });
                document.getElementById('reportes-graficos').style.display = 'none';
            } else if (targetId === '#tab-pane-kanban-complementarias') {
                renderKanban(currentPedidos || [], { only: 'complementarias' });
                document.getElementById('reportes-graficos').style.display = 'none';
            } else if (targetId === '#tab-pane-lista') {
                renderList(currentPedidos || []);
                document.getElementById('reportes-graficos').style.display = '';
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
    kanbanBoard.innerHTML = '<div class="text-center text-muted py-5">Cargando pedidos...</div>';
    listView.innerHTML = '';

    // Renderiza el Kanban de impresión por defecto al cargar datos
    renderKanban(currentPedidos || [], { only: 'impresion' });

    // Oculta los reportes al inicio
    const reportes = document.getElementById('reportes-graficos');
    if (reportes) reportes.style.display = 'none';
}

// Asegúrate de que también se renderiza el Kanban cuando llegan nuevos datos de Firestore
window.onPedidosDataUpdate = function(pedidos) {
    // Renderiza el Kanban de impresión si la pestaña activa es impresión o si es el inicio
    const tabImpresion = document.getElementById('tab-kanban-impresion');
    if (tabImpresion && tabImpresion.classList.contains('active')) {
        if (!pedidos || pedidos.length === 0) {
            const kanbanBoard = document.getElementById('kanban-board');
            if (kanbanBoard) {
                kanbanBoard.innerHTML = '<div class="text-center text-muted py-5">No hay pedidos para mostrar.</div>';
            }
        } else {
            renderKanban(pedidos, { only: 'impresion' });
        }
    }
};

export function resetUIOnLogout(domRefs, unsubscribePedidosRef) {
    // Limpia la UI y vuelve a mostrar el login
    if (domRefs && domRefs.loginContainer && domRefs.appContainer && domRefs.userEmailSpan && domRefs.mainContent) {
        domRefs.loginContainer.style.display = 'block';
        domRefs.appContainer.style.display = 'none';
        domRefs.userEmailSpan.textContent = '';
        // En vez de intentar asignar a una expresión inválida, simplemente reemplaza el contenido:
        domRefs.mainContent.innerHTML = '<h1 class="text-center">Cargando pedidos, actualiza la página.</h1>';
    }
    // Limpia el Kanban y la lista al cerrar sesión
    const kanbanBoard = document.getElementById('kanban-board');
    if (kanbanBoard) kanbanBoard.innerHTML = '';
    const kanbanBoardComp = document.getElementById('kanban-board-complementarias');
    if (kanbanBoardComp) kanbanBoardComp.innerHTML = '';
    const listView = document.getElementById('list-view');
    if (listView) listView.innerHTML = '';
    // Si hay un listener de Firestore, desuscribirse
    if (typeof unsubscribePedidosRef === 'function') {
        unsubscribePedidosRef();
    }
}
