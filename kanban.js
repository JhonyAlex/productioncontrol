// Dependencias necesarias (ajusta los imports según tu estructura real)
import { etapasImpresion, etapasComplementarias, currentPedidos } from './firestore.js'; // O ajusta según donde declares estas variables
import { openPedidoModal, completeStage } from './pedidoModal.js';
import { updatePedido } from './firestore.js';

// Variables para ordenación
let kanbanSortKey = 'secuenciaPedido'; // 'secuenciaPedido' o 'cliente'
let kanbanSortAsc = true;

// MOVER ESTA FUNCIÓN ANTES DE setupKanbanScrolling
function enableKanbanDragToScroll(container) {
    if (!container) {
        console.error("Container para drag-to-scroll no encontrado");
        return;
    }
    
    console.log(`Configurando drag-to-scroll para ${container.id}`);
    
    // Verificar si el contenedor realmente tiene overflow
    const contentWidth = container.scrollWidth;
    const containerWidth = container.clientWidth;
    console.log(`Container ${container.id}: scrollWidth=${contentWidth}, clientWidth=${containerWidth}, puede desplazarse: ${contentWidth > containerWidth}`);
    
    let isDown = false;
    let startX;
    let scrollLeft;
    let isDraggingCard = false;
    let lastX = 0;

    function isOnCard(e) {
        // Simplificar esta función para reducir falsos positivos
        return !!e.target.closest('.kanban-card, button');
    }

    // Función para restablecer el estado
    function resetDragState() {
        isDown = false;
        isDraggingCard = false;
        container.classList.remove('drag-scroll-active', 'no-user-select');
        container.style.cursor = 'grab';
    }

    // Asegurarnos de que los eventos de mouse se registren correctamente
    container.addEventListener('mousedown', (e) => {
        const onCard = isOnCard(e);
        console.log(`${container.id} mousedown - onCard: ${onCard}`);
        
        if (onCard) {
            isDraggingCard = true;
            return;
        }
        
        isDown = true;
        container.classList.add('drag-scroll-active', 'no-user-select');
        startX = e.pageX;
        lastX = e.pageX;
        scrollLeft = container.scrollLeft;
        container.style.cursor = 'grabbing';
    });

    // Necesitamos capturar mouseup en todo el documento, no solo en el container
    document.addEventListener('mouseup', () => {
        if (isDown) {
            console.log(`${container.id} mouseup - Reseteando estados`);
            resetDragState();
        }
    });
    
    // El evento mouseleave debe funcionar igual
    container.addEventListener('mouseleave', () => {
        if (isDown) {
            console.log(`${container.id} mouseleave - Reseteando estados`);
            resetDragState();
        }
    });

    container.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        
        // Modificación clave: usar un enfoque directo para el desplazamiento 
        e.preventDefault();
        
        const x = e.pageX;
        const diff = x - lastX;
        
        // Usar directamente el valor negativo para que la dirección sea natural
        container.scrollLeft -= diff * 2;
        
        console.log(`Moviendo: diff=${diff}, scrollLeft=${container.scrollLeft}, maxScroll=${container.scrollWidth - container.clientWidth}`);
        
        lastX = x;
    });

    // Touch events - Aplicar la misma lógica que para mouse
    container.addEventListener('touchstart', (e) => {
        const onCard = isOnCard(e);
        console.log(`${container.id} touchstart - onCard: ${onCard}`);
        
        if (onCard) {
            isDraggingCard = true;
            return;
        }
        
        isDown = true;
        container.classList.add('drag-scroll-active', 'no-user-select');
        startX = e.touches[0].pageX;
        lastX = startX;
        scrollLeft = container.scrollLeft;
    });

    document.addEventListener('touchend', () => {
        if (isDown) {
            console.log(`${container.id} touchend - Reseteando estados`);
            resetDragState();
        }
    });

    container.addEventListener('touchmove', (e) => {
        if (!isDown) return;
        
        const x = e.touches[0].pageX;
        const diff = x - lastX;
        container.scrollLeft -= diff * 2;
        
        console.log(`Touch moviendo: diff=${diff}, scrollLeft=${container.scrollLeft}`);
        lastX = x;
    });
}

// Renderiza el tablero Kanban
export function renderKanban(pedidos, options = {}) {
    let kanbanBoard;
    if (options.only === 'complementarias') {
        kanbanBoard = document.getElementById('kanban-board-complementarias');
    } else {
        kanbanBoard = document.getElementById('kanban-board');
    }
    if (!kanbanBoard) {
        console.error("renderKanban: Elemento de Kanban no encontrado.");
        return;
    }
    console.log(`Renderizando Kanban con ${pedidos.length} pedidos.`);
    kanbanBoard.innerHTML = ''; // Limpiar contenido previo

    // --- NUEVO: Ordenar pedidos según selección ---
    let sortedPedidos = pedidos.slice();
    if (kanbanSortKey === 'cliente') {
        sortedPedidos.sort((a, b) => {
            const va = (a.cliente || '').toLowerCase();
            const vb = (b.cliente || '').toLowerCase();
            if (va < vb) return kanbanSortAsc ? -1 : 1;
            if (va > vb) return kanbanSortAsc ? 1 : -1;
            return 0;
        });
    } else {
        sortedPedidos.sort((a, b) => {
            const va = Number(a.secuenciaPedido) || 0;
            const vb = Number(b.secuenciaPedido) || 0;
            return kanbanSortAsc ? va - vb : vb - va;
        });
    }

    // --- CORREGIDO: Actualizar solo contenido, no visibilidad ---
    let sortContainer = document.getElementById('kanban-sort-buttons');
    if (sortContainer) {
        sortContainer.innerHTML = `
            <button class="btn btn-outline-secondary btn-sm${kanbanSortKey === 'secuenciaPedido' ? ' active' : ''}" id="btn-kanban-sort-secuencia">Ordenar por Nº Secuencia</button>
            <button class="btn btn-outline-secondary btn-sm${kanbanSortKey === 'cliente' ? ' active' : ''}" id="btn-kanban-sort-cliente">Ordenar por Cliente</button>
            <button class="btn btn-outline-secondary btn-sm" id="btn-kanban-sort-toggle">${kanbanSortAsc ? 'Ascendente' : 'Descendente'}</button>
        `;
        
        document.getElementById('btn-kanban-sort-secuencia').onclick = () => {
            kanbanSortKey = 'secuenciaPedido';
            renderKanban(window.currentPedidos || [], options);
        };
        document.getElementById('btn-kanban-sort-cliente').onclick = () => {
            kanbanSortKey = 'cliente';
            renderKanban(window.currentPedidos || [], options);
        };
        document.getElementById('btn-kanban-sort-toggle').onclick = () => {
            kanbanSortAsc = !kanbanSortAsc;
            renderKanban(window.currentPedidos || [], options);
        };
    }

    // Renderiza solo el grupo solicitado
    if (!options.only || options.only === 'impresion') {
        const printingGroup = createKanbanGroup(null, etapasImpresion, sortedPedidos);
        kanbanBoard.appendChild(printingGroup);
    }
    if (!options.only || options.only === 'complementarias') {
        const complementaryGroup = createKanbanGroup(null, etapasComplementarias, sortedPedidos);
        kanbanBoard.appendChild(complementaryGroup);
    }

    // Listeners de drag & drop
    addDragAndDropListeners();

    // Configurar el scroll para ambos tableros
    setupKanbanScrolling();
}

function createKanbanGroup(groupTitle, etapasInGroup, allPedidos) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'kanban-group';
    groupDiv.style.width = '100%';
    groupDiv.style.overflowX = 'auto'; // Añadir scroll al grupo
    
    const columnsContainer = document.createElement('div');
    columnsContainer.className = 'kanban-columns-container';
    
    // Forzar ancho total basado en número de columnas
    const columnWidth = 300; // ancho fijo por columna
    const totalWidth = Math.max(etapasInGroup.length * columnWidth, 1200);
    columnsContainer.style.width = `${totalWidth}px`;
    columnsContainer.style.minWidth = `${totalWidth}px`;
    columnsContainer.style.display = 'flex';
    columnsContainer.style.flexDirection = 'row';
    columnsContainer.style.flexWrap = 'nowrap';

    etapasInGroup.forEach(etapa => {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'kanban-column';
        columnDiv.dataset.etapa = etapa;
        
        // Forzar ancho fijo a cada columna
        columnDiv.style.width = `${columnWidth - 20}px`;
        columnDiv.style.minWidth = `${columnWidth - 20}px`;
        columnDiv.style.flexShrink = '0';

        // Filtrar pedidos para la etapa actual
        const pedidosInEtapa = allPedidos.filter(p => p.etapaActual === etapa);

        // --- NUEVO: color de fondo según cliente más frecuente ---
        columnDiv.style.background = getColumnColorByClientes(pedidosInEtapa);

        columnDiv.innerHTML = `<h5>${etapa}</h5>`;

        pedidosInEtapa.forEach(pedido => {
            const card = createKanbanCard(pedido);
            columnDiv.appendChild(card);
        });

        columnsContainer.appendChild(columnDiv);
    });

    groupDiv.appendChild(columnsContainer);
    return groupDiv;
}

// NUEVO: color de columna por cliente más frecuente o primero
function getColumnColorByClientes(pedidosInEtapa) {
    if (!pedidosInEtapa || pedidosInEtapa.length === 0) {
        // Color neutro si no hay pedidos
        return 'hsl(210, 20%, 97%)';
    }
    // Cuenta ocurrencias de cada cliente
    const counts = {};
    pedidosInEtapa.forEach(p => {
        const cliente = p.cliente || '';
        counts[cliente] = (counts[cliente] || 0) + 1;
    });
    // Encuentra el cliente más frecuente
    let maxCliente = '';
    let maxCount = 0;
    Object.entries(counts).forEach(([cliente, count]) => {
        if (count > maxCount) {
            maxCount = count;
            maxCliente = cliente;
        }
    });
    // Si todos son diferentes (maxCount === 1), usa el primero
    const clienteColor = maxCount === 1
        ? pedidosInEtapa[0].cliente || ''
        : maxCliente;
    // Si no hay cliente, color neutro
    if (!clienteColor) return 'hsl(210, 20%, 97%)';
    return stringToColor(clienteColor, 90, 96); // pastel más suave
}

// Modifica stringToColor para aceptar saturación/luz
function stringToColor(str, s = 60, l = 80) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, ${s}%, ${l}%)`;
}

function etapaColumnColor(etapa) {
    // Genera un color pastel único por etapa
    let hash = 0;
    for (let i = 0; i < etapa.length; i++) {
        hash = etapa.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 93%)`;
}

function createKanbanCard(pedido) {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.id = `pedido-${pedido.id}`;
    card.draggable = true;
    card.dataset.id = pedido.id;
    card.style.wordBreak = 'break-word';
    card.style.overflowWrap = 'anywhere';
    card.style.maxWidth = '100%';
    card.style.minWidth = '0';

    const fechaDisplay = pedido.fecha ? ` (${pedido.fecha})` : '';
    let clienteBadge = '';
    if (pedido.cliente) {
        const color = stringToColor(pedido.cliente);
        clienteBadge = `<span class="badge badge-cliente ms-1" style="background:${color};color:#333;font-size:0.75em; margin-right:0.5em;">${pedido.cliente}</span>`;
    }
    const metrosBadge = pedido.metros
        ? `<span class="badge bg-secondary ms-1" style="font-size:0.75em;">${pedido.metros} m</span>`
        : '';

    const etapasHtml = pedido.etapasSecuencia && pedido.etapasSecuencia.length > 0
        ? `<div class="etapas-display">Secuencia: ${
            pedido.etapasSecuencia
                .filter(et => !etapasImpresion.includes(et))
                .join(' -> ') || 'N/A'
        }</div>`
        : '';

    let etapaBtnText = '';
    let showEtapaBtn = false;
    if (pedido.etapaActual !== 'Completado' && pedido.etapasSecuencia && pedido.etapasSecuencia.length > 0) {
        const idx = pedido.etapasSecuencia.indexOf(pedido.etapaActual);
        if (etapasImpresion.includes(pedido.etapaActual)) {
            etapaBtnText = 'Iniciar trabajo';
            showEtapaBtn = true;
        } else if (idx > -1 && idx < pedido.etapasSecuencia.length - 1) {
            etapaBtnText = 'Siguiente trabajo';
            showEtapaBtn = true;
        } else if (idx === pedido.etapasSecuencia.length - 1) {
            etapaBtnText = 'Completar';
            showEtapaBtn = true;
        } else {
            // Si la etapa actual no está en la secuencia, mostramos el botón de siguiente trabajo
            // basándonos en la última etapa de la secuencia
            const lastEtapa = pedido.etapasSecuencia[pedido.etapasSecuencia.length - 1];
            if (pedido.etapaActual !== lastEtapa) {
                etapaBtnText = 'Siguiente trabajo';
                showEtapaBtn = true;
            }
        }
    }

    card.innerHTML = `
        <div class="kanban-card-header" style="word-break:break-word;overflow-wrap:anywhere;max-width:100%;">
            ${clienteBadge}
            <div>
                ${metrosBadge}
            </div>
        </div>
        <div class="kanban-card-body" style="word-break:break-word;overflow-wrap:anywhere;max-width:100%;">
            <div style="font-weight:bold; font-size:1em; margin-bottom:0.2em;">
                ${pedido.numeroPedido || 'N/A'}${fechaDisplay}
            </div>
            <p><strong>Máquina:</strong> ${pedido.maquinaImpresion || 'N/A'}</p>
            ${etapasHtml}
        </div>
        <div class="kanban-card-footer" style="word-break:break-word;overflow-wrap:anywhere;max-width:100%;">
            <button class="btn btn-sm btn-outline-primary" onclick="openPedidoModal('${pedido.id}')">Ver/Editar</button>
            ${showEtapaBtn ? `<button class="btn btn-sm btn-outline-success mt-1" onclick="completeStage('${pedido.id}')">${etapaBtnText}</button>` : ''}
        </div>
    `;
    return card;
}

// Drag & Drop
export function addDragAndDropListeners() {
    const cards = document.querySelectorAll('.kanban-card');
    const columns = document.querySelectorAll('.kanban-column');

    cards.forEach(card => {
        card.removeEventListener('dragstart', dragStart);
        card.removeEventListener('dragend', dragEnd);
        card.addEventListener('dragstart', dragStart);
        card.addEventListener('dragend', dragEnd);
    });

    columns.forEach(column => {
        column.removeEventListener('dragover', dragOver);
        column.removeEventListener('dragenter', dragEnter);
        column.removeEventListener('dragleave', dragLeave);
        column.removeEventListener('drop', drop);
        column.addEventListener('dragover', dragOver);
        column.addEventListener('dragenter', dragEnter);
        column.addEventListener('dragleave', dragLeave);
        column.addEventListener('drop', drop);
    });
    console.log(`Listeners D&D añadidos a ${cards.length} tarjetas y ${columns.length} columnas.`);
}

let draggedItemId = null;

function dragStart(e) {
    const card = e.target.closest('.kanban-card');
    if (!card || !card.dataset.id) {
        e.preventDefault();
        draggedItemId = null;
        return;
    }
    draggedItemId = card.dataset.id;
    e.dataTransfer.setData('text/plain', draggedItemId);
    setTimeout(() => card.classList.add('dragging'), 0);
    console.log(`Drag Start: ${draggedItemId}`);
}

function dragEnd(e) {
    const card = e.target.closest('.kanban-card');
    if (card) card.classList.remove('dragging');
    draggedItemId = null;
    console.log("Drag End");
}

function dragOver(e) {
    e.preventDefault();
}

function dragEnter(e) {
    e.preventDefault();
    const column = e.target.closest('.kanban-column');
    if (column) {
        column.classList.add('drag-over');
        console.log(`Drag Enter: Column ${column.dataset.etapa}`);
    }
}

function dragLeave(e) {
    const column = e.target.closest('.kanban-column');
    if (column) {
        if (!column.contains(e.relatedTarget)) {
            column.classList.remove('drag-over');
            console.log(`Drag Leave: Column ${column.dataset.etapa}`);
        }
    } else {
        document.querySelectorAll('.kanban-column.drag-over').forEach(c => c.classList.remove('drag-over'));
    }
}

async function drop(e) {
    e.preventDefault();
    const column = e.target.closest('.kanban-column');
    if (!column) return;

    column.classList.remove('drag-over');
    const pedidoId = e.dataTransfer.getData('text/plain');
    const nuevaEtapa = column.dataset.etapa;

    // Guarda el scroll actual del board antes de renderizar
    const kanbanBoard = column.closest('#kanban-board-complementarias') || column.closest('#kanban-board');
    const prevScroll = kanbanBoard ? kanbanBoard.scrollLeft : null;

    try {
        await updatePedido(window.db, pedidoId, { etapaActual: nuevaEtapa });
        // Restaura el scroll después de la actualización de Firestore
        if (kanbanBoard && prevScroll !== null) {
            requestAnimationFrame(() => {
                kanbanBoard.scrollLeft = prevScroll;
            });
        }
        console.log(`Pedido ${pedidoId} movido a etapa ${nuevaEtapa}`);
    } catch (error) {
        alert("Error al mover el pedido. Intenta de nuevo.");
    }
}

// Asegurar que se configura el scroll para ambos tableros
export function setupKanbanScrolling() {
    // Importante: primero quitar todos los eventos antiguos
    document.removeEventListener('mouseup', () => {});
    document.removeEventListener('touchend', () => {});
    
    // Utilizar un enfoque de transformación para el scroll
    const mainBoard = document.getElementById('kanban-board');
    const complementaryBoard = document.getElementById('kanban-board-complementarias');
    
    // Limpiar cualquier contenedor o estilo duplicado
    cleanupKanbanStructure();
    
    // Configurar cada tablero
    [mainBoard, complementaryBoard].forEach(board => {
        if (!board) return;
        
        // Limpiar eventos anteriores
        cleanupEventListeners(board);
        
        // Aplicar estilos base
        setupBoardStyles(board);
        
        // Procesar cada grupo de columnas
        const groups = board.querySelectorAll('.kanban-group');
        groups.forEach(group => {
            setupGroupContainer(group);
        });
    });
}

// Función para limpiar toda la estructura del Kanban
function cleanupKanbanStructure() {
    // Eliminar cualquier overlay de debug
    document.querySelectorAll('.debug-overlay').forEach(el => el.remove());
    
    // Eliminar botones de navegación duplicados
    document.querySelectorAll('.scroll-button').forEach(el => el.remove());
    
    // Asegurar que no haya estilos conflictivos
    document.querySelectorAll('#kanban-board, #kanban-board-complementarias').forEach(board => {
        // Asegurarse de que solo el contenido tenga scroll, no el tablero principal
        board.style.overflowX = 'hidden';
        board.style.overflowY = 'hidden';
        
        // Eliminar cualquier barra de desplazamiento nativa
        const groups = board.querySelectorAll('.kanban-group');
        groups.forEach(group => {
            group.style.overflowX = 'hidden';
            group.style.overflowY = 'hidden';
        });
    });
}

// Función para limpiar event listeners anteriores
function cleanupEventListeners(board) {
    const existingListeners = board._scrollListeners || [];
    existingListeners.forEach(listener => {
        if (listener.element && listener.type && listener.callback) {
            listener.element.removeEventListener(listener.type, listener.callback);
        }
    });
    board._scrollListeners = [];
}

// Función para configurar los estilos base del tablero
function setupBoardStyles(board) {
    board.style.position = 'relative';
    board.style.overflow = 'hidden';
    board.style.width = '100%';
    board.style.padding = '0';
    board.style.cursor = 'grab';
    board.style.userSelect = 'none';
}

// Configurar el grupo y sus columnas
function setupGroupContainer(group) {
    group.style.width = '100%';
    group.style.position = 'relative';
    group.style.overflow = 'hidden';
    
    const columnsContainer = group.querySelector('.kanban-columns-container');
    if (!columnsContainer) return;
    
    // Calcular el ancho basado en columnas
    const columns = columnsContainer.querySelectorAll('.kanban-column');
    const columnWidth = 300; // px por columna
    
    // CORREGIDO: Calculamos el ancho exacto sumando el ancho real de cada columna
    // Esto asegura que no haya espacio extra al final
    let totalWidth = 0;
    
    // Estilos para cada columna - primero establecer tamaños
    columns.forEach((column, index) => {
        // Ancho base de cada columna
        const width = columnWidth - 20; // 280px
        
        // Aplicar estilos
        column.style.flex = `0 0 ${width}px`;
        column.style.width = `${width}px`;
        column.style.minWidth = `${width}px`;
        column.style.position = 'relative';
        column.style.padding = '10px';
        column.style.boxSizing = 'border-box';
        
        // Sólo añadir margen derecho a todas las columnas menos a la última
        const rightMargin = (index < columns.length - 1) ? 20 : 0;
        column.style.marginRight = `${rightMargin}px`;
        column.style.marginLeft = index === 0 ? '0' : '0'; // sin margen izquierdo
        
        // Acumular el ancho total (columna + margen derecho)
        totalWidth += width + rightMargin;
    });
    
    // Añadir un pequeño padding final para prevenir problemas de redondeo
    totalWidth += 5;
    
    // Establecer el ancho exacto del contenedor
    columnsContainer.style.position = 'relative';
    columnsContainer.style.display = 'flex';
    columnsContainer.style.flexDirection = 'row';
    columnsContainer.style.flexWrap = 'nowrap';
    columnsContainer.style.width = `${totalWidth}px`; 
    columnsContainer.style.minWidth = `${totalWidth}px`;
    columnsContainer.style.transform = 'translateX(0px)';
    columnsContainer.style.transition = 'transform 0.1s ease-out';
    
    // Debug info más detallada
    console.log(`Board ${group.closest('[id]')?.id || 'unknown'}: exactWidth=${totalWidth}px, columns=${columns.length}`);
    
    // Implementar el scroll con transformación
    implementDirectScroll(group, columnsContainer);
    
    // Añadir controles de navegación
    addScrollButtons(group.closest('[id]'), columnsContainer);
    
    // Solo añadir overlay de debug en desarrollo si está habilitado
    const isDevMode = false; // Cambiar a true para habilitar
    if (isDevMode) {
        addDebugOverlay(group, columnsContainer);
    }
}

// Función optimizada para implementar scroll directo con sensibilidad reducida
function implementDirectScroll(board, container) {
    if (!board || !container) return;
    
    let isDragging = false;
    let startPos = 0;
    let currentTranslate = 0;
    let prevTranslate = 0;
    let animationSpeed = 1.0; // AJUSTADO: Reducir la velocidad para un control más preciso
    
    const getPositionX = (event) => {
        return event.type.includes('mouse') ? event.pageX : event.touches[0].pageX;
    };
    
    const setContainerPosition = () => {
        // Limitar el desplazamiento para que no vaya demasiado lejos
        const boardWidth = board.clientWidth;
        const containerWidth = container.scrollWidth;
        
        // Calcular límites de desplazamiento de forma precisa
        const minTranslate = Math.min(-(containerWidth - boardWidth), 0);
        
        // Aplicar límites sin espacio extra al final
        if (currentTranslate > 0) { 
            currentTranslate = 0;
        } else if (currentTranslate < minTranslate) { 
            currentTranslate = minTranslate;
        }
        
        // Aplicar transformación con velocidad más suave
        container.style.transform = `translateX(${currentTranslate}px)`;
        
        // Sincronizar con scroll nativo (para coordinar ambos mecanismos)
        if (board.scrollLeft !== -currentTranslate) {
            const temp = board.onscroll;
            board.onscroll = null;
            board.scrollLeft = -currentTranslate;
            setTimeout(() => { board.onscroll = temp; }, 10);
        }
    };
    
    // Eventos para el mouse con detección mejorada de elementos interactivos
    const handleMouseDown = (e) => {
        // Lista de elementos interactivos a ignorar
        if (e.target.closest('.kanban-card, button, .debug-overlay, .scroll-button, a, input, select, textarea, [onclick], #add-pedido-btn, [data-toggle], [data-target], [role="button"]')) {
            return; // No iniciar scroll en elementos interactivos
        }
        
        isDragging = true;
        startPos = getPositionX(e);
        prevTranslate = currentTranslate;
        
        board.style.cursor = 'grabbing';
        e.preventDefault();
    };
    
    const handleMouseMove = (e) => {
        if (!isDragging) return;
        
        const currentPosition = getPositionX(e);
        const diff = currentPosition - startPos;
        
        // Aplicar un factor de suavizado basado en la velocidad del movimiento
        // Movimientos más rápidos se atenúan para mayor control
        const absDiff = Math.abs(diff);
        let factor = animationSpeed;
        
        // Reducir velocidad a mayor movimiento (para prevenir desplazamientos bruscos)
        if (absDiff > 100) factor = 0.5;
        else if (absDiff > 50) factor = 0.7;
        
        currentTranslate = prevTranslate + (diff * factor);
        setContainerPosition();
        e.preventDefault();
    };
    
    const handleMouseUp = (e) => {
        if (!isDragging) return;
        
        isDragging = false;
        prevTranslate = currentTranslate;
        board.style.cursor = 'grab';
        
        // Asegurar que llegamos al final con un pequeño impulso
        const boardWidth = board.clientWidth;
        const containerWidth = container.scrollWidth;
        if (currentTranslate < -(containerWidth - boardWidth) + 50) {
            currentTranslate = -(containerWidth - boardWidth);
            setContainerPosition();
        }
    };
    
    // Añadir los eventos
    board.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    board.addEventListener('touchstart', handleMouseDown);
    document.addEventListener('touchmove', handleMouseMove, { passive: false });
    document.addEventListener('touchend', handleMouseUp);
    
    board.addEventListener('wheel', (e) => {
        if (e.deltaX !== 0) { // Solo responder a scroll horizontal con la rueda
            currentTranslate -= e.deltaX;
            prevTranslate = currentTranslate;
            setContainerPosition();
            e.preventDefault();
        }
    }, { passive: false });
    
    board._scrollListeners = board._scrollListeners || [];
    board._scrollListeners.push(
        { element: board, type: 'mousedown', callback: handleMouseDown },
        { element: document, type: 'mousemove', callback: handleMouseMove },
        { element: document, type: 'mouseup', callback: handleMouseUp },
        { element: board, type: 'touchstart', callback: handleMouseDown },
        { element: document, type: 'touchmove', callback: handleMouseMove },
        { element: document, type: 'touchend', callback: handleMouseUp },
        { element: board, type: 'wheel', callback: handleMouseUp }
    );
    
    setContainerPosition();
}

// Función para añadir botones de navegación mejorados
function addScrollButtons(boardId, container) {
    const board = document.getElementById(boardId);
    if (!board) return;
    
    const oldButtons = board.querySelectorAll('.scroll-button, .scroll-buttons-container');
    oldButtons.forEach(btn => btn.remove());
    
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'scroll-buttons-container';
    buttonContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
    `;
    
    const leftBtn = document.createElement('button');
    leftBtn.innerHTML = '◀';
    leftBtn.className = 'scroll-button scroll-left';
    leftBtn.style.cssText = `
        position: absolute;
        left: 5px;
        top: 50%;
        transform: translateY(-50%);
        z-index: 9999;
        background: rgba(0,0,0,0.3);
        color: white;
        border: none;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        font-size: 16px;
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.2s;
        pointer-events: auto;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    
    const rightBtn = document.createElement('button');
    rightBtn.innerHTML = '▶';
    rightBtn.className = 'scroll-button scroll-right';
    rightBtn.style.cssText = `
        position: absolute;
        right: 5px;
        top: 50%;
        transform: translateY(-50%);
        z-index: 9999;
        background: rgba(0,0,0,0.3);
        color: white;
        border: none;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        font-size: 16px;
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.2s;
        pointer-events: auto;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    
    leftBtn.onmouseover = rightBtn.onmouseover = function() {
        this.style.opacity = '1';
        this.style.background = 'rgba(0,0,0,0.5)';
    };
    
    leftBtn.onmouseout = rightBtn.onmouseout = function() {
        this.style.opacity = '0.7';
        this.style.background = 'rgba(0,0,0,0.3)';
    };
    
    const getTranslateX = () => {
        const style = window.getComputedStyle(container);
        const matrix = style.transform || style.webkitTransform || style.mozTransform;
        
        if (matrix === 'none' || typeof matrix === 'undefined') {
            return 0;
        }
        
        const matrixValues = matrix.match(/matrix.*\((.+)\)/);
        if (matrixValues && matrixValues.length > 1) {
            const values = matrixValues[1].split(', ');
            return parseFloat(values[4]) || 0;
        }
        return 0;
    };
    
    const scrollAmount = 500;
    
    leftBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const currentX = getTranslateX();
        const newX = Math.min(0, currentX + scrollAmount);
        container.style.transform = `translateX(${newX}px)`;
        
        board.scrollLeft = -newX;
    };
    
    rightBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const currentX = getTranslateX();
        const minTranslate = board.clientWidth - container.scrollWidth;
        const newX = Math.max(minTranslate, currentX - scrollAmount);
        container.style.transform = `translateX(${newX}px)`;
        
        board.scrollLeft = -newX;
    };
    
    buttonContainer.appendChild(leftBtn);
    buttonContainer.appendChild(rightBtn);
    board.appendChild(buttonContainer);
}

// Función para visualizar las dimensiones en debug (opcional)
function addDebugOverlay(board, container) {
    const existingOverlay = board.querySelector('.debug-overlay');
    if (existingOverlay) existingOverlay.remove();
    
    const debugOverlay = document.createElement('div');
    debugOverlay.className = 'debug-overlay';
    debugOverlay.style.cssText = `
        position: absolute;
        bottom: 5px;
        right: 5px;
        background: rgba(0,0,0,0.6);
        color: white;
        padding: 3px 6px;
        font-size: 9px;
        z-index: 1000;
        pointer-events: none;
        border-radius: 3px;
    `;
    
    const updateDebugInfo = () => {
        const boardWidth = board.clientWidth;
        const containerWidth = container.scrollWidth;
        const style = window.getComputedStyle(container);
        const matrix = new DOMMatrix(style.transform);
        const translateX = matrix.m41;
        
        debugOverlay.innerHTML = `
            Board: ${boardWidth}px<br>
            Content: ${containerWidth}px<br>
            TranslateX: ${Math.round(translateX)}px
        `;
    };
    
    updateDebugInfo();
    const intervalId = setInterval(updateDebugInfo, 1000);
    
    board._debugInterval = intervalId;
    board.appendChild(debugOverlay);
}
