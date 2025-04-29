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
    const filteredPedidos = (window.currentPedidos || []).filter(pedido => {
        const numeroPedido = pedido.numeroPedido?.toLowerCase() || '';
        const cliente = pedido.cliente?.toLowerCase() || '';
        const maquina = pedido.maquinaImpresion?.toLowerCase() || '';
        const etapaActual = pedido.etapaActual?.toLowerCase() || '';
        return numeroPedido.includes(searchTerm) ||
               cliente.includes(searchTerm) ||
               maquina.includes(searchTerm) ||
               etapaActual.includes(searchTerm);
    });

    // Detecta la pestaña activa y renderiza la vista correspondiente
    const tabImpresion = document.getElementById('tab-kanban-impresion');
    const tabComplementarias = document.getElementById('tab-kanban-complementarias');
    const tabLista = document.getElementById('tab-lista');

    if (tabImpresion && tabImpresion.classList.contains('active')) {
        // Kanban impresión
        import('./kanban.js').then(mod => {
            mod.renderKanban(filteredPedidos, { only: 'impresion' });
        });
    } else if (tabComplementarias && tabComplementarias.classList.contains('active')) {
        // Kanban complementarias
        import('./kanban.js').then(mod => {
            mod.renderKanban(filteredPedidos, { only: 'complementarias' });
        });
    } else if (tabLista && tabLista.classList.contains('active')) {
        // Lista
        import('./listView.js').then(mod => {
            mod.renderList(filteredPedidos);
        });
    }
    // Guarda los pedidos filtrados para exportar y gráficos
    window.currentFilteredPedidos = filteredPedidos;
}

// --- NUEVO: Autocompletado para el buscador global ---
export function setupSearchAutocomplete() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    // Crea el contenedor de sugerencias si no existe
    let suggestionBox = document.getElementById('search-suggestions');
    if (!suggestionBox) {
        suggestionBox = document.createElement('div');
        suggestionBox.id = 'search-suggestions';
        suggestionBox.style.position = 'absolute';
        suggestionBox.style.zIndex = 1000;
        suggestionBox.style.background = '#fff';
        suggestionBox.style.border = '1px solid #ccc';
        suggestionBox.style.width = '100%';
        suggestionBox.style.maxHeight = '200px';
        suggestionBox.style.overflowY = 'auto';
        suggestionBox.style.display = 'none';
        searchInput.parentNode.appendChild(suggestionBox);
        searchInput.setAttribute('autocomplete', 'off');
        searchInput.style.position = 'relative';
    }

    searchInput.addEventListener('input', function () {
        const term = this.value.toLowerCase().trim();
        suggestionBox.innerHTML = '';
        if (!term) {
            suggestionBox.style.display = 'none';
            return;
        }
        // Recolecta sugerencias únicas de todos los campos relevantes (EXCLUYENDO etapasSecuencia)
        const pedidos = window.currentPedidos || [];
        const suggestionsSet = new Set();
        pedidos.forEach(pedido => {
            [
                pedido.numeroPedido,
                pedido.cliente,
                pedido.maquinaImpresion,
                pedido.etapaActual
                // NO incluir ...pedido.etapasSecuencia
            ].forEach(val => {
                if (val && val.toLowerCase().includes(term)) {
                    suggestionsSet.add(val);
                }
            });
        });
        const suggestions = Array.from(suggestionsSet).sort().slice(0, 10);
        if (suggestions.length === 0) {
            suggestionBox.style.display = 'none';
            return;
        }
        suggestions.forEach(s => {
            const div = document.createElement('div');
            div.textContent = s;
            div.style.padding = '0.3em 0.7em';
            div.style.cursor = 'pointer';
            div.onmousedown = () => {
                searchInput.value = s;
                suggestionBox.style.display = 'none';
                // Dispara el evento input para filtrar
                searchInput.dispatchEvent(new Event('input'));
            };
            suggestionBox.appendChild(div);
        });
        // Posiciona el box justo debajo del input
        const rect = searchInput.getBoundingClientRect();
        suggestionBox.style.top = (searchInput.offsetTop + searchInput.offsetHeight) + 'px';
        suggestionBox.style.left = searchInput.offsetLeft + 'px';
        suggestionBox.style.display = 'block';
    });

    // Oculta sugerencias al perder foco
    searchInput.addEventListener('blur', () => {
        setTimeout(() => { suggestionBox.style.display = 'none'; }, 120);
    });
}

import { renderKanban } from './kanban.js';
import { renderList } from './listView.js';
