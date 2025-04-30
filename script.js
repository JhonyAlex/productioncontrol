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
        // Crear el elemento para el pedido
        const orderItem = document.createElement('div');
        orderItem.className = 'order-item';
        orderItem.setAttribute('data-id', order.id);
        orderItem.setAttribute('data-tipo', order.tipo); // Asegúrate de que tus pedidos tienen este dato
        
        // Verificar si está completado para ocultarlo inicialmente si es necesario
        const isCompleted = isOrderCompleted(order.id);
        if (isCompleted) {
            orderItem.style.display = 'none'; // Oculta los completados por defecto
        }
        
        orderItem.textContent = `Order ID: ${order.id}, Status: ${isCompleted ? 'Completed' : 'Active'}`;
        listView.appendChild(orderItem);
    });
    
    // Aplicar el filtro de activos/completados actual
    const btnFiltrarActivos = document.getElementById('btn-filtrar-activos');
    const btnFiltrarCompletados = document.getElementById('btn-filtrar-completados');
    
    if (btnFiltrarActivos && btnFiltrarActivos.classList.contains('active')) {
        btnFiltrarActivos.click();
    } else if (btnFiltrarCompletados && btnFiltrarCompletados.classList.contains('active')) {
        btnFiltrarCompletados.click();
    } else if (btnFiltrarActivos) {
        // Por defecto, activar el filtro de activos
        btnFiltrarActivos.click();
    }
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
    
    const btnFiltrarLaminacion = document.getElementById('btn-filtrar-laminacion');
    const btnFiltrarRebobinado = document.getElementById('btn-filtrar-rebobinado');
    const btnFiltrarPerforado = document.getElementById('btn-filtrar-perforado');
    const btnFiltrarPendiente = document.getElementById('btn-filtrar-pendiente');
    const btnFiltrarTodos = document.getElementById('btn-filtrar-todos');
    
    const btnFiltrarActivos = document.getElementById('btn-filtrar-activos');
    const btnFiltrarCompletados = document.getElementById('btn-filtrar-completados');
    
    let filtroCompletados = false;
    
    function activarFiltro(boton) {
        [btnFiltrarLaminacion, btnFiltrarRebobinado, btnFiltrarPerforado, 
         btnFiltrarPendiente, btnFiltrarTodos, btnFiltrarActivos, 
         btnFiltrarCompletados].forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        
        if (boton) boton.classList.add('active');
    }
    
    if (btnFiltrarLaminacion) {
        btnFiltrarLaminacion.addEventListener('click', function() {
            activarFiltro(btnFiltrarLaminacion);
            filtrarPedidos('laminacion', filtroCompletados);
        });
    }
    
    if (btnFiltrarRebobinado) {
        btnFiltrarRebobinado.addEventListener('click', function() {
            activarFiltro(btnFiltrarRebobinado);
            filtrarPedidos('rebobinado', filtroCompletados);
        });
    }
    
    if (btnFiltrarPerforado) {
        btnFiltrarPerforado.addEventListener('click', function() {
            activarFiltro(btnFiltrarPerforado);
            filtrarPedidos('perforado', filtroCompletados);
        });
    }
    
    if (btnFiltrarPendiente) {
        btnFiltrarPendiente.addEventListener('click', function() {
            activarFiltro(btnFiltrarPendiente);
            filtrarPedidos('pendiente', filtroCompletados);
        });
    }
    
    if (btnFiltrarTodos) {
        btnFiltrarTodos.addEventListener('click', function() {
            activarFiltro(btnFiltrarTodos);
            filtrarPedidos('todos', filtroCompletados);
        });
    }
    
    if (btnFiltrarActivos) {
        btnFiltrarActivos.addEventListener('click', function() {
            activarFiltro(btnFiltrarActivos);
            filtroCompletados = false;
            filtrarPedidos('todos', filtroCompletados);
        });
    }
    
    if (btnFiltrarCompletados) {
        btnFiltrarCompletados.addEventListener('click', function() {
            activarFiltro(btnFiltrarCompletados);
            filtroCompletados = true;
            filtrarPedidos('todos', filtroCompletados);
        });
    }
    
    function filtrarPedidos(tipo, mostrarCompletados) {
        const pedidos = document.querySelectorAll('#list-view .order-item');
        
        pedidos.forEach(pedido => {
            const pedidoTipo = pedido.getAttribute('data-tipo');
            const pedidoId = pedido.getAttribute('data-id');
            const esCompletado = isOrderCompleted(pedidoId);
            
            if (mostrarCompletados !== esCompletado) {
                pedido.style.display = 'none';
                return;
            }
            
            if (tipo === 'todos' || pedidoTipo === tipo) {
                pedido.style.display = '';
            } else {
                pedido.style.display = 'none';
            }
        });
    }
    
    filtroCompletados = false;
    filtrarPedidos('perforado', filtroCompletados);
    
    if (activeBtn && completedBtn) {
        activeBtn.addEventListener('click', function() {
            filterOrders('active');
        });
        
        completedBtn.addEventListener('click', function() {
            filterOrders('completed');
        });
        
        filterOrders('active');
    }
    
    // Configurar los botones de filtro
    setupFilterButtons();
});

// Asegurar que al cambiar a la pestaña "LISTA" se aplique el filtro
function showTab(tabName) {
    if (tabName === 'list') {
        loadOrders();
    }
}

// Agregar esta función para manejar los filtros de activos/completados
function setupFilterButtons() {
    const btnFiltrarActivos = document.getElementById('btn-filtrar-activos');
    const btnFiltrarCompletados = document.getElementById('btn-filtrar-completados');
    
    if (btnFiltrarActivos) {
        btnFiltrarActivos.addEventListener('click', function() {
            // Resaltar este botón
            btnFiltrarActivos.classList.add('active');
            if (btnFiltrarCompletados) btnFiltrarCompletados.classList.remove('active');
            
            // Filtrar pedidos para mostrar solo activos
            const pedidos = document.querySelectorAll('#list-view .order-item');
            pedidos.forEach(pedido => {
                const pedidoId = pedido.getAttribute('data-id');
                const esCompletado = isOrderCompleted(pedidoId);
                
                pedido.style.display = esCompletado ? 'none' : '';
            });
        });
    }
    
    if (btnFiltrarCompletados) {
        btnFiltrarCompletados.addEventListener('click', function() {
            // Resaltar este botón
            btnFiltrarCompletados.classList.add('active');
            if (btnFiltrarActivos) btnFiltrarActivos.classList.remove('active');
            
            // Filtrar pedidos para mostrar solo completados
            const pedidos = document.querySelectorAll('#list-view .order-item');
            pedidos.forEach(pedido => {
                const pedidoId = pedido.getAttribute('data-id');
                const esCompletado = isOrderCompleted(pedidoId);
                
                pedido.style.display = esCompletado ? '' : 'none';
            });
        });
    }
    
    // Activar filtro de activos por defecto al cargar la página
    if (btnFiltrarActivos) {
        btnFiltrarActivos.click();
    }
}