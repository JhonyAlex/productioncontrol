// app.js

// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import {
    getFirestore, collection, addDoc, serverTimestamp, query, onSnapshot, doc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Import Firebase Config
import { firebaseConfig } from './firebaseConfig.js'; // Adjust path if needed

// Firebase Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const pedidosCollection = collection(db, "pedidos");

console.log("Firebase inicializado.");

// DOM Elements (Declared here, assigned in initializeAppEventListeners)
let loginContainer, appContainer, loginForm, emailInput, passwordInput, loginError,
    logoutButton, userEmailSpan, mainContent, pedidoModalElement, pedidoModal,
    pedidoForm, pedidoModalLabel, pedidoIdInput, deletePedidoBtn, returnToPrintBtn;

// --- State Variables ---
let currentPedidos = [];
let unsubscribePedidos = null;
let draggedItemId = null;
let appLoaded = false;

// Define printing stages globally
const etapasImpresion = ["Impresión WindMöller 1", "Impresión GIAVE", "Impresión WindMöller 3", "Impresión Anonimo"];
const etapasComplementarias = [
    "Laminación SL2", "Laminación NEXUS", "Perforación MAC", "Perforación MIC",
    "Rebobinado S2DT", "Rebobinado PROSLIT", "Rebobinado TEMAC",
    "Pendiente de Laminar", "Pendiente de Rebobinado", "Completado"
];

// --- Function to Initialize DOM Elements and Add Listeners ---
function initializeAppEventListeners() {
    console.log("DOMContentLoaded disparado. Inicializando elementos y listeners...");

    // Get DOM Elements
    loginContainer = document.getElementById('login-container');
    appContainer = document.getElementById('app-container');
    loginForm = document.getElementById('login-form');
    emailInput = document.getElementById('email');
    passwordInput = document.getElementById('password');
    loginError = document.getElementById('login-error');
    logoutButton = document.getElementById('logout-button');
    userEmailSpan = document.getElementById('user-email');
    mainContent = document.getElementById('main-content');
    pedidoModalElement = document.getElementById('pedidoModal');
    pedidoModal = new bootstrap.Modal(pedidoModalElement);
    pedidoForm = document.getElementById('pedido-form');
    pedidoModalLabel = document.getElementById('pedidoModalLabel');
    pedidoIdInput = document.getElementById('pedido-id');
    deletePedidoBtn = document.getElementById('delete-pedido-btn');
    returnToPrintBtn = document.getElementById('return-to-print-btn');

    if (!loginForm || !logoutButton || !pedidoForm || !deletePedidoBtn || !returnToPrintBtn || !pedidoModalElement) {
         console.error("¡Error crítico! No se encontraron todos los elementos esenciales para los listeners.");
         alert("Error al cargar la página. Faltan elementos esenciales.");
         return;
    }

    // --- Auth Listeners ---
    console.log("Añadiendo listener al formulario de login...");
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log("Login form submit event intercepted.");
        const email = emailInput.value;
        const password = passwordInput.value;
        loginError.style.display = 'none';
        try {
            console.log(`Intentando iniciar sesión con ${email}`);
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log("Inicio de sesión exitoso:", userCredential.user?.email);
        } catch (error) {
            console.error("Error de inicio de sesión:", error);
            loginError.textContent = getFirebaseErrorMessage(error);
            loginError.style.display = 'block';
        }
    });

    console.log("Añadiendo listener al botón de logout...");
    logoutButton.addEventListener('click', async () => {
        try {
            appLoaded = false; // Reset app loaded state on logout
            await signOut(auth);
            console.log("Cierre de sesión exitoso.");
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            alert("Error al cerrar sesión. Inténtalo de nuevo.");
        }
    });

     // Attach modal form submit listener
    if (!pedidoForm.dataset.listenerAttached) {
         pedidoForm.addEventListener('submit', savePedido);
         pedidoForm.dataset.listenerAttached = 'true';
         console.log("Listener de submit del modal añadido.");
    }
    // Attach delete button listener
    if (!deletePedidoBtn.dataset.listenerAttached) {
         deletePedidoBtn.addEventListener('click', deletePedido);
         deletePedidoBtn.dataset.listenerAttached = 'true';
         console.log("Listener del botón eliminar añadido.");
    }
    // Attach return button listener
    if (!returnToPrintBtn.dataset.listenerAttached) {
         returnToPrintBtn.addEventListener('click', returnToPrintStage);
         returnToPrintBtn.dataset.listenerAttached = 'true';
         console.log("Listener del botón regresar a impresión añadido.");
    }

     console.log("initializeAppEventListeners completado.");
}

// --- Wait for DOM to be fully loaded before adding listeners ---
document.addEventListener('DOMContentLoaded', initializeAppEventListeners);


// --- Auth State Observer ---
onAuthStateChanged(auth, (user) => {
    // Ensure DOM elements are potentially ready (or wait slightly)
    if (!loginContainer || !appContainer || !userEmailSpan || !mainContent) {
         console.log("onAuthStateChanged: DOM elements not ready yet, retrying shortly...");
         // Use setTimeout to defer execution slightly, allowing DOMContentLoaded to potentially finish
         setTimeout(() => onAuthStateChanged(auth, user), 50);
         return;
    }

    if (user) {
        console.log("onAuthStateChanged: Usuario conectado:", user.email);
        if (!appLoaded) {
            appLoaded = true;
            console.log("onAuthStateChanged: App no cargada, llamando a loadMainAppData...");
            loginContainer.style.display = 'none';
            appContainer.style.display = 'block';
            userEmailSpan.textContent = user.email;
            try {
                loadMainAppData(); // Load the main UI and start listening to data
            } catch (error) {
                 console.error("Error CRÍTICO durante loadMainAppData:", error);
                 alert("Error al cargar la aplicación principal. Por favor, recarga la página.");
                 appLoaded = false; // Reset state on critical error
                 signOut(auth); // Log out the user if the app fails to load
            }
        } else {
             console.log("onAuthStateChanged: App ya cargada, omitiendo loadMainAppData.");
        }
    } else {
        console.log("onAuthStateChanged: Usuario desconectado.");
        appLoaded = false; // Reset app loaded state
        loginContainer.style.display = 'block';
        appContainer.style.display = 'none';
        userEmailSpan.textContent = '';
        mainContent.innerHTML = '<h1 class="text-center">Por favor, inicia sesión</h1>'; // Reset main content
        // Stop listening to Firestore updates when logged out
        if (unsubscribePedidos) {
            console.log("Deteniendo listener de pedidos por logout.");
            unsubscribePedidos();
            unsubscribePedidos = null;
        }
    }
});

function getFirebaseErrorMessage(error) {
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

// --- Main App Logic ---
function loadMainAppData() {
    console.log("Iniciando loadMainAppData...");
    try {
        // Ensure mainContent is available (should be, due to DOMContentLoaded check)
        if (!mainContent) {
             console.error("loadMainAppData: No se encontró el contenedor #main-content.");
             throw new Error("Fallo crítico: Contenedor principal no encontrado.");
        }

        // Check if the main UI structure already exists to avoid recreating it
        if (!mainContent.querySelector('#view-kanban-btn')) {
            console.log("loadMainAppData: Creando HTML principal...");
            mainContent.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                    <div>
                        <button id="view-kanban-btn" class="btn btn-primary me-2 active">Vista Kanban</button>
                        <button id="view-list-btn" class="btn btn-secondary">Vista Lista</button>
                        <button id="export-btn" class="btn btn-outline-success ms-2" disabled title="Funcionalidad no implementada">Exportar Lista</button>
                    </div>
                    <div class="d-flex align-items-center">
                        <input type="text" id="search-input" class="form-control d-inline-block w-auto me-2" placeholder="Buscar pedido...">
                        <button id="add-pedido-btn" class="btn btn-success">+ Añadir Pedido</button>
                    </div>
                </div>
                <div id="kanban-board" class="mt-4"></div>
                <div id="list-view" class="mt-4" style="display: none;"></div>
            `;
            console.log("loadMainAppData: HTML principal creado.");

            // Get references to the newly created elements
            const viewKanbanBtn = mainContent.querySelector('#view-kanban-btn');
            const viewListBtn = mainContent.querySelector('#view-list-btn');
            const kanbanBoard = mainContent.querySelector('#kanban-board');
            const listView = mainContent.querySelector('#list-view');
            const exportBtn = mainContent.querySelector('#export-btn');
            const addPedidoBtn = mainContent.querySelector('#add-pedido-btn');
            const searchInput = mainContent.querySelector('#search-input');

            // Add event listeners to the new elements
            if (viewKanbanBtn && viewListBtn && kanbanBoard && listView && exportBtn && addPedidoBtn && searchInput) {
                console.log("loadMainAppData: Añadiendo listeners para vistas y acciones...");

                viewKanbanBtn.addEventListener('click', () => {
                    kanbanBoard.style.display = 'flex';
                    listView.style.display = 'none';
                    viewKanbanBtn.classList.add('active');
                    viewListBtn.classList.remove('active');
                    exportBtn.disabled = true; // Disable export in Kanban view
                    renderKanban(currentPedidos); // Re-render Kanban with current data
                });
                viewListBtn.addEventListener('click', () => {
                    kanbanBoard.style.display = 'none';
                    listView.style.display = 'block';
                    viewKanbanBtn.classList.remove('active');
                    viewListBtn.classList.add('active');
                    exportBtn.disabled = false; // Enable export in List view
                    renderList(currentPedidos); // Re-render List with current data
                });
                addPedidoBtn.addEventListener('click', () => openPedidoModal()); // Use the globally available function
                searchInput.addEventListener('input', handleSearch);
                exportBtn.addEventListener('click', () => {
                     alert('La funcionalidad de exportar a PDF/Excel aún no está implementada.');
                });
                console.log("loadMainAppData: Listeners de vistas y acciones añadidos.");
            } else {
                 console.error("loadMainAppData: ¡Error! No se encontraron elementos creados dinámicamente para añadir listeners.");
                 throw new Error("Fallo al inicializar elementos de la interfaz principal.");
            }
        } else {
            console.log("loadMainAppData: HTML principal ya existe.");
        }

        // Start listening to Firestore *after* the UI is set up
        if (!unsubscribePedidos) {
             console.log("loadMainAppData: Iniciando listener de Firestore...");
             listenToPedidos();
        } else {
             console.log("loadMainAppData: Listener de Firestore ya activo, renderizando vista actual.");
             // Ensure the correct view is rendered if the app was already loaded
             renderActiveView(currentPedidos);
        }
         console.log("Finalizando loadMainAppData exitosamente.");
    } catch (error) {
         console.error("Error DENTRO de loadMainAppData:", error);
         alert("Ocurrió un error al configurar la interfaz principal.");
         // Optionally re-throw or handle more gracefully
         throw error; // Re-throwing to be caught by the caller in onAuthStateChanged
    }
}


function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    const filteredPedidos = currentPedidos.filter(pedido => {
        const numeroPedido = pedido.numeroPedido?.toLowerCase() || '';
        const cliente = pedido.cliente?.toLowerCase() || '';
        const maquina = pedido.maquinaImpresion?.toLowerCase() || '';
        // Add more fields to search if needed
        return numeroPedido.includes(searchTerm) ||
               cliente.includes(searchTerm) ||
               maquina.includes(searchTerm);
    });
    renderActiveView(filteredPedidos);
}

function renderActiveView(pedidosToRender) {
    const kanbanBoard = document.getElementById('kanban-board');
    const listView = document.getElementById('list-view');

    if (!kanbanBoard || !listView) {
        console.warn("renderActiveView: Kanban or List view element not found. UI might not be fully loaded.");
        return;
    }

    if (kanbanBoard.style.display !== 'none') {
        renderKanban(pedidosToRender);
    } else if (listView.style.display !== 'none') {
        renderList(pedidosToRender);
    } else {
        // Default to Kanban if neither is explicitly visible (initial load case)
        renderKanban(pedidosToRender);
    }
}


function listenToPedidos() {
    console.log("Ejecutando listenToPedidos...");
    const q = query(pedidosCollection); // Add orderBy here if needed, e.g., orderBy("timestamp", "desc")

    unsubscribePedidos = onSnapshot(q, (querySnapshot) => {
        console.log("Datos de Firestore recibidos/actualizados.");
        const pedidos = [];
        querySnapshot.forEach((doc) => {
            pedidos.push({ id: doc.id, ...doc.data() });
        });
        currentPedidos = pedidos; // Update the global state
        console.log(`Pedidos cargados: ${currentPedidos.length}`);
        // Render the currently active view with the new data
        renderActiveView(currentPedidos);

    }, (error) => {
        console.error("Error al escuchar cambios en pedidos: ", error);
        alert("Error al cargar los datos de pedidos. Intenta recargar la página.");
        // Consider logging the user out or showing a persistent error message
        if (unsubscribePedidos) {
            unsubscribePedidos(); // Stop listening on error
            unsubscribePedidos = null;
        }
    });
    console.log("Listener de Firestore activo.");
}


// --- Kanban Rendering and Drag & Drop ---
function renderKanban(pedidos) {
    const kanbanBoard = document.getElementById('kanban-board');
    if (!kanbanBoard) {
        console.error("renderKanban: Elemento #kanban-board no encontrado.");
        return;
    }
    console.log(`Renderizando Kanban con ${pedidos.length} pedidos.`);
    kanbanBoard.innerHTML = ''; // Clear previous content

    // Group 1: Printing Stages
    const printingGroup = createKanbanGroup("Impresión", etapasImpresion, pedidos);
    kanbanBoard.appendChild(printingGroup);

    // Group 2: Complementary Stages
    const complementaryGroup = createKanbanGroup("Etapas Complementarias", etapasComplementarias, pedidos);
    kanbanBoard.appendChild(complementaryGroup);

    // Add drag & drop listeners after rendering
    addDragAndDropListeners();
}

function createKanbanGroup(groupTitle, etapasInGroup, allPedidos) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'kanban-group';
    groupDiv.innerHTML = `<h4>${groupTitle}</h4>`;

    const columnsContainer = document.createElement('div');
    columnsContainer.className = 'kanban-columns-container';

    etapasInGroup.forEach(etapa => {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'kanban-column';
        columnDiv.dataset.etapa = etapa; // Store etapa name for drop logic
        columnDiv.innerHTML = `<h5>${etapa}</h5>`;

        // Filter pedidos for the current stage (etapa)
        const pedidosInEtapa = allPedidos.filter(p => p.etapaActual === etapa);

        pedidosInEtapa.forEach(pedido => {
            const card = createKanbanCard(pedido);
            columnDiv.appendChild(card);
        });

        columnsContainer.appendChild(columnDiv);
    });

    groupDiv.appendChild(columnsContainer);
    return groupDiv;
}


function createKanbanCard(pedido) {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.id = `pedido-${pedido.id}`;
    card.draggable = true;
    card.dataset.id = pedido.id; // Store pedido ID

    // Format date if available
    const fechaDisplay = pedido.fecha ? ` (${pedido.fecha})` : '';
    const superficieDisplay = pedido.superficie === 'true' ? ' <span class="badge bg-info text-dark">SUP</span>' : '';
    const transparenciaDisplay = pedido.transparencia === 'true' ? ' <span class="badge bg-secondary">TTE</span>' : '';

    // Display sequence of stages
    const etapasHtml = pedido.etapasSecuencia && pedido.etapasSecuencia.length > 0
        ? `<div class="etapas-display">Secuencia: ${pedido.etapasSecuencia.join(' -> ')}</div>`
        : '';

    card.innerHTML = `
        <div class="kanban-card-header">
            <h6>${pedido.numeroPedido || 'N/A'}${fechaDisplay}</h6>
            <div>
              ${superficieDisplay}
              ${transparenciaDisplay}
            </div>
        </div>
        <div class="kanban-card-body">
            ${pedido.cliente ? `<p><strong>Cliente:</strong> ${pedido.cliente}</p>` : ''}
            <p><strong>Máquina:</strong> ${pedido.maquinaImpresion || 'N/A'}</p>
            ${pedido.desarrTexto ? `<p><strong>Desarr:</strong> ${pedido.desarrTexto}${pedido.desarrNumero ? ` (${pedido.desarrNumero})` : ''}</p>` : ''}
            ${pedido.metros ? `<p><strong>Metros:</strong> ${pedido.metros}</p>` : ''}
            ${pedido.capa ? `<p><strong>Capa:</strong> ${pedido.capa}</p>` : ''}
            ${pedido.camisa ? `<p><strong>Camisa:</strong> ${pedido.camisa}</p>` : ''}
            ${pedido.observaciones ? `<p><strong>Obs:</strong> ${pedido.observaciones}</p>` : ''}
            ${etapasHtml}
        </div>
        <div class="kanban-card-footer">
            <button class="btn btn-sm btn-outline-primary" onclick="openPedidoModal('${pedido.id}')">Ver/Editar</button>
            ${pedido.etapaActual !== 'Completado' && pedido.etapasSecuencia && pedido.etapasSecuencia.length > 0 ?
                `<button class="btn btn-sm btn-outline-success mt-1" onclick="completeStage('${pedido.id}')">Completar Etapa</button>` : ''
            }
        </div>
    `;
    return card;
}


function addDragAndDropListeners() {
    const cards = document.querySelectorAll('.kanban-card');
    const columns = document.querySelectorAll('.kanban-column');

    cards.forEach(card => {
        // Eventos estándar de arrastre
        card.addEventListener('dragstart', dragStart);
        card.addEventListener('dragend', dragEnd);
        
        // Eventos táctiles y de clic sostenido
        card.addEventListener('touchstart', touchStart, { passive: false });
        card.addEventListener('touchmove', touchMove, { passive: false });
        card.addEventListener('touchend', touchEnd);
        
        // Eventos de ratón para clic sostenido
        card.addEventListener('mousedown', mouseDown);
    });

    columns.forEach(column => {
        column.addEventListener('dragover', dragOver);
        column.addEventListener('dragenter', dragEnter);
        column.addEventListener('dragleave', dragLeave);
        column.addEventListener('drop', drop);
    });
    console.log(`Listeners D&D añadidos a ${cards.length} tarjetas y ${columns.length} columnas.`);
    
    // Añadir listeners globales para mouse
    document.addEventListener('mousemove', mouseMove);
    document.addEventListener('mouseup', mouseUp);
}

// Variables para la funcionalidad de clic sostenido
let isDragging = false;
let draggedCard = null;
let initialX, initialY;
let offsetX, offsetY;
let scrollInterval = null;
let lastTouchColumn = null;

function mouseDown(e) {
    if (e.button !== 0) return; // Solo botón izquierdo
    
    const card = e.currentTarget;
    initialX = e.clientX;
    initialY = e.clientY;
    
    // Guardar la posición inicial para determinar si es un clic o un arrastre
    card.dataset.initialX = initialX;
    card.dataset.initialY = initialY;
    card.dataset.mouseDownTime = Date.now();
}

function mouseMove(e) {
    if (!document.querySelector('.kanban-card[data-mouse-down-time]')) return;
    
    const card = document.querySelector('.kanban-card[data-mouse-down-time]');
    const initialX = parseInt(card.dataset.initialX);
    const initialY = parseInt(card.dataset.initialY);
    const mouseDownTime = parseInt(card.dataset.mouseDownTime);
    
    // Determinar si es un clic o un arrastre basado en el movimiento y tiempo
    const hasMoved = Math.abs(e.clientX - initialX) > 10 || Math.abs(e.clientY - initialY) > 10;
    const hasBeenHeldLongEnough = Date.now() - mouseDownTime > 150;
    
    if (hasMoved && hasBeenHeldLongEnough && !isDragging) {
        startDragging(card, e.clientX, e.clientY);
    }
    
    if (isDragging) {
        moveElement(e.clientX, e.clientY);
        handleAutoscroll(e.clientX, e.clientY);
    }
}

function mouseUp(e) {
    if (!isDragging) {
        // Limpiar cualquier dato de mouseDown si no se convirtió en arrastre
        const card = document.querySelector('.kanban-card[data-mouse-down-time]');
        if (card) {
            delete card.dataset.mouseDownTime;
            delete card.dataset.initialX;
            delete card.dataset.initialY;
        }
        return;
    }
    
    finishDragging(e.clientX, e.clientY);
}

function touchStart(e) {
    if (e.touches.length !== 1) return;
    e.preventDefault(); // Prevenir scroll en táctil al intentar arrastrar
    
    const touch = e.touches[0];
    const card = e.currentTarget;
    
    initialX = touch.clientX;
    initialY = touch.clientY;
    
    // Iniciar el arrastre después de un breve retraso (para no confundir con scroll)
    card.dataset.touchStartTime = Date.now();
    card.dataset.initialTouchX = initialX;
    card.dataset.initialTouchY = initialY;
    
    // Mostrar feedback visual inmediato
    setTimeout(() => {
        if (card.dataset.touchStartTime) {
            card.classList.add('touch-dragging');
        }
    }, 150);
}

function touchMove(e) {
    if (e.touches.length !== 1) return;
    
    const card = e.currentTarget;
    const touch = e.touches[0];
    
    if (card.classList.contains('touch-dragging') || isDragging) {
        e.preventDefault();
        
        if (!isDragging) {
            startDragging(card, touch.clientX, touch.clientY);
        }
        
        moveElement(touch.clientX, touch.clientY);
        handleAutoscroll(touch.clientX, touch.clientY);
        
        // Detectar columna debajo del touch
        const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        const columnBelow = elemBelow ? elemBelow.closest('.kanban-column') : null;
        
        // Gestionar destacado visual de columna
        if (columnBelow && columnBelow !== lastTouchColumn) {
            if (lastTouchColumn) {
                lastTouchColumn.classList.remove('drag-over');
            }
            columnBelow.classList.add('drag-over');
            lastTouchColumn = columnBelow;
        } else if (!columnBelow && lastTouchColumn) {
            lastTouchColumn.classList.remove('drag-over');
            lastTouchColumn = null;
        }
    } else {
        // Determinar si el touch se ha movido lo suficiente para iniciar arrastre
        const initialX = parseInt(card.dataset.initialTouchX);
        const initialY = parseInt(card.dataset.initialTouchY);
        const touchStartTime = parseInt(card.dataset.touchStartTime);
        
        const hasMoved = Math.abs(touch.clientX - initialX) > 10 || Math.abs(touch.clientY - initialY) > 10;
        const hasBeenHeldLongEnough = Date.now() - touchStartTime > 150;
        
        if (hasMoved && hasBeenHeldLongEnough) {
            e.preventDefault();
            card.classList.add('touch-dragging');
        }
    }
}

function touchEnd(e) {
    const card = e.currentTarget;
    card.classList.remove('touch-dragging');
    
    delete card.dataset.touchStartTime;
    delete card.dataset.initialTouchX;
    delete card.dataset.initialTouchY;
    
    if (!isDragging) return;
    
    const touch = e.changedTouches[0];
    finishDragging(touch.clientX, touch.clientY);
}

function startDragging(card, clientX, clientY) {
    draggedCard = card;
    draggedItemId = card.dataset.id;
    
    // Crear clon visual para arrastrar
    const clone = card.cloneNode(true);
    clone.id = 'dragging-clone';
    clone.style.position = 'fixed';
    clone.style.width = card.offsetWidth + 'px';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '1000';
    clone.style.opacity = '0.8';
    clone.style.transform = 'rotate(3deg)';
    clone.style.boxShadow = '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)';
    document.body.appendChild(clone);
    
    // Calcular offset desde donde se está agarrando la tarjeta
    const rect = card.getBoundingClientRect();
    offsetX = clientX - rect.left;
    offsetY = clientY - rect.top;
    
    // Mover el clon a la posición inicial
    clone.style.left = (clientX - offsetX) + 'px';
    clone.style.top = (clientY - offsetY) + 'px';
    
    // Marcar original como oculto o semi-transparente
    card.style.opacity = '0.3';
    
    isDragging = true;
    
    console.log(`Drag iniciado para: ${draggedItemId}`);
}

function moveElement(clientX, clientY) {
    const clone = document.getElementById('dragging-clone');
    if (!clone) return;
    
    clone.style.left = (clientX - offsetX) + 'px';
    clone.style.top = (clientY - offsetY) + 'px';
}

function handleAutoscroll(clientX, clientY) {
    // Limpiar cualquier intervalo de autoscroll existente
    if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
    }
    
    const scrollThreshold = 80; // px desde el borde para iniciar autoscroll
    const scrollSpeed = 15; // px por intervalo
    const scrollContainer = document.getElementById('kanban-board');
    
    const containerRect = scrollContainer.getBoundingClientRect();
    
    // Determinar si estamos cerca del borde izquierdo o derecho
    if (clientX < containerRect.left + scrollThreshold) {
        // Scroll hacia la izquierda
        scrollInterval = setInterval(() => {
            scrollContainer.scrollLeft -= scrollSpeed;
        }, 30);
    } else if (clientX > containerRect.right - scrollThreshold) {
        // Scroll hacia la derecha
        scrollInterval = setInterval(() => {
            scrollContainer.scrollLeft += scrollSpeed;
        }, 30);
    }
}

function finishDragging(clientX, clientY) {
    // Limpiar intervalo de autoscroll si existe
    if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
    }
    
    const clone = document.getElementById('dragging-clone');
    if (!clone || !draggedCard) {
        isDragging = false;
        return;
    }
    
    // Buscar la columna debajo del punto de soltar
    const elemBelow = document.elementFromPoint(clientX, clientY);
    if (!elemBelow) {
        restoreOriginalCardState();
        return;
    }
    
    const columnBelow = elemBelow.closest('.kanban-column');
    if (columnBelow && columnBelow.dataset.etapa) {
        handleCardDropToColumn(columnBelow);
    } else {
        restoreOriginalCardState();
    }
    
    // Limpiar cualquier columna resaltada
    if (lastTouchColumn) {
        lastTouchColumn.classList.remove('drag-over');
        lastTouchColumn = null;
    }
    
    // Eliminar el clon
    document.body.removeChild(clone);
    isDragging = false;
}

function handleCardDropToColumn(column) {
    const nuevaEtapa = column.dataset.etapa;
    const pedidoId = draggedItemId;
    
    console.log(`Drop: Pedido ${pedidoId} en columna ${nuevaEtapa}`);
    
    // Realizar las mismas validaciones que tenemos en la función drop
    const pedido = currentPedidos.find(p => p.id === pedidoId);
    if (!pedido) {
        console.error(`Drop fallido: No se encontró el pedido con ID ${pedidoId} en el estado actual.`);
        restoreOriginalCardState();
        return;
    }
    
    // Lógica de validación (copiada de la función drop existente)
    const currentStageIndex = pedido.etapasSecuencia ? pedido.etapasSecuencia.indexOf(pedido.etapaActual) : -1;
    
    const isLastStage = currentStageIndex === (pedido.etapasSecuencia?.length || 0) - 1;
    if (nuevaEtapa === "Completado" && !isLastStage && pedido.etapaActual !== "Completado") {
        alert(`El pedido debe pasar por todas las etapas (${pedido.etapasSecuencia.join(', ')}) antes de completarse.`);
        restoreOriginalCardState();
        return;
    }
    
    if (pedido.etapasSecuencia && pedido.etapasSecuencia.length > 0 && nuevaEtapa !== "Completado") {
        const nextExpectedStage = pedido.etapasSecuencia[currentStageIndex + 1];
        if (nuevaEtapa !== nextExpectedStage && !etapasImpresion.includes(nuevaEtapa)) {
            const isInitialDrop = !pedido.etapaActual || etapasImpresion.includes(pedido.etapaActual);
            if (!isInitialDrop || !etapasImpresion.includes(nuevaEtapa)) {
                alert(`Movimiento inválido. La siguiente etapa esperada es '${nextExpectedStage || 'Completado'}'. Use el botón 'Regresar a Impresión' si es necesario.`);
                restoreOriginalCardState();
                return;
            }
        }
    }
    
    // Actualizar en Firestore
    const pedidoRef = doc(db, "pedidos", pedidoId);
    updateDoc(pedidoRef, {
        etapaActual: nuevaEtapa,
        lastMoved: serverTimestamp()
    }).then(() => {
        console.log(`Pedido ${pedidoId} actualizado en Firestore a etapa: ${nuevaEtapa}`);
        
        // Actualización optimista de la UI (mover tarjeta visualmente)
        if (draggedCard) {
            draggedCard.style.opacity = '1'; // Restaurar opacidad
            column.appendChild(draggedCard); // Mover la tarjeta a la nueva columna
        }
    }).catch(error => {
        console.error("Error al actualizar el pedido en Firestore:", error);
        alert("Error al mover el pedido. Inténtalo de nuevo.");
        restoreOriginalCardState();
    });
}

function restoreOriginalCardState() {
    if (draggedCard) {
        draggedCard.style.opacity = '1'; // Restaurar opacidad
    }
    draggedCard = null;
    draggedItemId = null;
}

// Reemplazar funciones originales de drag & drop con versiones que usan nuestras nuevas funcionalidades
function dragStart(e) {
    // Esta función seguirá manejando el drag & drop nativo para navegadores de escritorio
    draggedItemId = e.target.dataset.id;
    e.dataTransfer.setData('text/plain', draggedItemId);
    setTimeout(() => e.target.classList.add('dragging'), 0); // Visual feedback
    console.log(`Drag Start nativo: ${draggedItemId}`);
}

function dragEnd(e) {
    e.target.classList.remove('dragging');
    if (!isDragging) { // Solo limpiamos si no estamos en modo de arrastre táctil/mouse
        draggedItemId = null;
    }
    console.log("Drag End nativo");
}


// --- List View Rendering ---
function renderList(pedidos) {
    const listView = document.getElementById('list-view');
    if (!listView) {
        console.error("renderList: Elemento #list-view no encontrado.");
        return;
    }
    console.log(`Renderizando Lista con ${pedidos.length} pedidos.`);

    // Sort pedidos, e.g., by numeroPedido or timestamp
    pedidos.sort((a, b) => (a.numeroPedido || '').localeCompare(b.numeroPedido || ''));

    let tableHTML = `
        <table class="table table-striped table-hover table-bordered">
            <thead>
                <tr>
                    <th>Nº Pedido</th>
                    <th>Cliente</th>
                    <th>Máquina Imp.</th>
                    <th>Desarr.</th>
                    <th>Metros</th>
                    <th>SUP</th>
                    <th>TTE</th>
                    <th>Capa</th>
                    <th>Camisa</th>
                    <th>Fecha</th>
                    <th>Etapa Actual</th>
                    <th>Secuencia</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (pedidos.length === 0) {
        tableHTML += '<tr><td colspan="13" class="text-center">No hay pedidos para mostrar.</td></tr>';
    } else {
        pedidos.forEach(pedido => {
            const secuenciaStr = pedido.etapasSecuencia ? pedido.etapasSecuencia.join(', ') : 'N/A';
            tableHTML += `
                <tr>
                    <td>${pedido.numeroPedido || 'N/A'}</td>
                    <td>${pedido.cliente || '-'}</td>
                    <td>${pedido.maquinaImpresion || 'N/A'}</td>
                    <td>${pedido.desarrTexto || ''}${pedido.desarrNumero ? ` (${pedido.desarrNumero})` : ''}</td>
                    <td>${pedido.metros || '-'}</td>
                    <td>${pedido.superficie === 'true' ? 'Sí' : 'No'}</td>
                    <td>${pedido.transparencia === 'true' ? 'Sí' : 'No'}</td>
                    <td>${pedido.capa || '-'}</td>
                    <td>${pedido.camisa || '-'}</td>
                    <td>${pedido.fecha || '-'}</td>
                    <td><span class="badge bg-primary">${pedido.etapaActual || 'N/A'}</span></td>
                    <td style="font-size: 0.8em;">${secuenciaStr}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="openPedidoModal('${pedido.id}')">
                            <i class="bi bi-pencil-square"></i> Editar
                        </button>
                    </td>
                </tr>
            `;
        });
    }

    tableHTML += `
            </tbody>
        </table>
    `;

    listView.innerHTML = tableHTML;
}


// --- Modal Logic ---
function openPedidoModal(pedidoId = null) {
    console.log(`Abriendo modal para pedido ID: ${pedidoId || 'Nuevo'}`);
    pedidoForm.reset(); // Clear form fields
    pedidoIdInput.value = ''; // Clear hidden ID field
    deletePedidoBtn.style.display = 'none'; // Hide delete button by default
    returnToPrintBtn.style.display = 'none'; // Hide return button by default
    document.getElementById('etapas-secuencia-container').querySelectorAll('.etapa-check').forEach(cb => cb.checked = false); // Uncheck all etapa checkboxes

    if (pedidoId) {
        // --- Editing Existing Pedido ---
        pedidoModalLabel.textContent = 'Editar Pedido';
        const pedido = currentPedidos.find(p => p.id === pedidoId);
        if (pedido) {
            pedidoIdInput.value = pedido.id;
            document.getElementById('numeroPedido').value = pedido.numeroPedido || '';
            document.getElementById('cliente').value = pedido.cliente || '';
            document.getElementById('maquinaImpresion').value = pedido.maquinaImpresion || '';
            document.getElementById('desarrTexto').value = pedido.desarrTexto || '';
            document.getElementById('desarrNumero').value = pedido.desarrNumero || '';
            document.getElementById('metros').value = pedido.metros || '';
            document.getElementById('superficie').value = pedido.superficie || 'false';
            document.getElementById('transparencia').value = pedido.transparencia || 'false';
            document.getElementById('capa').value = pedido.capa || '';
            document.getElementById('camisa').value = pedido.camisa || '';
            document.getElementById('fecha').value = pedido.fecha || '';
            document.getElementById('observaciones').value = pedido.observaciones || '';

            // Check the selected stages in the sequence (excluding the initial print stage)
            if (pedido.etapasSecuencia && Array.isArray(pedido.etapasSecuencia)) {
                 const printStage = `Impresión ${pedido.maquinaImpresion}`;
                 pedido.etapasSecuencia.forEach(etapa => {
                     // Only check complementary stages in the checkboxes
                     if (etapa !== printStage) {
                         const checkbox = document.getElementById(`etapa-${etapa.toLowerCase().replace(/[\s]+/g, '-')}`); // Match ID generation logic
                         if (checkbox) {
                             checkbox.checked = true;
                         } else {
                              console.warn(`Checkbox no encontrado para la etapa guardada: ${etapa}`);
                         }
                     }
                 });
            }


            deletePedidoBtn.style.display = 'inline-block'; // Show delete button
            // Show "Return to Print" button only if the order is NOT currently in a printing stage and NOT completed
            if (!etapasImpresion.includes(pedido.etapaActual) && pedido.etapaActual !== 'Completado') {
                 returnToPrintBtn.style.display = 'inline-block';
            }

        } else {
            console.error(`No se encontró el pedido con ID ${pedidoId} para editar.`);
            alert("Error: No se pudo cargar la información del pedido.");
            return; // Don't open the modal if data is missing
        }
    } else {
        // --- Adding New Pedido ---
        pedidoModalLabel.textContent = 'Añadir Nuevo Pedido';
        // Ensure default values are set if needed (e.g., dropdowns)
        document.getElementById('maquinaImpresion').value = '';
        document.getElementById('superficie').value = 'false';
        document.getElementById('transparencia').value = 'false';
    }

    pedidoModal.show();
}
// Make openPedidoModal globally accessible for inline onclick handlers
window.openPedidoModal = openPedidoModal;


async function savePedido(event) {
    event.preventDefault();
    console.log("Intentando guardar pedido...");

    const pedidoId = pedidoIdInput.value;
    const maquinaImpresion = document.getElementById('maquinaImpresion').value;

    // --- Build Etapas Sequence ---
    const printStage = `Impresión ${maquinaImpresion}`;
    const selectedEtapas = [printStage]; // Start with the selected print stage
    document.querySelectorAll('#etapas-secuencia-container .etapa-check:checked').forEach(checkbox => {
        selectedEtapas.push(checkbox.value);
    });

    const pedidoData = {
        numeroPedido: document.getElementById('numeroPedido').value.trim(),
        cliente: document.getElementById('cliente').value.trim(),
        maquinaImpresion: maquinaImpresion,
        desarrTexto: document.getElementById('desarrTexto').value.trim(),
        desarrNumero: document.getElementById('desarrNumero').value || null, // Store as number or null
        metros: document.getElementById('metros').value || null, // Store as number or null
        superficie: document.getElementById('superficie').value,
        transparencia: document.getElementById('transparencia').value,
        capa: document.getElementById('capa').value.trim(),
        camisa: document.getElementById('camisa').value.trim(),
        fecha: document.getElementById('fecha').value.trim(),
        observaciones: document.getElementById('observaciones').value.trim(),
        etapasSecuencia: selectedEtapas,
        // timestamp: serverTimestamp() // Add/update timestamp on save
    };

    // Validate required fields
    if (!pedidoData.numeroPedido || !pedidoData.maquinaImpresion) {
        alert("Por favor, completa los campos obligatorios: Número Pedido y Máquina Impresión.");
        return;
    }

    try {
        if (pedidoId) {
            // --- Update Existing Pedido ---
            console.log(`Actualizando pedido ID: ${pedidoId}`);
            const pedidoRef = doc(db, "pedidos", pedidoId);
            // When updating, we generally DON'T want to reset the etapaActual unless specifically intended.
            // The etapaActual is managed by drag/drop or the completeStage/returnToPrint actions.
            // We only update the core data and the *defined* sequence.
            await updateDoc(pedidoRef, {
                ...pedidoData,
                lastUpdated: serverTimestamp() // Add a last updated timestamp
            });
            console.log("Pedido actualizado con éxito.");
        } else {
            // --- Add New Pedido ---
            console.log("Añadiendo nuevo pedido...");
            // Set initial stage for new pedidos
            pedidoData.etapaActual = printStage; // Start at the selected print stage
            pedidoData.createdAt = serverTimestamp(); // Add creation timestamp

            await addDoc(pedidosCollection, pedidoData);
            console.log("Nuevo pedido añadido con éxito.");
        }
        pedidoModal.hide(); // Close modal on success
        pedidoForm.reset(); // Reset form after successful save
    } catch (error) {
        console.error("Error al guardar el pedido:", error);
        alert(`Error al guardar el pedido: ${error.message}`);
    }
}


// --- Complete Stage Logic ---
async function completeStage(pedidoId) {
    console.log(`Intentando completar etapa para pedido ID: ${pedidoId}`);
    const pedido = currentPedidos.find(p => p.id === pedidoId);

    if (!pedido) {
        console.error(`completeStage: Pedido ${pedidoId} no encontrado.`);
        alert("Error: No se encontró el pedido.");
        return;
    }

    if (!pedido.etapasSecuencia || pedido.etapasSecuencia.length === 0) {
        console.warn(`completeStage: Pedido ${pedidoId} no tiene secuencia definida.`);
        alert("Este pedido no tiene una secuencia de etapas definida.");
        return;
    }

    const currentStageIndex = pedido.etapasSecuencia.indexOf(pedido.etapaActual);

    if (currentStageIndex === -1) {
        console.error(`completeStage: Etapa actual '${pedido.etapaActual}' no encontrada en la secuencia del pedido ${pedidoId}.`);
        alert("Error: La etapa actual del pedido no coincide con su secuencia.");
        return;
    }

    const nextStageIndex = currentStageIndex + 1;
    let nextStage;

    if (nextStageIndex < pedido.etapasSecuencia.length) {
        nextStage = pedido.etapasSecuencia[nextStageIndex];
        console.log(`Avanzando pedido ${pedidoId} de '${pedido.etapaActual}' a '${nextStage}'`);
    } else {
        // Reached the end of the sequence, move to "Completado"
        nextStage = "Completado";
        console.log(`Completando pedido ${pedidoId}. Última etapa '${pedido.etapaActual}' finalizada.`);
    }

    try {
        const pedidoRef = doc(db, "pedidos", pedidoId);
        await updateDoc(pedidoRef, {
            etapaActual: nextStage,
            lastMoved: serverTimestamp()
        });
        console.log(`Pedido ${pedidoId} movido a etapa: ${nextStage}`);
        // UI will update via the onSnapshot listener
    } catch (error) {
        console.error(`Error al mover el pedido ${pedidoId} a la siguiente etapa:`, error);
        alert("Error al completar la etapa. Inténtalo de nuevo.");
    }
}
// Make completeStage globally accessible if called from inline onclick
window.completeStage = completeStage;


// --- Delete Pedido Logic ---
async function deletePedido() {
    const pedidoId = pedidoIdInput.value;
    if (!pedidoId) {
        alert("No se ha seleccionado ningún pedido para eliminar.");
        return;
    }

    console.log(`Intentando eliminar pedido ID: ${pedidoId}`);

    // Confirmation dialog
    if (!confirm(`¿Estás seguro de que quieres eliminar permanentemente el pedido con ID ${pedidoId}? Esta acción no se puede deshacer.`)) {
        console.log("Eliminación cancelada por el usuario.");
        return;
    }

    try {
        const pedidoRef = doc(db, "pedidos", pedidoId);
        await deleteDoc(pedidoRef);
        console.log(`Pedido ${pedidoId} eliminado con éxito.`);
        pedidoModal.hide(); // Close the modal after deletion
        // UI will update via the onSnapshot listener removing the item
    } catch (error) {
        console.error(`Error al eliminar el pedido ${pedidoId}:`, error);
        alert("Error al eliminar el pedido. Inténtalo de nuevo.");
    }
}

// --- Return to Print Stage Logic ---
async function returnToPrintStage() {
    const pedidoId = pedidoIdInput.value;
    if (!pedidoId) {
        alert("No se ha seleccionado ningún pedido.");
        return;
    }

    console.log(`Intentando regresar a impresión el pedido ID: ${pedidoId}`);
    const pedido = currentPedidos.find(p => p.id === pedidoId);

    if (!pedido) {
        console.error(`returnToPrintStage: Pedido ${pedidoId} no encontrado.`);
        alert("Error: No se encontró el pedido.");
        return;
    }

    // Determine the correct initial print stage from the sequence or maquinaImpresion field
    let targetPrintStage = `Impresión ${pedido.maquinaImpresion}`;
    if (pedido.etapasSecuencia && pedido.etapasSecuencia.length > 0 && etapasImpresion.includes(pedido.etapasSecuencia[0])) {
         targetPrintStage = pedido.etapasSecuencia[0]; // Use the first stage from the defined sequence if it's a print stage
    } else if (!etapasImpresion.includes(targetPrintStage)) {
         console.error(`returnToPrintStage: No se pudo determinar una etapa de impresión válida para el pedido ${pedidoId}. Máquina: ${pedido.maquinaImpresion}, Secuencia[0]: ${pedido.etapasSecuencia?.[0]}`);
         alert("Error: No se pudo determinar la etapa de impresión inicial para este pedido.");
         return;
    }


    console.log(`Regresando pedido ${pedidoId} a la etapa: ${targetPrintStage}`);

    // Confirmation dialog
    if (!confirm(`¿Estás seguro de que quieres regresar el pedido '${pedido.numeroPedido}' a la etapa de impresión '${targetPrintStage}'? Se perderá el progreso en etapas posteriores.`)) {
        console.log("Regreso a impresión cancelado por el usuario.");
        return;
    }

    try {
        const pedidoRef = doc(db, "pedidos", pedidoId);
        await updateDoc(pedidoRef, {
            etapaActual: targetPrintStage,
            lastMoved: serverTimestamp() // Update timestamp
        });
        console.log(`Pedido ${pedidoId} regresado a ${targetPrintStage} con éxito.`);
        pedidoModal.hide(); // Close the modal
        // UI will update via the onSnapshot listener
    } catch (error) {
        console.error(`Error al regresar el pedido ${pedidoId} a impresión:`, error);
        alert("Error al regresar el pedido a impresión. Inténtalo de nuevo.");
    }
}
