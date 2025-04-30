// Variable global para el modo de filtro actual
let currentFilter = 'active';

// Función para verificar si un pedido está completado
function isOrderCompleted(orderId) {
    const completedOrders = JSON.parse(localStorage.getItem('completedOrders')) || [];
    return completedOrders.includes(orderId);
}

// Asegúrate de que esta función sea global para que se pueda llamar desde el HTML
window.filterOrders = function(filterType) {
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
};

// Modifica la función existente que muestra los pedidos para aplicar el filtro
function displayOrders(orders) {
    const listView = document.getElementById('list-view');
    listView.innerHTML = '';
    
    orders.forEach(order => {
        const isCompleted = isOrderCompleted(order.id);
        
        // No mostrar pedidos completados si el filtro es 'active'
        // No mostrar pedidos activos si el filtro es 'completed'
        if ((currentFilter === 'active' && isCompleted) || 
            (currentFilter === 'completed' && !isCompleted)) {
            return;
        }
        
        // Crear el elemento de la orden y agregarlo a la lista
        const orderElement = createOrderElement(order);
        listView.appendChild(orderElement);
    });
}

// Si tienes una función separada que carga los pedidos y llama a displayOrders
function loadAndDisplayOrders() {
    // Obtener las órdenes desde donde sea que las estés guardando
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    
    // Después de cargar los pedidos, llama a displayOrders con el filtro actual aplicado
    displayOrders(orders);
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
    
    // Establecer el filtro por defecto como 'active'
    currentFilter = 'active';
    
    // Resaltar el botón "Activos" por defecto
    const activeButton = document.querySelector('#list-filters button:nth-child(1)');
    if (activeButton) {
        activeButton.classList.remove('btn-outline-secondary');
        activeButton.classList.add('btn-secondary');
    }
    
    // También puedes llamar directamente a filterOrders para asegurar que el filtro se aplique
    filterOrders('active');
    
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