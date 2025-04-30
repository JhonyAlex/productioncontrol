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
    
    // Actualizar estilo de los botones
    const activeBtn = document.getElementById('active-filter');
    const completedBtn = document.getElementById('completed-filter');
    
    if (filterType === 'active') {
        activeBtn.classList.remove('btn-outline-secondary');
        activeBtn.classList.add('btn-secondary');
        completedBtn.classList.remove('btn-secondary');
        completedBtn.classList.add('btn-outline-secondary');
    } else {
        completedBtn.classList.remove('btn-outline-secondary');
        completedBtn.classList.add('btn-secondary');
        activeBtn.classList.remove('btn-secondary');
        activeBtn.classList.add('btn-outline-secondary');
    }
    
    // Recargar la lista con el filtro aplicado
    loadOrders(); // O la función que uses para cargar y mostrar los pedidos
}

// Modificar tu función existente que muestra los pedidos
function displayOrders(orders) {
    const listView = document.getElementById('list-view');
    listView.innerHTML = '';
    
    orders.forEach(order => {
        const isCompleted = isOrderCompleted(order.id);
        
        // Aplicar filtro
        if ((currentFilter === 'active' && isCompleted) || 
            (currentFilter === 'completed' && !isCompleted)) {
            return;
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
    
    // Configura los event listeners para los botones de filtro
    const activeBtn = document.getElementById('active-filter');
    const completedBtn = document.getElementById('completed-filter');
    
    if (activeBtn && completedBtn) {
        activeBtn.addEventListener('click', function() {
            filterOrders('active');
        });
        
        completedBtn.addEventListener('click', function() {
            filterOrders('completed');
        });
        
        // Establece el filtro activo por defecto
        filterOrders('active');
    }
});

// Asegurar que al cambiar a la pestaña "LISTA" se aplique el filtro
function showTab(tabName) {
    if (tabName === 'list') {
        // Recargar la lista con el filtro actual
        loadOrders();
    }
}