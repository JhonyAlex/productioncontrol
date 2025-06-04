// Dependencias necesarias (ajusta los imports según tu estructura real)
import { etapasImpresion, etapasComplementarias, currentPedidos } from './firestore.js'; // O ajusta según donde declares estas variables
import { openPedidoModal, completeStage } from './pedidoModal.js';
import { updatePedido } from './firestore.js';

// Variables para ordenación
let kanbanSortKey = 'secuenciaPedido'; // 'secuenciaPedido' o 'cliente'
let kanbanSortAsc = true;


// Helper para calcular el desplazamiento mínimo permitido
function calculateMinTranslate(board, container) {
    if (!board || !container) return 0;

    const parent = container.parentElement;
    const parentStyle = parent ? window.getComputedStyle(parent) : null;
    const paddingLeft = parentStyle ? parseFloat(parentStyle.paddingLeft) || 0 : 0;
    const paddingRight = parentStyle ? parseFloat(parentStyle.paddingRight) || 0 : 0;

    const effectiveWidth = board.clientWidth - paddingLeft - paddingRight;
    const containerWidth = container.scrollWidth;

    return Math.min(0, effectiveWidth - containerWidth);
}

// Helper para calcular el desplazamiento mínimo permitido
function calculateMinTranslate(board, container) {
    if (!board || !container) return 0;
    const boardWidth = board.clientWidth;
    const containerWidth = container.scrollWidth;
    return Math.min(0, boardWidth - containerWidth);
}

// Aplicar corrección global cuando la ventana cargue
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        fixAllContainerTranslates();
        setInterval(fixAllContainerTranslates, 750); // Intervalo un poco más frecuente
    }, 500);
});

// Monitorear cambios en CSS que podrían afectar la posición
const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && 
            mutation.attributeName === 'style' && 
            mutation.target.classList.contains('kanban-columns-container')) {
            
            const container = mutation.target;
            const style = window.getComputedStyle(container);
            const matrix = style.transform || style.webkitTransform;
            if (matrix && matrix !== 'none') {
                const match = matrix.match(/matrix.*\((.+)\)/);
                if (match && match[1]) {
                    const values = match[1].split(', ');
                    const tx = parseFloat(values[4]) || 0;
                    const board = container.closest('#kanban-board, #kanban-board-complementarias');
                    const minTranslate = calculateMinTranslate(board, container);

                    if (tx < minTranslate) {
                        console.warn(`[Observer] Corrigiendo ${container.id || 'container'}: ${tx} -> ${minTranslate}`);
                        const originalTransition = container.style.transition;
                        container.style.transition = 'none'; // Desactivar transición
                        container.style.transform = `translateX(${minTranslate}px)`;
                        container.offsetHeight; // Forzar reflow
                        container.style.transition = originalTransition; // Restaurar transición

                        if (container._scrollState) {
                            container._scrollState.currentTranslate = minTranslate;
                            // prevTranslate también debería reflejar esto si el estado se corrompió
                            container._scrollState.prevTranslate = minTranslate;
                        }
                    }
                }
            }
        }
    });
});

// Comenzar a observar cuando se cargue la página
window.addEventListener('load', () => {
    document.querySelectorAll('.kanban-columns-container').forEach(container => {
        observer.observe(container, { attributes: true });
    });
});

// Función global para corregir todos los contenedores
function fixAllContainerTranslates() {
    document.querySelectorAll('.kanban-columns-container').forEach(container => {
        const board = container.closest('#kanban-board, #kanban-board-complementarias');
        if (board) {
            const style = window.getComputedStyle(container);
            const matrix = style.transform || style.webkitTransform;
            if (matrix && matrix !== 'none') {
                const match = matrix.match(/matrix.*\((.+)\)/);
                if (match && match[1]) {
                    const values = match[1].split(', ');
                    const tx = parseFloat(values[4]) || 0;
                    const minTranslate = calculateMinTranslate(board, container);

                    if (tx < minTranslate) {
                        console.warn(`[fixAllInterval] Corrigiendo ${container.id || 'container'}: ${tx} -> ${minTranslate}`);
                        const originalTransition = container.style.transition;
                        container.style.transition = 'none';
                        container.style.transform = `translateX(${minTranslate}px)`;
                        container.offsetHeight; // Forzar reflow
                        container.style.transition = originalTransition;

                        if (container._scrollState) {
                            container._scrollState.currentTranslate = minTranslate;
                            container._scrollState.prevTranslate = minTranslate;
                        }
                    }
                }
            }
        }
    });
}

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
    // --- Guardar translateX de cada grupo antes de limpiar ---
    let mainBoard = document.getElementById('kanban-board');
    let complementaryBoard = document.getElementById('kanban-board-complementarias');

    // NUEVO: Ajustar cualquier transformación existente que esté fuera de límites
    function fixExcessiveTranslates() {
        const containers = document.querySelectorAll('.kanban-columns-container');
        containers.forEach(container => {
            const board = container.closest('.kanban-board, #kanban-board, #kanban-board-complementarias');
            if (board) {
                const style = window.getComputedStyle(container);
                const matrix = style.transform || style.webkitTransform;
                if (matrix && matrix !== 'none') {
                    const match = matrix.match(/matrix.*\((.+)\)/);
                    if (match && match[1]) {
                        const values = match[1].split(', ');
                        const tx = parseFloat(values[4]) || 0;
                        const minTranslate = calculateMinTranslate(board, container);

                        if (tx < minTranslate) {
                            container.style.transform = `translateX(${minTranslate}px)`;
                            if (container._scrollState) {
                                container._scrollState.currentTranslate = minTranslate;
                                container._scrollState.prevTranslate = minTranslate;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // NUEVO: Ejecutar primero para corregir cualquier posición existente
    fixExcessiveTranslates();

    function getGroupTransforms(board) {
        if (!board) return [];
        return Array.from(board.querySelectorAll('.kanban-columns-container')).map(container => {
            const style = window.getComputedStyle(container);
            const matrix = style.transform || style.webkitTransform || style.mozTransform;
            let translateX = 0;
            if (matrix && matrix !== 'none') {
                const match = matrix.match(/matrix.*\((.+)\)/);
                if (match && match[1]) {
                    const values = match[1].split(', ');
                    translateX = parseFloat(values[4]) || 0;

                    const minTranslate = calculateMinTranslate(board, container);

                    if (translateX < minTranslate) {
                        translateX = minTranslate;
                    }
                }
            }
            return translateX;
        });
    }
    const prevTransformsMain = getGroupTransforms(mainBoard);
    const prevTransformsComplementary = getGroupTransforms(complementaryBoard);

    let prevScrollMain = mainBoard ? mainBoard.scrollLeft : 0;
    let prevScrollComplementary = complementaryBoard ? complementaryBoard.scrollLeft : 0;

    let kanbanBoard;
    if (options.only === 'complementarias') {
        kanbanBoard = complementaryBoard;
    } else {
        kanbanBoard = mainBoard;
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
    
    // Forzar corrección inmediata después de renderizar
    fixAllContainerTranslates();

    // MEJORADO: Función para validar y ajustar límites al restaurar translateX
    function validateAndRestoreTranslates(board, prevTransforms) {
        if (!board || !prevTransforms || !prevTransforms.length) return;
        
        const containers = board.querySelectorAll('.kanban-columns-container');
        containers.forEach((container, idx) => {
            if (idx >= prevTransforms.length) return;
            
            // Usar la función global para aplicar los límites
            let tx = prevTransforms[idx] || 0;
            setContainerPosition(board, container, tx);
        });
    }

    // Aplicar restauración validada
    requestAnimationFrame(() => {
        validateAndRestoreTranslates(mainBoard, prevTransformsMain);
        validateAndRestoreTranslates(complementaryBoard, prevTransformsComplementary);
        
        // Forzar nuevamente después de la animación
        setTimeout(fixAllContainerTranslates, 100);
    });

    // Restaurar scroll nativo - solo necesario para compatibilidad
    if (mainBoard) {
        requestAnimationFrame(() => { mainBoard.scrollLeft = prevScrollMain; });
    }
    if (complementaryBoard) {
        requestAnimationFrame(() => { complementaryBoard.scrollLeft = prevScrollComplementary; });
    }
    
    // Observar nuevos contenedores
    setTimeout(() => {
        document.querySelectorAll('.kanban-columns-container').forEach(container => {
            observer.observe(container, { attributes: true });
        });
    }, 200);
}

function createKanbanGroup(groupTitle, etapasInGroup, allPedidos) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'kanban-group';
    groupDiv.style.width = '100%';
    groupDiv.style.overflowX = 'hidden'; // Mantener hidden para evitar barras de desplazamiento nativas
    
    const columnsContainer = document.createElement('div');
    columnsContainer.className = 'kanban-columns-container';
    
    const columnWidth = 300; // ancho fijo por columna
    const columnContentWidth = columnWidth - 27; 
    let totalWidth = 0;
    
    // Calculamos el ancho total considerando el gap entre columnas
    for (let i = 0; i < etapasInGroup.length; i++) {
        totalWidth += columnContentWidth;
        if (i < etapasInGroup.length - 1) {
            totalWidth += 10; // gap entre columnas
        }
    }
    
    columnsContainer.style.width = `${totalWidth}px`;
    columnsContainer.style.minWidth = `${totalWidth}px`;
    columnsContainer.style.display = 'flex';
    columnsContainer.style.flexDirection = 'row';
    columnsContainer.style.flexWrap = 'nowrap';
    columnsContainer.style.gap = '10px'; // Usar gap para espaciado uniforme

    etapasInGroup.forEach(etapa => {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'kanban-column';
        columnDiv.dataset.etapa = etapa;
        
        // MODIFICADO: Usar el mismo valor para ancho que usamos en el cálculo del total
        columnDiv.style.width = `${columnContentWidth}px`;
        columnDiv.style.minWidth = `${columnContentWidth}px`;
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

    // Formatear la fecha para mostrar solo YYYY-MM-DD
    let fechaDisplay = '';
    if (pedido.fecha) {
        let fechaStr = pedido.fecha;
        // Si es un objeto Date, formatear a string
        if (pedido.fecha instanceof Date) {
            fechaStr = pedido.fecha.toISOString().slice(0, 10);
        } else if (typeof pedido.fecha === 'string' && pedido.fecha.length >= 10) {
            fechaStr = pedido.fecha.slice(0, 10);
        }
        fechaDisplay = ` (${fechaStr})`;
    }

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
            
            // Centrar contenedor si es más pequeño que el board
            const container = group.querySelector('.kanban-columns-container');
            if (container) {
                // Usar función global que ya tiene la lógica de límites
                setContainerPosition(board, container, 0);
            }
        });
    });
}

// Función para limpiar toda la estructura del Kanban - MEJORADA
function cleanupKanbanStructure() {
    // Eliminar cualquier overlay de debug
    document.querySelectorAll('.debug-overlay').forEach(el => el.remove());
    
    // Eliminar botones de navegación duplicados
    document.querySelectorAll('.scroll-button, .scroll-buttons-container').forEach(el => el.remove());
    
    // IMPORTANTE: Asegurar que no haya NINGUNA barra de desplazamiento nativa
    document.querySelectorAll('#kanban-board, #kanban-board-complementarias, .kanban-group, .kanban-columns-container').forEach(el => {
        el.style.overflowX = 'hidden';
        el.style.overflowY = 'hidden';
        el.style.overflow = 'hidden';
        
        // Eliminar cualquier scroll nativo que pueda estar configurado
        el.scrollLeft = 0;
        
        // Añadir atributo para evitar scroll
        el.setAttribute('data-no-native-scroll', 'true');
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

// Función para configurar los estilos base del tablero - MEJORADA
function setupBoardStyles(board) {
    board.style.position = 'relative';
    board.style.overflow = 'hidden';
    board.style.width = '100%';
    board.style.padding = '0';
    board.style.cursor = 'grab';
    board.style.userSelect = 'none';
    
    // Deshabilitar completamente el scroll nativo
    board.style.overflowX = 'hidden';
    board.style.overflowY = 'hidden';
    board.style.overflow = 'hidden';
}

// Función para configurar el grupo y sus columnas
function setupGroupContainer(group) {
    group.style.width = '100%';
    group.style.position = 'relative';
    group.style.overflow = 'hidden'; // Importante: mantener hidden para evitar barras de desplazamiento nativas
    
    const columnsContainer = group.querySelector('.kanban-columns-container');
    if (!columnsContainer) return;
    
    const board = group.closest('#kanban-board, #kanban-board-complementarias');
    if (board) { // Asegurarse de que 'board' es válido aquí
        const style = window.getComputedStyle(columnsContainer);
        const matrix = style.transform || style.webkitTransform;
        if (matrix && matrix !== 'none') {
            const match = matrix.match(/matrix.*\((.+)\)/);
            if (match && match[1]) {
                const values = match[1].split(', ');
                const tx = parseFloat(values[4]) || 0;
                const minTranslate = calculateMinTranslate(board, columnsContainer);

                if (tx < minTranslate) {
                    // Corregir directamente si ya está mal al configurar
                    setContainerPosition(board, columnsContainer, tx);
                }
            }
        }
    }
    
    // Calcular el ancho basado en columnas
    const columns = columnsContainer.querySelectorAll('.kanban-column');
    const columnWidth = 300; // px por columna
    
    let totalWidth = 0;
    
    columns.forEach((column, index) => {
        const width = columnWidth - 27; 
        column.style.flex = `0 0 ${width}px`;
        column.style.width = `${width}px`;
        column.style.minWidth = `${width}px`;
        column.style.maxWidth = `${width}px`;
        column.style.position = 'relative';
        column.style.padding = '10px';
        column.style.boxSizing = 'border-box';
        column.style.margin = '0';
        totalWidth += width;
        if (index < columns.length - 1) {
            totalWidth += 10; // Espacio fijo entre columnas
        }
    });
    
    columnsContainer.style.position = 'relative';
    columnsContainer.style.display = 'flex';
    columnsContainer.style.flexDirection = 'row';
    columnsContainer.style.flexWrap = 'nowrap';
    columnsContainer.style.gap = '10px';
    columnsContainer.style.width = `${totalWidth}px`;
    columnsContainer.style.minWidth = `${totalWidth}px`;
    columnsContainer.style.maxWidth = `${totalWidth}px`; 
    columnsContainer.style.transition = 'transform 0.1s ease-out';
    
    console.log(`Board ${group.closest('[id]')?.id || 'unknown'}: calculatedWidth=${totalWidth}px, columns=${columns.length}`);
    
    if (board) { // Asegurar que 'board' es válido antes de pasarlo
        implementDirectScroll(board, columnsContainer);
        addScrollButtons(group.closest('[id]').id, columnsContainer); // Asumimos que group.closest('[id]') no será null
    }
    
    const isDevMode = false;
    if (isDevMode && board) { // Asegurar que 'board' es válido
        addDebugOverlay(group, columnsContainer);
    }
}

// Sobrescribir completo el método para manejar eventos wheel
function implementDirectScroll(board, container) {
    if (!board || !container) {
        console.error("[implementDirectScroll] Invalid board or container.");
        return;
    }
    
    let isDragging = false;
    let startPos = 0;
    // currentTranslate y prevTranslate ahora se inicializan después de leer el estado actual del DOM
    let currentTranslate;
    let prevTranslate;
    // AUMENTADO para mayor sensibilidad
    let animationSpeed = 1.5; 
    let lastTouchTime = 0;
    
    
    // Leer la posición actual del transform del DOM para inicializar currentTranslate y prevTranslate
    const initialStyle = window.getComputedStyle(container);
    const initialMatrix = initialStyle.transform || initialStyle.webkitTransform;
    if (initialMatrix && initialMatrix !== 'none') {
        const match = initialMatrix.match(/matrix.*\((.+)\)/);
        if (match && match[1]) {
            const values = match[1].split(', ');
            currentTranslate = parseFloat(values[4]) || 0;
        } else {
            currentTranslate = 0;
        }
    } else {
        currentTranslate = 0;
    }
    // Asegurar que el valor inicial también respete los límites
    currentTranslate = setContainerPosition(board, container, currentTranslate);
    prevTranslate = currentTranslate;
    
    if (!container._scrollState) container._scrollState = {};
    container._scrollState.currentTranslate = currentTranslate;
    container._scrollState.prevTranslate = prevTranslate;

    const getPositionX = (event) => {
        return event.type.includes('mouse') ? event.pageX : event.touches[0].pageX;
    };
    
    const updatePositionAndUpdateState = (newTranslateAttempt) => {
        const clampedTranslate = setContainerPosition(board, container, newTranslateAttempt);
        currentTranslate = clampedTranslate; // Actualizar el currentTranslate de implementDirectScroll
        // prevTranslate se actualiza al inicio de un nuevo drag/touch o después de un wheel.
        return clampedTranslate;
    };
    
    container._scrollState = { currentTranslate, prevTranslate }; // Guardar estado inicial
 
    const handleMouseDown = (e) => {
        if (e.target.closest('.kanban-card, button, .debug-overlay, .scroll-button, a, input, select, textarea, [onclick], #add-pedido-btn, [data-toggle], [data-target], [role="button"]')) {
            return;
        }
        isDragging = true;
        startPos = getPositionX(e);
        prevTranslate = currentTranslate; // Usar el estado actual (ya limitado) como prevTranslate
        board.style.cursor = 'grabbing';
        // e.preventDefault(); // Puede ser necesario si hay scroll nativo compitiendo
    };
    
    const handleMouseMove = (e) => {
        if (!isDragging) return;
        // e.preventDefault(); // Prevenir selección de texto, etc.
        const currentDOMPosition = getPositionX(e);
        const diff = currentDOMPosition - startPos;
        let factor = animationSpeed;
        const absDiff = Math.abs(diff);

        // Ajuste para movimientos rápidos, menos agresivo para mayor sensibilidad
        if (absDiff > 100) factor *= 0.8; // Antes era 0.4 (equivalente a 0.5 * vieja animationSpeed de 0.8)
        else if (absDiff > 50) factor *= 0.9; // Antes era 0.6 (equivalente a 0.75 * vieja animationSpeed de 0.8)
        
        const newTargetTranslate = prevTranslate + (diff * factor);
        updatePositionAndUpdateState(newTargetTranslate); // Esto actualiza currentTranslate
    };
    
    const handleMouseUp = (e) => {
        if (!isDragging) return;
        isDragging = false;
        board.style.cursor = 'grab';
        // Asegurar que la posición final esté limitada (currentTranslate ya debería estarlo)
        updatePositionAndUpdateState(currentTranslate);
        prevTranslate = currentTranslate; // Preparar para el próximo drag
    };
    
    const handleTouchStart = (e) => {
        if (e.target.closest('.kanban-card, button, .debug-overlay, .scroll-button, a, input, select, textarea, [onclick], #add-pedido-btn, [data-toggle], [data-target], [role="button"]')) {
            return;
        }
        lastTouchTime = Date.now();
        isDragging = true;
        startPos = e.touches[0].pageX;
        prevTranslate = currentTranslate;
        // e.preventDefault(); // Comentado para permitir scroll vertical nativo si es necesario
    };
    
    const handleTouchMove = (e) => {
        if (!isDragging) return;
        // e.preventDefault(); // Prevenir scroll de página mientras se arrastra el kanban
        const now = Date.now();
        const elapsed = now - lastTouchTime;
        lastTouchTime = now;
        const currentDOMPosition = e.touches[0].pageX;
        const diff = currentDOMPosition - startPos;
        let factor = animationSpeed; // animationSpeed ya está aumentada
        
        // Amortiguación para toques muy rápidos, ligeramente reducida para mayor sensibilidad
        if (elapsed < 16) factor *= 0.7; // Antes era 0.5
        
        const newTargetTranslate = prevTranslate + (diff * factor);
        updatePositionAndUpdateState(newTargetTranslate);
    };
    
    const handleTouchEnd = (e) => {
        if (!isDragging) return;
        isDragging = false;
        updatePositionAndUpdateState(currentTranslate);
        prevTranslate = currentTranslate;
    };
    
    const handleWheel = (e) => {
        if (e.deltaX !== 0) {
            // e.preventDefault(); // Prevenir scroll de página
            const newTargetTranslate = currentTranslate - e.deltaX;
            updatePositionAndUpdateState(newTargetTranslate);
            prevTranslate = currentTranslate; // Actualizar prevTranslate después del wheel
        }
    };
    
    // Eliminar listeners antiguos antes de añadir nuevos para evitar duplicados
    // (esto ya debería estar cubierto por cleanupEventListeners)

    board.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    board.addEventListener('touchstart', handleTouchStart, { passive: true }); // passive:true si no hacemos e.preventDefault()
    document.addEventListener('touchmove', handleTouchMove, { passive: false }); // passive:false si hacemos e.preventDefault()
    document.addEventListener('touchend', handleTouchEnd);
    
    board.addEventListener('wheel', handleWheel, { passive: false }); // passive:false si hacemos e.preventDefault()
    
    // Actualizar la lista de listeners si cleanupEventListeners la usa
    // (La estructura actual de _scrollListeners puede necesitar revisión si se cambia esto)
    
    // Aplicar posición inicial (ya hecho arriba) y verificar límites
    // updatePositionAndUpdateState(currentTranslate); // Ya se hace en la inicialización
}

// Función para añadir botones de navegación mejorados
function addScrollButtons(boardId, container) {
    const board = document.getElementById(boardId);
    if (!board) return;
    
    const oldButtons = board.querySelectorAll('.scroll-button, .scroll-buttons-container');
    oldButtons.forEach(btn => btn.remove());
    
    // NUEVO: Verificar si realmente necesitamos botones de scroll
    const containerWidth = container.scrollWidth;
    const boardWidth = board.clientWidth;
    
    // Si el contenedor es más pequeño o igual que el board, no necesitamos botones
    if (containerWidth <= boardWidth) {
        return;
    }
    
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
    
    const scrollAmount = 280; // Exactamente el ancho de una columna
    
    leftBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const currentX = getTranslateX();
        const newX = currentX + scrollAmount;
        setContainerPosition(board, container, newX);
    };
    
    rightBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const currentX = getTranslateX();
        const newX = currentX - scrollAmount;
        setContainerPosition(board, container, newX);
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

function setContainerPosition(board, container, newTranslate) {
    // Función utilitaria global para establecer la posición con límites estrictos
    if (!board || !container) {
        console.error("[setContainerPosition] Invalid board or container provided.");
        return 0; // Devuelve un valor seguro
    }

    const boardWidth = board.clientWidth;
    const containerWidth = container.scrollWidth;

    // El límite se calculará dinámicamente

    let clampedTranslate;

    if (containerWidth <= boardWidth) {
        // Contenido cabe o es más pequeño que el tablero: centrarlo
        clampedTranslate = (boardWidth - containerWidth) / 2;
        // console.log(`[setContainerPosition] Centrando. Board: ${boardWidth}, Cont: ${containerWidth}, Translate: ${clampedTranslate}`);
    } else {
        // Contenido es más ancho, aplicar lógica de scroll
        const naturalMinTranslate = -(containerWidth - boardWidth);

        // Calcular el límite mínimo de forma dinámica
        let effectiveMinTranslate = naturalMinTranslate;

        if (newTranslate > 0) {
            clampedTranslate = 0; // No desplazarse más allá del inicio
        } else if (newTranslate < effectiveMinTranslate) {
            clampedTranslate = effectiveMinTranslate; // No desplazarse más allá del fin permitido
        } else {
            clampedTranslate = newTranslate; // El valor está dentro del rango permitido
        }
        // console.log(`[setContainerPosition] Scroll activo. NewT: ${newTranslate}, EffMin: ${effectiveMinTranslate}, Clamped: ${clampedTranslate}`);
    }

    // NO es necesaria una verificación de seguridad final aquí si la lógica anterior es correcta,
    // ya que effectiveMinTranslate aplica el límite dinámico calculado.
    
    if (isNaN(clampedTranslate) || typeof clampedTranslate === 'undefined') {
        console.error(`[setContainerPosition] clampedTranslate inválido (${clampedTranslate}), usando 0 por defecto.`);
        clampedTranslate = 0;
    }

    const currentTransform = container.style.transform;
    const newTransform = `translateX(${clampedTranslate}px)`;

    if (currentTransform !== newTransform) {
        // console.log(`[setContainerPosition] Aplicando: ${newTransform}. NatMin: ${-(containerWidth - boardWidth)}, EffMin: ${effectiveMinTranslate}`);
        container.style.transform = newTransform;
    }

    if (!container._scrollState) container._scrollState = {};
    container._scrollState.currentTranslate = clampedTranslate;

    return clampedTranslate;
}
