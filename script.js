// Variable global para el modo de filtro actual
let currentFilter = 'active';

// Función para verificar si un pedido está completado
function isOrderCompleted(orderId) {
    const completedOrders = JSON.parse(localStorage.getItem('completedOrders')) || [];
    return completedOrders.includes(orderId);
}

// Función para filtrar órdenes según el tipo (activas o completadas)
function filterOrders(filterType) {
    currentFilter = filterType;
    
    // Actualizar estilo de los botones (usando clases de Bootstrap)
    const filterButtons = document.querySelectorAll('#list-filters .btn');
    filterButtons.forEach(button => {
        if ((button.innerText === 'Activos' && filterType === 'active') ||
            (button.innerText === 'Completados' && filterType === 'completed')) {
            button.classList.remove('btn-outline-secondary');
            button.classList.add('btn-secondary');
        } else {
            button.classList.remove('btn-secondary');
            button.classList.add('btn-outline-secondary');
        }
    });
    
    // Recargar la lista con el filtro aplicado
    loadAndDisplayOrders();
}

// Función que carga y muestra las órdenes con el filtro aplicado
function loadAndDisplayOrders() {
    // Obtener las órdenes desde donde sea que las estés guardando
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    
    const listView = document.getElementById('list-view');
    listView.innerHTML = '';
    
    orders.forEach(order => {
        const isCompleted = isOrderCompleted(order.id);
        
        // Filtrar según el modo actual
        if ((currentFilter === 'active' && isCompleted) || 
            (currentFilter === 'completed' && !isCompleted)) {
            return; // No mostrar esta orden
        }
        
        // Crear el elemento de la orden y agregarlo a la lista
        const orderElement = createOrderElement(order);
        listView.appendChild(orderElement);
    });
}

// Función para crear un elemento de orden (puedes adaptarla a tu estructura existente)
function createOrderElement(order) {
    const orderItem = document.createElement('div');
    orderItem.className = 'order-item';
    orderItem.textContent = `Order ID: ${order.id}, Status: ${isOrderCompleted(order.id) ? 'Completed' : 'Active'}`;
    return orderItem;
}

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    const listView = document.getElementById('list-view');
    
    // Establecer el filtro por defecto como 'activo'
    currentFilter = 'active';
    
    // Aplicar estilo al botón activo por defecto usando clases de Bootstrap
    const filterButtons = document.querySelectorAll('#list-filters .btn');
    filterButtons.forEach(button => {
        if (button.innerText === 'Activos') {
            button.classList.remove('btn-outline-secondary');
            button.classList.add('btn-secondary');
        }
    });
    
    // Cargar órdenes con el filtro por defecto
    loadAndDisplayOrders();
    
    const activeBtn = document.getElementById('active-orders-btn');
    const completedBtn = document.getElementById('completed-orders-btn');
    
    if (activeBtn && completedBtn) {
        activeBtn.addEventListener('click', function() {
            filterOrders('active');
        });
        
        completedBtn.addEventListener('click', function() {
            filterOrders('completed');
        });
    }
});

// Asegurar que al cambiar a la pestaña "LISTA" se aplique el filtro
function showTab(tabName) {
    if (tabName === 'list') {
        // Recargar la lista con el filtro actual
        loadAndDisplayOrders();
    }
}