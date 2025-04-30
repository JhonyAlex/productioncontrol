// auth.js
// Lógica de autenticación y observador de estado
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { loadMainAppData, resetUIOnLogout } from './ui.js';
import { getFirebaseErrorMessage } from './utils.js';

let appLoaded = false;
// --- NUEVO: Lógica de inactividad ---
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos en milisegundos
let inactivityTimer = null;
let activityHandler = null; // Definir una variable para almacenar la referencia al handler
const activityEvents = ['mousemove', 'keydown', 'click', 'touchstart'];
// --- FIN NUEVO ---

export function setupAuthListeners(auth, domRefs) {
    const {
        loginForm,
        emailInput,
        passwordInput,
        loginError,
        logoutButton,
        forgotPasswordLink, // NUEVO: Enlace para olvidar contraseña
        registerButton,     // NUEVO: Botón para registrar
        authMessage         // NUEVO: Div para mensajes generales (reset, registro)
    } = domRefs;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.style.display = 'none';
        try {
            await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
        } catch (error) {
            loginError.textContent = getFirebaseErrorMessage(error);
            loginError.style.display = 'block';
            if (authMessage) authMessage.style.display = 'none'; // Ocultar otros mensajes
        }
    });

    logoutButton.addEventListener('click', async () => {
        appLoaded = false;
        stopInactivityTimer(); // Detener el temporizador al cerrar sesión manualmente
        await signOut(auth);
    });

    // --- NUEVO: Listener para "Olvidé contraseña" ---
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = emailInput.value;
            if (!email) {
                if (authMessage) {
                    authMessage.textContent = 'Por favor, introduce tu correo electrónico para restablecer la contraseña.';
                    authMessage.style.color = 'red';
                    authMessage.style.display = 'block';
                }
                return;
            }
            try {
                await sendPasswordResetEmail(auth, email);
                if (authMessage) {
                    authMessage.textContent = 'Se ha enviado un correo para restablecer tu contraseña. Revisa tu bandeja de entrada.';
                    authMessage.style.color = 'green';
                    authMessage.style.display = 'block';
                }
                if (loginError) loginError.style.display = 'none'; // Ocultar error de login
            } catch (error) {
                if (authMessage) {
                    authMessage.textContent = `Error: ${getFirebaseErrorMessage(error)}`;
                    authMessage.style.color = 'red';
                    authMessage.style.display = 'block';
                }
            }
        });
    }

    // --- NUEVO: Listener para "Registrar Usuario" ---
    if (registerButton) {
        registerButton.addEventListener('click', async () => {
            const email = emailInput.value;
            const password = passwordInput.value;
            if (!email || !password) {
                 if (authMessage) {
                    authMessage.textContent = 'Por favor, introduce correo y contraseña para registrarte.';
                    authMessage.style.color = 'red';
                    authMessage.style.display = 'block';
                }
                return;
            }
            try {
                await createUserWithEmailAndPassword(auth, email, password);
                 if (authMessage) {
                    authMessage.textContent = '¡Usuario registrado con éxito! Ahora puedes iniciar sesión.';
                    authMessage.style.color = 'green';
                    authMessage.style.display = 'block';
                }
                 if (loginError) loginError.style.display = 'none'; // Ocultar error de login
                 // Opcional: Limpiar campos o redirigir
                 // emailInput.value = '';
                 // passwordInput.value = '';
            } catch (error) {
                 if (authMessage) {
                    authMessage.textContent = `Error al registrar: ${getFirebaseErrorMessage(error)}`;
                    authMessage.style.color = 'red';
                    authMessage.style.display = 'block';
                }
            }
        });
    };
}

// --- NUEVO: Funciones para manejar el temporizador de inactividad ---
function resetInactivityTimer(auth) {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(async () => {
        console.log("Cerrando sesión por inactividad...");
        alert("Se ha cerrado la sesión por inactividad.");
        await signOut(auth);
    }, INACTIVITY_TIMEOUT);
}

function startInactivityTimer(auth) {
    if (inactivityTimer) clearTimeout(inactivityTimer); // Limpia cualquier timer previo

    // Crea un handler que podemos referenciar más tarde para removerlo
    activityHandler = () => resetInactivityTimer(auth);

    // Añade listeners para los eventos de actividad
    activityEvents.forEach(event => {
        document.addEventListener(event, activityHandler, true);
    });

    // Inicia el primer temporizador
    resetInactivityTimer(auth);
    console.log("Temporizador de inactividad iniciado.");
}

function stopInactivityTimer() {
    clearTimeout(inactivityTimer);
    if (activityHandler) {
        activityEvents.forEach(event => {
            document.removeEventListener(event, activityHandler, true);
        });
    }
    inactivityTimer = null;
    console.log("Temporizador de inactividad detenido.");
}
// --- FIN NUEVO ---

export function observeAuthState(auth, domRefs, unsubscribePedidosRef) {
    onAuthStateChanged(auth, (user) => {
        const { loginContainer, appContainer, userEmailSpan, mainContent } = domRefs;
        if (!loginContainer || !appContainer || !userEmailSpan || !mainContent) {
            setTimeout(() => observeAuthState(auth, domRefs, unsubscribePedidosRef), 50);
            return;
        }
        if (user) {
            if (!appLoaded) {
                appLoaded = true;
                loginContainer.style.display = 'none';
                appContainer.style.display = 'block';
                userEmailSpan.textContent = user.email;
                loadMainAppData();
                startInactivityTimer(auth); // Iniciar el temporizador al iniciar sesión
            }
        } else {
            appLoaded = false;
            stopInactivityTimer(); // Detener el temporizador si no hay usuario
            resetUIOnLogout(domRefs, unsubscribePedidosRef);
        }
    });
}
