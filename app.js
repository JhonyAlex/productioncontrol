// app.js

// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, collection } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Import Firebase Config
import { firebaseConfig } from './firebaseConfig.js'; // Adjust path if needed

// Import Modularized Functions
import { initializeAppEventListeners } from './ui.js';
import { setupAuthListeners, observeAuthState } from './auth.js';
import { listenToPedidos } from './firestore.js';

// Firebase Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const pedidosCollection = collection(db, "pedidos");

// Expose global references if needed
window.auth = auth;
window.db = db;
window.pedidosCollection = pedidosCollection;
// Flag to switch between the custom Kanban and jKanban implementation
window.useJKanban = true;

console.log("Firebase inicializado.");

let unsubscribePedidos = null;

// Initialize DOM Elements and Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeAppEventListeners();
    setupAuthListeners(auth, {
        loginForm: document.getElementById('login-form'),
        emailInput: document.getElementById('email'),
        passwordInput: document.getElementById('password'),
        loginError: document.getElementById('login-error'),
        logoutButton: document.getElementById('logout-button'),
        forgotPasswordLink: document.getElementById('forgot-password-link'), // NUEVO
        registerButton: document.getElementById('register-button'),         // NUEVO
        authMessage: document.getElementById('auth-message')                // NUEVO
    });
    observeAuthState(auth, {
        loginContainer: document.getElementById('login-container'),
        appContainer: document.getElementById('app-container'),
        userEmailSpan: document.getElementById('user-email'),
        mainContent: document.getElementById('main-content')
    }, () => {
        // Al cerrar sesión, desuscribirse de Firestore
        if (typeof unsubscribePedidos === 'function') unsubscribePedidos();
    });

    // Inicializar los filtros de la vista de lista
    import('./listView.js').then(mod => {
        if (typeof mod.initializeFilterButtons === 'function') {
            mod.initializeFilterButtons();
        }
    });

    // Suscribirse a los pedidos de Firestore y actualizar la UI en tiempo real
    unsubscribePedidos = listenToPedidos(pedidosCollection, (pedidos) => {
        // --- Actualiza todas las vistas en tiempo real ---
        window.currentPedidos = pedidos;
        
        // Actualiza Kanban si la pestaña de impresión o complementarias está activa
        const tabImpresion = document.getElementById('tab-kanban-impresion');
        const tabComplementarias = document.getElementById('tab-kanban-complementarias');
        const tabLista = document.getElementById('tab-lista');
        if (tabImpresion && tabImpresion.classList.contains('active')) {
            import('./kanban.js').then(mod => {
                if (window.useJKanban && mod.renderJKanban) {
                    mod.renderJKanban(pedidos, { only: 'impresion' });
                } else {
                    mod.renderKanban(pedidos, { only: 'impresion' });
                }
            });
        } else if (tabComplementarias && tabComplementarias.classList.contains('active')) {
            import('./kanban.js').then(mod => {
                if (window.useJKanban && mod.renderJKanban) {
                    mod.renderJKanban(pedidos, { only: 'complementarias' });
                } else {
                    mod.renderKanban(pedidos, { only: 'complementarias' });
                }
            });
        }
        
        // Actualiza lista si la pestaña lista está activa
        if (tabLista && tabLista.classList.contains('active')) {
            import('./listView.js').then(mod => {
                // Si hay un filtro activo, filtra los pedidos actuales
                let pedidosToRender = pedidos;
                if (window.currentFilteredPedidos) {
                    // Filtra los pedidos actuales usando los mismos criterios que el filtro anterior
                    const idsFiltrados = new Set(window.currentFilteredPedidos.map(p => p.id));
                    pedidosToRender = pedidos.filter(p => idsFiltrados.has(p.id));
                    // Si el filtro está vacío o ya no hay coincidencias, muestra todos
                    if (pedidosToRender.length === 0) pedidosToRender = pedidos;
                }
                mod.renderList(pedidosToRender);
                
                // Actualiza gráficos si están visibles
                const reportes = document.getElementById('reportes-graficos');
                if (reportes && window.getComputedStyle(reportes).display !== 'none' && typeof window.renderGraficosReportes === 'function') {
                    window.renderGraficosReportes(pedidosToRender);
                }
            });
        }
        
        // También ejecuta cualquier lógica adicional previa
        if (window.onPedidosDataUpdate) {
            window.onPedidosDataUpdate(pedidos);
        }
    }, (error) => {
        console.error("Error escuchando pedidos:", error);
    });

    // NUEVO: Asegurarse de que el estado de la vista sea correcto después de cargar
    setTimeout(() => {
        if (typeof window.switchView === 'function' && window.currentView) {
            window.switchView(window.currentView);
        }
    }, 1000);
});
