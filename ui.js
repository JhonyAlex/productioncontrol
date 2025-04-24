import { openPedidoModal, savePedido, deletePedido, returnToPrintStage } from './pedidoModal.js';
import { handleSearch } from './utils.js';
import { renderKanban } from './kanban.js';
import { renderList } from './listView.js';
import { currentPedidos } from './firestore.js';

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
    }

    // Botón agregar pedido
    const agregarPedidoBtn = document.getElementById('btn-agregar-pedido');
    if (agregarPedidoBtn && !agregarPedidoBtn.dataset.listenerAttached) {
        agregarPedidoBtn.addEventListener('click', () => window.openPedidoModal());
        agregarPedidoBtn.dataset.listenerAttached = 'true';
    }

    // Listeners para los botones de vistas
    document.getElementById('btn-kanban-impresion')?.addEventListener('click', () => switchView('kanban-impresion'));
    document.getElementById('btn-kanban-complementarias')?.addEventListener('click', () => switchView('kanban-complementarias'));
    document.getElementById('btn-lista')?.addEventListener('click', () => switchView('lista'));
    // Botón exportar (a implementar)
    document.getElementById('btn-exportar-lista')?.addEventListener('click', () => alert('Funcionalidad de exportar próximamente.'));
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

    // Renderiza la vista activa
    renderActiveView(currentPedidos || []);
}

export function resetUIOnLogout(domRefs, unsubscribePedidosRef) {
    // Limpia la UI y vuelve a mostrar el login
    if (domRefs && domRefs.loginContainer && domRefs.appContainer && domRefs.userEmailSpan && domRefs.mainContent) {
        domRefs.loginContainer.style.display = 'block';
        domRefs.appContainer.style.display = 'none';
        domRefs.userEmailSpan.textContent = '';
        // En vez de intentar asignar a una expresión inválida, simplemente reemplaza el contenido:
        domRefs.mainContent.innerHTML = '<h1 class="text-center">Por favor, inicia sesión</h1>';
    }
    // Si hay un listener de Firestore, desuscribirse
    if (typeof unsubscribePedidosRef === 'function') {
        unsubscribePedidosRef();
    }
}

// Nueva función para cambiar de vista
function switchView(view) {
    currentView = view;
    // Actualiza clases de los botones
    document.getElementById('btn-kanban-impresion')?.classList.remove('active');
    document.getElementById('btn-kanban-complementarias')?.classList.remove('active');
    document.getElementById('btn-lista')?.classList.remove('active');
    if (view === 'kanban-impresion') document.getElementById('btn-kanban-impresion')?.classList.add('active');
    if (view === 'kanban-complementarias') document.getElementById('btn-kanban-complementarias')?.classList.add('active');
    if (view === 'lista') document.getElementById('btn-lista')?.classList.add('active');
    // Muestra/oculta vistas
    document.getElementById('kanban-board').style.display = (view.startsWith('kanban')) ? '' : 'none';
    document.getElementById('list-view').style.display = (view === 'lista') ? '' : 'none';
    // Renderiza la vista correspondiente
    renderActiveView(currentPedidos || []);
}

// Exponer para uso global
window.switchView = switchView;

// Función global para renderizar la vista activa según currentView
export function renderActiveView(pedidos) {
    // Mostrar/ocultar tabs
    const viewTabs = document.getElementById('view-tabs');
    if (viewTabs) viewTabs.style.display = '';
    // Kanban Impresión
    if (currentView === 'kanban-impresion') {
        renderKanban(pedidos, { only: 'impresion' });
    }
    // Kanban Etapas Complementarias
    else if (currentView === 'kanban-complementarias') {
        renderKanban(pedidos, { only: 'complementarias' });
    }
    // Lista
    else if (currentView === 'lista') {
        renderList(pedidos);
    }
}
window.renderActiveView = renderActiveView;
