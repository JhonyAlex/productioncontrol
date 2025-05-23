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

    // Añadir referencia al campo de confirmación de contraseña
    const confirmPasswordContainer = document.getElementById('confirm-password-container');
    const confirmPasswordInput = document.getElementById('confirm-password');
    // Variable para controlar si estamos en modo registro o inicio de sesión
    let registrationMode = false;

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
            // Si no está en modo registro, cambia a modo registro
            if (!registrationMode) {
                registrationMode = true;
                registerButton.textContent = 'Completar Registro';
                confirmPasswordContainer.style.display = 'block';
                // Añadir atributo required cuando se muestra el campo
                confirmPasswordInput.setAttribute('required', '');
                if (authMessage) authMessage.style.display = 'none';
                return;
            }

            // Si está en modo registro, intenta registrar al usuario
            const email = emailInput.value;
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (!email || !password || !confirmPassword) {
                if (authMessage) {
                    authMessage.textContent = 'Por favor, completa todos los campos para registrarte.';
                    authMessage.style.color = 'red';
                    authMessage.style.display = 'block';
                }
                return;
            }

            // Verificar que las contraseñas coinciden
            if (password !== confirmPassword) {
                if (authMessage) {
                    authMessage.textContent = 'Las contraseñas no coinciden.';
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
                if (loginError) loginError.style.display = 'none';

                // Resetear el modo de registro y ocultar el campo de confirmación
                registrationMode = false;
                registerButton.textContent = 'Registrar Nuevo Usuario';
                confirmPasswordContainer.style.display = 'none';
                confirmPasswordInput.value = '';
                // Quitar atributo required cuando se oculta el campo
                confirmPasswordInput.removeAttribute('required');
                // Opcional: Limpiar los otros campos
                emailInput.value = '';
                passwordInput.value = '';
            } catch (error) {
                if (authMessage) {
                    authMessage.textContent = `Error al registrar: ${getFirebaseErrorMessage(error)}`;
                    authMessage.style.color = 'red';
                    authMessage.style.display = 'block';
                }
            }
        });
    }

    // Añadir listener para el formulario de login para resetear el modo de registro
    if (loginForm) {
        loginForm.addEventListener('submit', () => {
            if (registrationMode && registerButton) {
                registrationMode = false;
                registerButton.textContent = 'Registrar Nuevo Usuario';
                if (confirmPasswordContainer) {
                    confirmPasswordContainer.style.display = 'none';
                    // Quitar atributo required cuando se oculta el campo
                    if (confirmPasswordInput) {
                        confirmPasswordInput.removeAttribute('required');
                    }
                }
            }
        });
    }

    // También hay que manejar la cancelación de registro cuando se cierra la página o se recarga
    window.addEventListener('beforeunload', () => {
        if (registrationMode && confirmPasswordInput) {
            confirmPasswordInput.removeAttribute('required');
        }
    });
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
