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
    
    // Primero aplicar estilos antes de configurar eventos
    applyKanbanStyles();
    
    // Luego forzar el ancho mínimo de las columnas para garantizar que hay overflow
    setTimeout(() => {
        // Esperamos un poco para que el DOM termine de renderizarse
        forceMinimumColumnWidth();
        
        const complementaryBoard = document.getElementById('kanban-board-complementarias');
        const mainBoard = document.getElementById('kanban-board');
        
        // Finalmente configurar los eventos de arrastre
        if (complementaryBoard) {
            console.log("Reconfigurando scroll para tablero complementario");
            enableKanbanDragToScroll(complementaryBoard);
            
            // Agregar botones de navegación para alternativa al arrastre
            addScrollIndicator(complementaryBoard);
        } else {
            console.error("Tablero complementario no encontrado");
        }
        
        if (mainBoard) {
            console.log("Reconfigurando scroll para tablero principal");
            enableKanbanDragToScroll(mainBoard);
            
            // Agregar botones de navegación para alternativa al arrastre
            addScrollIndicator(mainBoard);
        } else {
            console.error("Tablero principal no encontrado");
        }
    }, 200); // Esperar 200ms para que el DOM se actualice
}

// Nueva función para forzar que las columnas tengan un ancho mínimo
function forceMinimumColumnWidth() {
    const columns = document.querySelectorAll('.kanban-column');
    if (columns.length === 0) {
        console.error("No se encontraron columnas en el kanban");
        return;
    }
    
    console.log(`Forzando ancho mínimo para ${columns.length} columnas`);
    
    // Forzar un ancho mínimo para cada columna
    columns.forEach(column => {
        column.style.minWidth = "280px";
        column.style.width = "280px"; // Establecer ancho fijo
        column.style.flexShrink = "0";
        column.style.boxSizing = "border-box";
    });
    
    // Forzar el ancho total de los contenedores de columnas
    const containers = document.querySelectorAll('.kanban-columns-container');
    containers.forEach((container, index) => {
        const columnsInContainer = container.querySelectorAll('.kanban-column').length;
        
        // Calcular ancho total necesario (más grande que el ancho visible)
        const columnWidth = 300; // ancho por columna incluyendo margen
        const minTotalWidth = columnsInContainer * columnWidth;
        // Asegurar un mínimo de 1500px o el ancho necesario para todas las columnas
        const forcedWidth = Math.max(minTotalWidth, 1500); 
        
        console.log(`Contenedor ${index}: columnas=${columnsInContainer}, ancho forzado=${forcedWidth}px`);
        
        // Aplicar estilos de manera forzada
        container.style.width = `${forcedWidth}px`;
        container.style.minWidth = `${forcedWidth}px`;
        container.style.maxWidth = "none";
        container.style.display = "flex";
        container.style.flexWrap = "nowrap";
        container.style.flexDirection = "row";
        container.style.alignItems = "flex-start";
        
        // Asegurarnos que el contenedor padre tenga scroll
        const parentElement = container.parentElement;
        if (parentElement) {
            parentElement.style.overflowX = "auto";
            parentElement.style.width = "100%";
            parentElement.style.display = "block";
        }
    });
    
    // Verificar si hay contenido más ancho que el contenedor
    const boards = document.querySelectorAll('#kanban-board, #kanban-board-complementarias');
    boards.forEach(board => {
        // Forzar recálculo de layout
        void board.offsetWidth;
        
        const contentWidth = board.scrollWidth;
        const containerWidth = board.clientWidth;
        
        console.log(`Board ${board.id}: contentWidth=${contentWidth}, containerWidth=${containerWidth}, overflow=${contentWidth > containerWidth}`);
        
        if (contentWidth <= containerWidth) {
            console.warn(`¡Advertencia! El contenedor ${board.id} no tiene overflow horizontal.`);
            
            // Intento más agresivo para forzar overflow
            const columnsContainer = board.querySelector('.kanban-columns-container');
            if (columnsContainer) {
                const newWidth = containerWidth * 2; // Duplicar el ancho
                columnsContainer.style.width = `${newWidth}px`;
                columnsContainer.style.minWidth = `${newWidth}px`;
                
                // Para asegurarnos de que los estilos se aplican inmediatamente
                setTimeout(() => {
                    // Verificar de nuevo después de aplicar estilos
                    const updatedContentWidth = board.scrollWidth;
                    const updatedContainerWidth = board.clientWidth;
                    console.log(`CORRECCIÓN ${board.id}: contentWidth=${updatedContentWidth}, containerWidth=${updatedContainerWidth}, overflow=${updatedContentWidth > updatedContainerWidth}`);
                }, 100);
            }
        }
    });
}

// Modificar el estilo del contenedor del Kanban
function applyKanbanStyles() {
    const kanbanBoards = document.querySelectorAll('#kanban-board, #kanban-board-complementarias');
    kanbanBoards.forEach(board => {
        if (!board) {
            console.error("No se encontró el tablero Kanban");
            return;
        }
        
        console.log(`Aplicando estilos a ${board.id}`);
        
        // Estilos críticos para el scroll
        board.style.cursor = 'grab';
        board.style.overflowX = 'scroll'; // Cambiado a scroll para forzar las barras de desplazamiento
        board.style.overflowY = 'hidden';
        board.style.scrollBehavior = 'auto'; // Cambiado a auto para scroll inmediato
        board.style.scrollbarWidth = 'thin';
        board.style.scrollbarColor = '#dee2e6 #f8f9fa';
        board.style.display = 'block'; // Asegurar que el contenedor es un bloque
        board.style.width = '100%';   // Asegurar que toma el ancho completo
        board.style.position = 'relative'; // Para posicionamiento de elementos internos
        
        // Asegurar que estos estilos se apliquen siempre
        board.style.userSelect = 'none';
        board.style.webkitUserSelect = 'none';
        board.style.mozUserSelect = 'none';
        board.style.msUserSelect = 'none';
    });
    
    // Estilo para grupos kanban
    const groups = document.querySelectorAll('.kanban-group');
    groups.forEach(group => {
        group.style.width = "100%";
        group.style.minWidth = "100%";
        group.style.boxSizing = "border-box";
    });
    
    // También asegurarnos que los contenedores internos sean correctos
    const containers = document.querySelectorAll('.kanban-columns-container');
    containers.forEach(container => {
        container.style.display = 'flex';
        container.style.flexWrap = 'nowrap';
        container.style.overflowX = 'visible';
        container.style.width = "max-content"; // Esto es crucial para que el contenido sea más ancho
        container.style.minWidth = "100%";
    });
}

// Añadir un pequeño indicador visual para el scroll
function addScrollIndicator(board) {
    if (!board) return;
    
    // Primero eliminar indicadores previos
    const oldIndicators = board.querySelectorAll('.scroll-indicator');
    oldIndicators.forEach(ind => ind.remove());
    
    // Siempre añadir los indicadores como alternativa
    const leftIndicator = document.createElement('div');
    leftIndicator.className = 'scroll-indicator scroll-left';
    leftIndicator.innerHTML = '◀';
    leftIndicator.style.cssText = `
        position: absolute;
        left: 5px;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(0,0,0,0.2);
        color: white;
        padding: 8px 12px;
        border-radius: 50%;
        cursor: pointer;
        z-index: 100;
        opacity: 0.7;
        transition: opacity 0.3s;
    `;
    
    leftIndicator.onmouseover = () => {
        leftIndicator.style.opacity = '1';
    };
    
    leftIndicator.onmouseout = () => {
        leftIndicator.style.opacity = '0.7';
    };
    
    const rightIndicator = document.createElement('div');
    rightIndicator.className = 'scroll-indicator scroll-right';
    rightIndicator.innerHTML = '▶';
    rightIndicator.style.cssText = `
        position: absolute;
        right: 5px;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(0,0,0,0.2);
        color: white;
        padding: 8px 12px;
        border-radius: 50%;
        cursor: pointer;
        z-index: 100;
        opacity: 0.7;
        transition: opacity 0.3s;
    `;
    
    rightIndicator.onmouseover = () => {
        rightIndicator.style.opacity = '1';
    };
    
    rightIndicator.onmouseout = () => {
        rightIndicator.style.opacity = '0.7';
    };
    
    leftIndicator.onclick = () => {
        board.scrollLeft -= 300;
    };
    
    rightIndicator.onclick = () => {
        board.scrollLeft += 300;
    };
    
    board.appendChild(leftIndicator);
    board.appendChild(rightIndicator);
    
    console.log(`Indicadores de desplazamiento añadidos a ${board.id}`);
}
