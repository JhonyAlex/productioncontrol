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
    
    // Utilizar un enfoque completamente diferente para el scroll
    // En lugar de usar overflow, usaremos transform directo
    
    // 1. Configurar una estructura de CSS inline obligatoria
    const mainBoard = document.getElementById('kanban-board');
    const complementaryBoard = document.getElementById('kanban-board-complementarias');
    
    [mainBoard, complementaryBoard].forEach(board => {
        if (!board) return;
        
        // Limpiar eventos anteriores
        const existingListeners = board._scrollListeners || [];
        existingListeners.forEach(listener => {
            if (listener.element && listener.type && listener.callback) {
                listener.element.removeEventListener(listener.type, listener.callback);
            }
        });
        board._scrollListeners = [];
        
        // Aplicar estilos específicos para forzar scrolling
        board.style.position = 'relative';
        board.style.overflow = 'hidden';
        board.style.width = '100%';
        board.style.padding = '0';
        
        // Obtener el contenedor de grupos
        const groups = board.querySelectorAll('.kanban-group');
        groups.forEach(group => {
            group.style.width = '100%';
            
            const columnsContainer = group.querySelector('.kanban-columns-container');
            if (columnsContainer) {
                // Forzar ancho explícito basado en columnas
                const columns = columnsContainer.querySelectorAll('.kanban-column');
                const columnWidth = 300; // px por columna
                const totalWidth = Math.max(columns.length * columnWidth, 1500);
                
                // Estilos críticos para el container de columnas
                columnsContainer.style.position = 'relative';
                columnsContainer.style.display = 'flex';
                columnsContainer.style.flexDirection = 'row';
                columnsContainer.style.flexWrap = 'nowrap';
                columnsContainer.style.minWidth = `${totalWidth}px`;
                columnsContainer.style.width = `${totalWidth}px`;
                columnsContainer.style.transform = 'translateX(0px)'; // Para la animación
                columnsContainer.style.transition = 'transform 0.1s ease-out';
                
                // Aplicar estilos a cada columna
                columns.forEach(column => {
                    column.style.flex = '0 0 280px';
                    column.style.width = '280px';
                    column.style.minWidth = '280px';
                    column.style.position = 'relative';
                    column.style.padding = '10px';
                    column.style.boxSizing = 'border-box';
                    column.style.margin = '0 10px';
                });
                
                // Establecer información de debugging
                console.log(`Board ${board.id}: containerWidth=${columnsContainer.offsetWidth}, columns=${columns.length}, totalWidth=${totalWidth}`);
                
                // Implementar nuevo sistema de scroll con transformación directa
                implementDirectScroll(board, columnsContainer);
                
                // Añadir botones de navegación estándar como fallback
                addScrollButtons(board, columnsContainer);
                
                // Debug: Añadir indicador visual de las dimensiones
                addDebugOverlay(board, columnsContainer);
            }
        });
    });
}

// Función para implementar scroll directo mediante transform
function implementDirectScroll(board, container) {
    if (!board || !container) return;
    
    let isDragging = false;
    let startPos = 0;
    let currentTranslate = 0;
    let prevTranslate = 0;
    
    const getPositionX = (event) => {
        return event.type.includes('mouse') ? event.pageX : event.touches[0].pageX;
    };
    
    const setContainerPosition = () => {
        // Limitar el desplazamiento para que no vaya demasiado lejos
        const boardWidth = board.clientWidth;
        const containerWidth = container.scrollWidth;
        
        // Calcular límites de desplazamiento
        const minTranslate = boardWidth - containerWidth;
        
        // Aplicar límites
        if (currentTranslate > 0) {
            currentTranslate = 0;
        } else if (currentTranslate < minTranslate) {
            currentTranslate = minTranslate;
        }
        
        // Aplicar transformación
        container.style.transform = `translateX(${currentTranslate}px)`;
        
        // Debug info
        console.log(`Direct scroll: translate=${currentTranslate}, min=${minTranslate}, boardWidth=${boardWidth}, containerWidth=${containerWidth}`);
    };
    
    // Eventos para el mouse
    const handleMouseDown = (e) => {
        if (e.target.closest('.kanban-card, button')) return; // No iniciar scroll en cards o botones
        
        isDragging = true;
        startPos = getPositionX(e);
        prevTranslate = currentTranslate;
        
        board.style.cursor = 'grabbing';
        console.log('Direct scroll: Mouse down');
    };
    
    const handleMouseMove = (e) => {
        if (!isDragging) return;
        
        const currentPosition = getPositionX(e);
        const diff = currentPosition - startPos;
        currentTranslate = prevTranslate + diff;
        
        setContainerPosition();
        e.preventDefault(); // Prevenir scroll página
    };
    
    const handleMouseUp = () => {
        if (!isDragging) return;
        
        isDragging = false;
        prevTranslate = currentTranslate;
        board.style.cursor = 'grab';
        console.log('Direct scroll: Mouse up');
    };
    
    // Añadir los eventos
    board.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    // Touch events
    board.addEventListener('touchstart', handleMouseDown);
    window.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);
    
    // Guardar referencias para limpieza futura
    board._scrollListeners = board._scrollListeners || [];
    board._scrollListeners.push(
        { element: board, type: 'mousedown', callback: handleMouseDown },
        { element: window, type: 'mousemove', callback: handleMouseMove },
        { element: window, type: 'mouseup', callback: handleMouseUp },
        { element: board, type: 'touchstart', callback: handleMouseDown },
        { element: window, type: 'touchmove', callback: handleMouseMove },
        { element: window, type: 'touchend', callback: handleMouseUp }
    );
}

// Función para añadir botones de navegación
function addScrollButtons(board, container) {
    // Eliminar botones anteriores
    const oldButtons = board.querySelectorAll('.scroll-button');
    oldButtons.forEach(btn => btn.remove());
    
    const leftBtn = document.createElement('button');
    leftBtn.innerHTML = '◀';
    leftBtn.className = 'scroll-button scroll-left';
    leftBtn.style.cssText = `
        position: absolute;
        left: 5px;
        top: 50%;
        transform: translateY(-50%);
        z-index: 1000;
        background: rgba(0,0,0,0.5);
        color: white;
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        font-size: 18px;
        cursor: pointer;
        opacity: 0.8;
    `;
    
    const rightBtn = document.createElement('button');
    rightBtn.innerHTML = '▶';
    rightBtn.className = 'scroll-button scroll-right';
    rightBtn.style.cssText = `
        position: absolute;
        right: 5px;
        top: 50%;
        transform: translateY(-50%);
        z-index: 1000;
        background: rgba(0,0,0,0.5);
        color: white;
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        font-size: 18px;
        cursor: pointer;
        opacity: 0.8;
    `;
    
    // Calcular el valor de traslación actual para el container
    const getTranslateX = () => {
        const style = window.getComputedStyle(container);
        const matrix = new WebKitCSSMatrix(style.transform);
        return matrix.m41; // Valor de translateX en la matriz de transformación
    };
    
    // Desplazar izquierda y derecha con los botones
    leftBtn.onclick = () => {
        const currentX = getTranslateX();
        const newX = Math.min(0, currentX + 300); // 300px a la derecha, máximo 0
        container.style.transform = `translateX(${newX}px)`;
        console.log(`Button scroll left: ${currentX} -> ${newX}`);
    };
    
    rightBtn.onclick = () => {
        const currentX = getTranslateX();
        const minTranslate = board.clientWidth - container.scrollWidth;
        const newX = Math.max(minTranslate, currentX - 300); // 300px a la izquierda, mínimo (containerWidth - boardWidth)
        container.style.transform = `translateX(${newX}px)`;
        console.log(`Button scroll right: ${currentX} -> ${newX}`);
    };
    
    board.appendChild(leftBtn);
    board.appendChild(rightBtn);
}

// Función para visualizar las dimensiones en debug
function addDebugOverlay(board, container) {
    // Solo añadir en modo desarrollo
    const debugOverlay = document.createElement('div');
    debugOverlay.className = 'debug-overlay';
    debugOverlay.style.cssText = `
        position: absolute;
        bottom: 5px;
        right: 5px;
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 5px;
        font-size: 10px;
        z-index: 1000;
        pointer-events: none;
    `;
    
    const updateDebugInfo = () => {
        const boardWidth = board.clientWidth;
        const containerWidth = container.scrollWidth;
        const style = window.getComputedStyle(container);
        const matrix = new WebKitCSSMatrix(style.transform);
        const translateX = matrix.m41;
        
        debugOverlay.innerHTML = `
            Board: ${boardWidth}px<br>
            Content: ${containerWidth}px<br>
            TranslateX: ${translateX}px
        `;
    };
    
    // Actualizar info cada segundo
    updateDebugInfo();
    setInterval(updateDebugInfo, 1000);
    
    board.appendChild(debugOverlay);
}
