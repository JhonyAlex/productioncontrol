export function getFirebaseErrorMessage(error) {
    switch (error.code) {
        case 'auth/invalid-email': return 'El formato del correo electrónico no es válido.';
        case 'auth/user-disabled': return 'Este usuario ha sido deshabilitado.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential': return 'Correo electrónico o contraseña incorrectos.';
        case 'auth/email-already-in-use': return 'Este correo electrónico ya está registrado.';
        case 'auth/weak-password': return 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.';
        case 'auth/too-many-requests': return 'Demasiados intentos fallidos. Inténtalo más tarde.';
        // Añade aquí más códigos de error si es necesario
        default: return 'Error al iniciar sesión. Por favor, inténtalo de nuevo.';
    }
}

// Estado global de filtro de fechas
window.fechaFiltro = { desde: null, hasta: null };

// --- NUEVO: Filtro combinado de búsqueda y fecha ---
export function handleSearch(e) {
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    const fechaDesde = document.getElementById('fecha-desde').value;
    const fechaHasta = document.getElementById('fecha-hasta').value;

    // Guarda el filtro global
    window.fechaFiltro = { desde: fechaDesde, hasta: fechaHasta };

    const filteredPedidos = (window.currentPedidos || []).filter(pedido => {
        // Filtro texto
        const numeroPedido = pedido.numeroPedido?.toLowerCase() || '';
        const cliente = pedido.cliente?.toLowerCase() || '';
        const maquina = pedido.maquinaImpresion?.toLowerCase() || '';
        const etapaActual = pedido.etapaActual?.toLowerCase() || '';
        let match = (
            !searchTerm ||
            numeroPedido.includes(searchTerm) ||
            cliente.includes(searchTerm) ||
            maquina.includes(searchTerm) ||
            etapaActual.includes(searchTerm)
        );

        // Filtro fecha
        if (match && (fechaDesde || fechaHasta)) {
            // Normaliza fecha del pedido
            let fechaPedido = pedido.fecha;
            if (!fechaPedido) return false;
            // Soporta tanto formato ISO (datetime-local) como DD/MM
            let fechaObj = null;
            if (/^\d{4}-\d{2}-\d{2}/.test(fechaPedido)) {
                fechaObj = new Date(fechaPedido);
            } else if (/^\d{2}\/\d{2}/.test(fechaPedido)) {
                const [d, m] = fechaPedido.split('/');
                const y = new Date().getFullYear();
                fechaObj = new Date(`${y}-${m}-${d}`);
            }
            if (!fechaObj || isNaN(fechaObj)) return false;
            if (fechaDesde) {
                const desdeObj = new Date(fechaDesde + "T00:00");
                if (fechaObj < desdeObj) return false;
            }
            if (fechaHasta) {
                const hastaObj = new Date(fechaHasta + "T23:59");
                if (fechaObj > hastaObj) return false;
            }
        }
        return match;
    });

    // Detecta la pestaña activa y renderiza la vista correspondiente
    const tabImpresion = document.getElementById('tab-kanban-impresion');
    const tabComplementarias = document.getElementById('tab-kanban-complementarias');
    const tabLista = document.getElementById('tab-lista');

    if (tabImpresion && tabImpresion.classList.contains('active')) {
        import('./kanban/index.js').then(mod => {
            mod.renderKanban(filteredPedidos, { only: 'impresion' });
        });
    } else if (tabComplementarias && tabComplementarias.classList.contains('active')) {
        import('./kanban/index.js').then(mod => {
            mod.renderKanban(filteredPedidos, { only: 'complementarias' });
        });
    } else if (tabLista && tabLista.classList.contains('active')) {
        import('./listView.js').then(mod => {
            mod.renderList(filteredPedidos);
        });
    }
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

// --- NUEVO: Listeners para filtros de fecha y atajos ---
if (typeof window !== 'undefined') {
    setTimeout(() => {
        const fechaDesde = document.getElementById('fecha-desde');
        const fechaHasta = document.getElementById('fecha-hasta');
        const searchInput = document.getElementById('search-input');
        if (fechaDesde) fechaDesde.addEventListener('change', handleSearch);
        if (fechaHasta) fechaHasta.addEventListener('change', handleSearch);
        if (searchInput) searchInput.addEventListener('input', handleSearch);

        // Atajos de rango
        const shortcuts = document.querySelectorAll('#date-shortcuts [data-shortcut]');
        shortcuts.forEach(btn => {
            btn.addEventListener('click', () => {
                const hoy = new Date();
                let desde = '', hasta = '';
                switch (btn.dataset.shortcut) {
                    case 'semana-actual': {
                        const day = hoy.getDay() || 7;
                        const monday = new Date(hoy);
                        monday.setDate(hoy.getDate() - day + 1);
                        desde = monday.toISOString().slice(0, 10);
                        hasta = hoy.toISOString().slice(0, 10);
                        break;
                    }
                    case 'semana-pasada': {
                        const day = hoy.getDay() || 7;
                        const monday = new Date(hoy);
                        monday.setDate(hoy.getDate() - day - 6);
                        const sunday = new Date(monday);
                        sunday.setDate(monday.getDate() + 6);
                        desde = monday.toISOString().slice(0, 10);
                        hasta = sunday.toISOString().slice(0, 10);
                        break;
                    }
                    case 'mes-actual': {
                        desde = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;
                        hasta = hoy.toISOString().slice(0, 10);
                        break;
                    }
                    case 'mes-pasado': {
                        const first = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
                        const last = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
                        desde = first.toISOString().slice(0, 10);
                        hasta = last.toISOString().slice(0, 10);
                        break;
                    }
                    case 'todo': {
                        desde = '';
                        hasta = '';
                        break;
                    }
                }
                document.getElementById('fecha-desde').value = desde;
                document.getElementById('fecha-hasta').value = hasta;
                handleSearch();
            });
        });
    }, 0);
}

/**
 * Cierra un modal de Bootstrap de manera segura evitando problemas de accesibilidad
 * @param {string|HTMLElement} modalElement - El ID del modal o el elemento DOM del modal
 */
export function safeCloseModal(modalElement) {
    // Si se pasa un string, buscamos el elemento por ID
    if (typeof modalElement === 'string') {
        modalElement = document.getElementById(modalElement);
    }
    
    if (!modalElement) return;
    
    try {
        // Asegurarnos de que ningún elemento dentro del modal tenga el foco
        document.activeElement.blur();
        
        // Obtenemos la instancia del modal
        let modalInstance = bootstrap.Modal.getInstance(modalElement);
        
        // Si no hay instancia, creamos una
        if (!modalInstance) {
            modalInstance = new bootstrap.Modal(modalElement);
        }
        
        // Cerramos el modal
        modalInstance.hide();
        
        // En algunos casos, puede haber un problema con el evento hide.bs.modal
        // Así que después de un pequeño retraso, verificamos y forzamos el cierre si es necesario
        setTimeout(() => {
            if (modalElement.classList.contains('show')) {
                modalElement.classList.remove('show');
                document.body.classList.remove('modal-open');
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) {
                    backdrop.remove();
                }
                modalElement.style.display = 'none';
                modalElement.setAttribute('aria-hidden', 'true');
            }
        }, 300);
    } catch (error) {
        console.error("Error al cerrar el modal:", error);
        
        // Intento de recuperación en caso de error
        modalElement.style.display = 'none';
        document.body.classList.remove('modal-open');
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
    }
}

import { renderKanban } from './kanban/index.js';
import { renderList } from './listView.js';
