import { openPedidoModal, savePedido, deletePedido, returnToPrintStage } from './pedidoModal.js';
import { handleSearch, setupSearchAutocomplete } from './utils.js';
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
        setupSearchAutocomplete();
    }

    // Botón agregar pedido
    const agregarPedidoBtn = document.getElementById('btn-agregar-pedido');
    if (agregarPedidoBtn && !agregarPedidoBtn.dataset.listenerAttached) {
        agregarPedidoBtn.addEventListener('click', () => window.openPedidoModal());
        agregarPedidoBtn.dataset.listenerAttached = 'true';
    }

    // Listeners para los botones de vistas
    const btnKanbanImpresion = document.getElementById('btn-kanban-impresion');
    if (btnKanbanImpresion && !btnKanbanImpresion.dataset.listenerAttached) {
        btnKanbanImpresion.addEventListener('click', () => switchView('kanban-impresion'));
        btnKanbanImpresion.dataset.listenerAttached = 'true';
    }
    const btnKanbanComplementarias = document.getElementById('btn-kanban-complementarias');
    if (btnKanbanComplementarias && !btnKanbanComplementarias.dataset.listenerAttached) {
        btnKanbanComplementarias.addEventListener('click', () => switchView('kanban-complementarias'));
        btnKanbanComplementarias.dataset.listenerAttached = 'true';
    }
    const btnLista = document.getElementById('btn-lista');
    if (btnLista && !btnLista.dataset.listenerAttached) {
        btnLista.addEventListener('click', () => switchView('lista'));
        btnLista.dataset.listenerAttached = 'true';
    }

    // Inicializar el estado de la vista
    initializeViewState();
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
    
    // Aplicar estado de la vista actual al cargar datos
    setTimeout(() => {
        switchView(currentView);
    }, 100);
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

// Nueva función para cambiar de vista
function switchView(view) {
    currentView = view;
    console.log('[switchView] Cambiando a vista:', view);

    // Actualiza clases de los botones
    document.getElementById('btn-kanban-impresion')?.classList.remove('active');
    document.getElementById('btn-kanban-complementarias')?.classList.remove('active');
    document.getElementById('btn-lista')?.classList.remove('active');
    if (view === 'kanban-impresion') document.getElementById('btn-kanban-impresion')?.classList.add('active');
    if (view === 'kanban-complementarias') document.getElementById('btn-kanban-complementarias')?.classList.add('active');
    if (view === 'lista') document.getElementById('btn-lista')?.classList.add('active');

    // Muestra/oculta vistas
    const kanbanBoard = document.getElementById('kanban-board');
    const listView = document.getElementById('list-view');
    if (kanbanBoard) kanbanBoard.style.display = (view.startsWith('kanban')) ? '' : 'none';
    if (listView) listView.style.display = (view === 'lista') ? '' : 'none';

    // Control de visibilidad de los botones de ordenación del kanban
    const kanbanSortButtons = document.getElementById('kanban-sort-buttons');
    if (kanbanSortButtons) {
        kanbanSortButtons.style.display = (view === 'kanban-impresion') ? 'flex' : 'none';
        console.log('[switchView] kanban-sort-buttons:', kanbanSortButtons.style.display);
    }

    // Control de visibilidad del botón exportar (dropdown)
    const exportDropdown = document.getElementById('btn-exportar-dropdown')?.parentElement;
    if (exportDropdown) {
        exportDropdown.style.display = (view === 'lista') ? '' : 'none';
        console.log('[switchView] exportDropdown:', exportDropdown.style.display);
    }

    // Filtros rápidos solo en lista
    const listFilters = document.getElementById('list-filters');
    if (listFilters) listFilters.style.display = (view === 'lista') ? '' : 'none';

    // Renderiza la vista correspondiente
    renderActiveView(currentPedidos || []);
}

// NUEVA FUNCIÓN: Inicializar al cargar la página para asegurar que la vista inicial sea correcta
export function initializeViewState() {
    // Fuerza la aplicación correcta de la visibilidad basada en currentView al inicio
    setTimeout(() => {
        // Asegurarse de que currentView tenga un valor válido
        if (!currentView) currentView = 'kanban-impresion';
        switchView(currentView);
    }, 100);
}

// Exponer para uso global
window.switchView = switchView;

// Función global para renderizar la vista activa según currentView
export function renderActiveView(pedidos) {
    // Mostrar/ocultar tabs
    const viewTabs = document.getElementById('view-tabs');
    if (viewTabs) viewTabs.style.display = '';

    // --- NUEVO: Evita renderizar si pedidos no está listo o es null ---
    if (!Array.isArray(pedidos) || pedidos.length === 0) {
        // Opcional: muestra mensaje de carga o "No hay pedidos"
        const kanbanBoard = document.getElementById('kanban-board');
        const listView = document.getElementById('list-view');
        if (kanbanBoard) kanbanBoard.innerHTML = '<div class="text-center text-muted py-5">Cargando pedidos actualiza la página...</div>';
        if (listView) listView.innerHTML = '';
        return;
    }

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
