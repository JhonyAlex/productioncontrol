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
        logoutButton: document.getElementById('logout-button')
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

    // Suscribirse a los pedidos de Firestore y actualizar la UI en tiempo real
    unsubscribePedidos = listenToPedidos(pedidosCollection, (pedidos) => {
        // Si hay pedidos, renderiza la UI
        if (window.renderActiveView) {
            window.renderActiveView(pedidos);
        }
    }, (error) => {
        console.error("Error escuchando pedidos:", error);
    });
});
