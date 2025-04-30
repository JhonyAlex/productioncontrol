// Add this function to check if an order is in the completed list
function isOrderCompleted(orderId) {
    const completedOrders = JSON.parse(localStorage.getItem('completedOrders')) || [];
    return completedOrders.includes(orderId);
}

// Modify the existing function that displays orders
function displayOrders(orders) {
    const listView = document.getElementById('list-view');
    listView.innerHTML = '';
    
    // Filtering orders based on the current mode
    const filterMode = localStorage.getItem('orderFilterMode') || 'active';
    
    orders.forEach(order => {
        const isCompleted = isOrderCompleted(order.id);
        
        // Skip this order if it's completed and we're showing active orders,
        // or if it's not completed and we're showing completed orders
        if ((isCompleted && filterMode === 'active') || 
            (!isCompleted && filterMode === 'completed')) {
            return;
        }
        
        const orderItem = document.createElement('div');
        orderItem.className = 'order-item';
        // Populate the order item
        orderItem.textContent = `Order ID: ${order.id}, Status: ${isCompleted ? 'Completed' : 'Active'}`;
        
        listView.appendChild(orderItem);
    });
}

// Add this function to handle the filter buttons
document.addEventListener('DOMContentLoaded', function() {
    const listView = document.getElementById('list-view');
    
    // Set default filter mode to 'active' if not already set
    if (!localStorage.getItem('orderFilterMode')) {
        localStorage.setItem('orderFilterMode', 'active');
    }
    
    const activeBtn = document.getElementById('active-orders-btn');
    const completedBtn = document.getElementById('completed-orders-btn');
    
    if (activeBtn && completedBtn) {
        // Apply styles to the active button based on the saved filter
        const currentFilter = localStorage.getItem('orderFilterMode') || 'active';
        if (currentFilter === 'active') {
            activeBtn.classList.add('active');
            completedBtn.classList.remove('active');
        } else {
            completedBtn.classList.add('active');
            activeBtn.classList.remove('active');
        }
        
        // Set up events for the buttons
        activeBtn.addEventListener('click', function() {
            localStorage.setItem('orderFilterMode', 'active');
            activeBtn.classList.add('active');
            completedBtn.classList.remove('active');
            
            // Reload the list with the new filter
            loadOrders(); // Assuming you have a function loadOrders() that loads and displays orders
        });
        
        completedBtn.addEventListener('click', function() {
            localStorage.setItem('orderFilterMode', 'completed');
            completedBtn.classList.add('active');
            activeBtn.classList.remove('active');
            
            // Reload the list with the new filter
            loadOrders(); // Assuming you have a function loadOrders() that loads and displays orders
        });
    }
});

// If you have a function that handles tab changes, ensure orders are reloaded
// with the correct filter when switching to the LIST tab
function handleTabChange(tabName) {
    if (tabName === 'list') {
        // Load orders applying the saved filter
        loadOrders();
    }
}