// auth.js
// Lógica de autenticación y observador de estado
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { loadMainAppData, resetUIOnLogout } from './ui.js';
import { getFirebaseErrorMessage } from './utils.js';

let appLoaded = false;

export function setupAuthListeners(auth, domRefs) {
    const { loginForm, emailInput, passwordInput, loginError, logoutButton } = domRefs;
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.style.display = 'none';
        try {
            await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
        } catch (error) {
            loginError.textContent = getFirebaseErrorMessage(error);
            loginError.style.display = 'block';
        }
    });
    logoutButton.addEventListener('click', async () => {
        appLoaded = false;
        await signOut(auth);
    });
}

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
            }
        } else {
            appLoaded = false;
            resetUIOnLogout(domRefs, unsubscribePedidosRef);
        }
    });
}
