// Add this function to check if an order is in the completed list
function isOrderCompleted(orderId) {
    // Get the completed orders from local storage
    const completedOrders = JSON.parse(localStorage.getItem('completedOrders')) || [];
    return completedOrders.includes(orderId);
}

// Modify the existing function that displays orders
function displayOrders(orders) {
    const listView = document.getElementById('list-view');
    listView.innerHTML = '';
    
    // Get the current filter mode (if it's 'completed', show only completed orders)
    const filterMode = listView.dataset.filterMode || 'active';
    
    orders.forEach(order => {
        // Check if the order is completed
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
function setupFilterButtons() {
    const listView = document.getElementById('list-view');
    const activeBtn = document.getElementById('active-orders-btn');
    const completedBtn = document.getElementById('completed-orders-btn');
    
    activeBtn.addEventListener('click', () => {
        listView.dataset.filterMode = 'active';
        activeBtn.classList.add('active');
        completedBtn.classList.remove('active');
        displayOrders(currentOrders); // Assuming you have a currentOrders variable
    });
    
    completedBtn.addEventListener('click', () => {
        listView.dataset.filterMode = 'completed';
        completedBtn.classList.add('active');
        activeBtn.classList.remove('active');
        displayOrders(currentOrders); // Assuming you have a currentOrders variable
    });
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Set default filter mode to active
    const listView = document.getElementById('list-view');
    listView.dataset.filterMode = 'active';
    
    // Setup the filter buttons
    setupFilterButtons();
});