export function getFirebaseErrorMessage(error) {
    switch (error.code) {
        case 'auth/invalid-email': return 'El formato del correo electrónico no es válido.';
        case 'auth/user-disabled': return 'Este usuario ha sido deshabilitado.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential': return 'Correo electrónico o contraseña incorrectos.';
        case 'auth/too-many-requests': return 'Demasiados intentos fallidos. Inténtalo más tarde.';
        default: return 'Error al iniciar sesión. Por favor, inténtalo de nuevo.';
    }
}

export function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    // currentPedidos debe estar accesible globalmente o importarse si es necesario
    const filteredPedidos = (window.currentPedidos || []).filter(pedido => {
        const numeroPedido = pedido.numeroPedido?.toLowerCase() || '';
        const cliente = pedido.cliente?.toLowerCase() || '';
        const maquina = pedido.maquinaImpresion?.toLowerCase() || '';
        return numeroPedido.includes(searchTerm) ||
               cliente.includes(searchTerm) ||
               maquina.includes(searchTerm);
    });
    // Llama a la función global renderActiveView
    if (typeof window.renderActiveView === 'function') {
        window.renderActiveView(filteredPedidos);
    }
}

import { renderKanban } from './kanban.js';
import { renderList } from './listView.js';
window.renderActiveView = function(pedidos) {
    renderKanban(pedidos);
    renderList(pedidos);
};
