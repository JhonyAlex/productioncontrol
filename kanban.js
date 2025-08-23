// Dependencias necesarias
import { etapasImpresion, etapasComplementarias, currentPedidos } from './firestore.js';
import { openPedidoModal, completeStage } from './pedidoModal.js';
import { updatePedido } from './firestore.js';

// Variables para ordenación
let kanbanSortKey = 'secuenciaPedido'; // 'secuenciaPedido' o 'cliente'
let kanbanSortAsc = true;

// Configuración del sistema de scroll
const ANCHO_COLUMNA = 280; // Ancho estándar de cada columna (solo referencia)
const PADDING_CONTENEDOR = 24; // Padding del contenedor

// Función para obtener el gap real del CSS
function obtenerGapReal(container) {
    const estilos = window.getComputedStyle(container);
    const gap = estilos.gap || estilos.columnGap || '1.2rem';
    // Convertir rem a px (asumiendo 1rem = 16px)
    if (gap.includes('rem')) {
        return parseFloat(gap) * 16;
    } else if (gap.includes('px')) {
        return parseFloat(gap);
    }
    return 19.2; // Fallback: 1.2rem = 19.2px
}

// Mapa global para mantener el estado de scroll de cada contenedor
const estadosScroll = new Map();

// Función para calcular límites dinámicos basados en contenido real
function calcularLimitesScroll(board, container) {
    if (!board || !container) {
        console.error('[calcularLimitesScroll] Board o container inválido');
        return { minTranslate: 0, maxTranslate: 0 };
    }
    
    let anchoBoard = board.clientWidth;
    
    // Si el board no tiene ancho (aún no renderizado), intentar obtenerlo del padre o usar viewport
    if (anchoBoard === 0) {
        anchoBoard = board.parentElement?.clientWidth || window.innerWidth - 40;
        console.warn(`[calcularLimitesScroll] Board sin ancho, usando fallback: ${anchoBoard}px`);
    }
    
    const columnas = container.querySelectorAll('.kanban-column');
    
    if (columnas.length === 0) {
        return { minTranslate: 0, maxTranslate: 0 };
    }
    
    // Obtener el gap real del CSS
    const gapReal = obtenerGapReal(container);
    
    // Calcular ancho real del contenido basado en las columnas actuales
    let anchoContenido = 0;
    
    // Sumar el ancho real de cada columna
    columnas.forEach((columna, index) => {
        const estilosColumna = window.getComputedStyle(columna);
        const anchoColumna = columna.offsetWidth + 
                           parseFloat(estilosColumna.marginLeft) + 
                           parseFloat(estilosColumna.marginRight);
        anchoContenido += anchoColumna;
        
        // Añadir gap entre columnas (excepto la última)
        if (index < columnas.length - 1) {
            anchoContenido += gapReal;
        }
    });
    
    // Obtener padding real del contenedor padre (kanban-group)
    // Ya no necesitamos buscar .kanban-group - el container es el elemento principal
const grupoKanban = container;
    let paddingReal = PADDING_CONTENEDOR;
    if (grupoKanban) {
        const estilosGrupo = window.getComputedStyle(grupoKanban);
        paddingReal = parseFloat(estilosGrupo.paddingLeft) + parseFloat(estilosGrupo.paddingRight);
    }
    
    // Añadir padding del contenedor
    anchoContenido += paddingReal;
    
    let minTranslate = 0; // Posición inicial (más a la derecha)
    let maxTranslate = 0; // Posición final (más a la izquierda)
    
    if (anchoContenido > anchoBoard) {
        // El contenido es más ancho que el board, permitir scroll
        maxTranslate = -(anchoContenido - anchoBoard);
        console.log(`[calcularLimitesScroll] Contenido: ${anchoContenido}px, Board: ${anchoBoard}px, MaxTranslate: ${maxTranslate}px`);
    } else {
        // El contenido cabe en el board, centrarlo
        const centrado = (anchoBoard - anchoContenido) / 2;
        minTranslate = maxTranslate = centrado;
        console.log(`[calcularLimitesScroll] Contenido cabe en board, centrado: ${centrado}px`);
    }
    
    return { minTranslate, maxTranslate };
}

// Función para obtener el estado de scroll de un contenedor
function obtenerEstadoScroll(containerId) {
    if (!estadosScroll.has(containerId)) {
        estadosScroll.set(containerId, {
            translateX: 0,
            isDragging: false,
            startPos: 0,
            startTranslate: 0
        });
    }
    return estadosScroll.get(containerId);
}

// Función para establecer posición del contenedor con límites dinámicos
function establecerPosicionContenedor(board, container, nuevoTranslate) {
    if (!board || !container) {
        console.error('[establecerPosicionContenedor] Board o container inválido');
        return 0;
    }
    
    const { minTranslate, maxTranslate } = obtenerLimitesConCache(board, container);
    
    // Aplicar límites
    let translateLimitado = Math.max(maxTranslate, Math.min(minTranslate, nuevoTranslate));
    
    // Aplicar transformación
    container.style.transform = `translateX(${translateLimitado}px)`;
    
    // Actualizar estado
    const containerId = container.dataset.containerId || `container-${Date.now()}`;
    if (!container.dataset.containerId) {
        container.dataset.containerId = containerId;
    }
    
    const estado = obtenerEstadoScroll(containerId);
    estado.translateX = translateLimitado;
    
    return translateLimitado;
}

// Cache para límites de scroll para evitar recálculos repetidos
const limitesScrollCache = new Map();

// Función para obtener límites con cache
function obtenerLimitesConCache(board, container) {
    const cacheKey = `${board.id}-${container.dataset.containerId}`;
    
    // Verificar si hay cambios en el contenido que requieran recálculo
    const columnas = container.querySelectorAll('.kanban-column');
    const currentHash = `${columnas.length}-${container.offsetWidth}`;
    
    const cached = limitesScrollCache.get(cacheKey);
    if (cached && cached.hash === currentHash) {
        return cached.limites;
    }
    
    // Recalcular y guardar en cache
    const limites = calcularLimitesScroll(board, container);
    limitesScrollCache.set(cacheKey, { limites, hash: currentHash });
    
    return limites;
}

// Función principal para habilitar scroll por arrastre
function habilitarScrollArrastre(board, container) {
    if (!board || !container) {
        console.error('[habilitarScrollArrastre] Board o container inválido');
        return;
    }
    
    const containerId = container.dataset.containerId || `container-${Date.now()}`;
    if (!container.dataset.containerId) {
        container.dataset.containerId = containerId;
    }
    
    console.log(`Configurando drag-to-scroll para ${board.id}`);
    
    // Verificar si el contenedor realmente necesita scroll usando cache
    const limites = obtenerLimitesConCache(board, container);
    if (limites.minTranslate >= 0) {
        console.log(`Container ${containerId}: no necesita scroll`);
        return;
    }
    
    const estado = obtenerEstadoScroll(containerId);
    
    // Función para obtener posición X del evento
    const obtenerPosicionX = (event) => {
        return event.type.includes('mouse') ? event.pageX : event.touches[0].pageX;
    };
    
    // Manejadores de eventos
    const manejarInicioArrastre = (e) => {
        // Evitar arrastre en elementos interactivos
        if (e.target.closest('.kanban-card, button, a, input, select, textarea, [onclick]')) {
            return;
        }
        
        estado.isDragging = true;
        estado.startPos = obtenerPosicionX(e);
        estado.startTranslate = estado.translateX;
        
        board.style.cursor = 'grabbing';
        board.classList.add('drag-scroll-active');
        
        e.preventDefault();
    };
    
    const manejarMovimientoArrastre = (e) => {
        if (!estado.isDragging) return;
        
        const posicionActual = obtenerPosicionX(e);
        const diferencia = posicionActual - estado.startPos;
        const nuevoTranslate = estado.startTranslate + diferencia;
        
        establecerPosicionContenedor(board, container, nuevoTranslate);
        
        e.preventDefault();
    };
    
    const manejarFinArrastre = (e) => {
        if (!estado.isDragging) return;
        
        estado.isDragging = false;
        board.style.cursor = 'grab';
        board.classList.remove('drag-scroll-active');
    };
    
    const manejarRuedaRaton = (e) => {
        if (e.deltaX !== 0) {
            const nuevoTranslate = estado.translateX - e.deltaX;
            establecerPosicionContenedor(board, container, nuevoTranslate);
            e.preventDefault();
        }
    };
    
    // Limpiar eventos anteriores
    limpiarEventosContenedor(board);
    
    // Agregar nuevos eventos
    board.addEventListener('mousedown', manejarInicioArrastre);
    document.addEventListener('mousemove', manejarMovimientoArrastre);
    document.addEventListener('mouseup', manejarFinArrastre);
    
    board.addEventListener('touchstart', manejarInicioArrastre, { passive: false });
    document.addEventListener('touchmove', manejarMovimientoArrastre, { passive: false });
    document.addEventListener('touchend', manejarFinArrastre);
    
    board.addEventListener('wheel', manejarRuedaRaton, { passive: false });
    
    // Guardar referencias para limpieza posterior
    if (!board._scrollEventListeners) {
        board._scrollEventListeners = [];
    }
    
    board._scrollEventListeners.push(
        { element: board, type: 'mousedown', callback: manejarInicioArrastre },
        { element: document, type: 'mousemove', callback: manejarMovimientoArrastre },
        { element: document, type: 'mouseup', callback: manejarFinArrastre },
        { element: board, type: 'touchstart', callback: manejarInicioArrastre },
        { element: document, type: 'touchmove', callback: manejarMovimientoArrastre },
        { element: document, type: 'touchend', callback: manejarFinArrastre },
        { element: board, type: 'wheel', callback: manejarRuedaRaton }
    );
}

// Función para limpiar eventos de un contenedor - OPTIMIZADA
function limpiarEventosContenedor(board) {
    // Limpiar event listeners de scroll si existen
    if (board._scrollEventListeners) {
        board._scrollEventListeners.forEach(({ element, type, callback }) => {
            if (element && typeof element.removeEventListener === 'function') {
                element.removeEventListener(type, callback);
            }
        });
        board._scrollEventListeners = [];
    }
    
    // Limpiar otros listeners almacenados
    if (board._scrollListeners) {
        board._scrollListeners.forEach(listener => {
            if (listener.element && listener.type && listener.callback) {
                listener.element.removeEventListener(listener.type, listener.callback);
            }
        });
        board._scrollListeners = [];
    }
    
    // Resetear propiedades de arrastre
    board.style.cursor = 'grab';
    board.classList.remove('drag-scroll-active', 'no-user-select');
}

// Renderiza el tablero Kanban
export function renderKanban(pedidos, options = {}) {
    // Obtener referencias a los boards
    let mainBoard = document.getElementById('kanban-board');
    let complementaryBoard = document.getElementById('kanban-board-complementarias');

    // Los estados se mantienen automáticamente en estadosScroll global
    // No necesitamos duplicar el estado aquí

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
    
    // Restaurar estados de scroll usando la fuente única de verdad
    requestAnimationFrame(() => {
        estadosScroll.forEach((estado, containerId) => {
            const container = document.querySelector(`[data-container-id="${containerId}"]`);
            if (container) {
                const board = container.closest('#kanban-board, #kanban-board-complementarias');
                if (board) {
                    establecerPosicionContenedor(board, container, estado.translateX);
                }
            }
        });
    });
}

function createKanbanGroup(groupTitle, etapasInGroup, allPedidos) {
    // Eliminar contenedor .kanban-group redundante - usar directamente .kanban-columns-container
    const columnsContainer = document.createElement('div');
    columnsContainer.className = 'kanban-columns-container';

    // NUEVO: asignar un containerId estable por grupo
    try {
        const isComplementarias = Array.isArray(etapasComplementarias) && etapasInGroup === etapasComplementarias;
        columnsContainer.dataset.containerId = isComplementarias ? 'complementarias' : 'impresion';
    } catch (e) {
        // Fallback: asegurar un ID aunque no haya comparación posible
        columnsContainer.dataset.containerId = groupTitle || 'kanban-container';
    }

    // Mover propiedades del .kanban-group eliminado al contenedor principal
    columnsContainer.style.overflowX = 'hidden'; // Mantener hidden para evitar barras de desplazamiento nativas
    columnsContainer.style.padding = '1.2rem';
    columnsContainer.style.flexShrink = '0';
    columnsContainer.style.maxWidth = '100%';
    columnsContainer.style.overflow = 'hidden';
    
    // Usar valores consistentes con el CSS
    const columnWidth = 300; // Ancho promedio de las columnas (min-width: 280px, max-width: 320px)
    const gapWidth = 19.2; // 1.2rem = 19.2px (gap real del CSS)
    const paddingTotal = 38.4; // 1.2rem * 2 = 38.4px (padding izquierdo + derecho)
    
    // Calcular ancho total real considerando todas las columnas, gaps y padding
    const totalColumnsWidth = etapasInGroup.length * columnWidth;
    const totalGapsWidth = (etapasInGroup.length - 1) * gapWidth;
    const totalWidth = totalColumnsWidth + totalGapsWidth + paddingTotal + 50; // Margen adicional para asegurar visibilidad completa
    
    console.log(`[createKanbanGroup] Columnas: ${etapasInGroup.length}, Ancho total calculado: ${totalWidth}px`);
    
    columnsContainer.style.width = `${totalWidth}px`;
    columnsContainer.style.minWidth = `${totalWidth}px`;
    columnsContainer.style.display = 'flex';
    columnsContainer.style.flexFlow = 'row';
    columnsContainer.style.gap = '1.2rem'; // Usar el mismo valor que en CSS

    etapasInGroup.forEach(etapa => {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'kanban-column';
        columnDiv.dataset.etapa = etapa;
        
        // MODIFICADO: Usar el mismo valor para ancho que usamos en el cálculo del total
        columnDiv.style.width = `${columnWidth}px`;
        columnDiv.style.minWidth = `${columnWidth}px`;
        columnDiv.style.flexShrink = '0';

        // Filtrar pedidos para la etapa actual
        const pedidosInEtapa = allPedidos.filter(p => p.etapaActual === etapa);

        // --- NUEVO: color de fondo según cliente más frecuente ---
        columnDiv.style.background = getColumnColorByClientes(pedidosInEtapa);

        columnDiv.innerHTML = `<h5>${etapa}</h5>`;

        pedidosInEtapa.forEach(pedido => {
            const card = createKanbanCard(pedido);
            if (card) {
                columnDiv.appendChild(card);
            } else {
                console.warn(`Tarjeta no creada para pedido ${pedido.id} - datos inválidos`);
            }
        });

        columnsContainer.appendChild(columnDiv);
    });

    return columnsContainer;
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
    
    // NUEVO: Añadir data attributes requeridos para el sistema robusto de drag and drop
    // Validar que los datos requeridos existan
    if (!pedido.id || !pedido.etapaActual) {
        console.error('createKanbanCard: Faltan datos requeridos', { id: pedido.id, etapaActual: pedido.etapaActual });
        return null;
    }
    
    card.dataset.pedidoId = pedido.id;
    card.dataset.colId = pedido.etapaActual;
    
    // Validación adicional: verificar que los atributos se establecieron correctamente
    if (!card.dataset.pedidoId || !card.dataset.colId) {
        console.error('createKanbanCard: Error al establecer data attributes', {
            pedidoId: card.dataset.pedidoId,
            colId: card.dataset.colId
        });
        return null;
    }
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
        column.removeEventListener('drop', drop);
        column.addEventListener('dragover', dragOver);
        column.addEventListener('dragenter', dragEnter);
        column.addEventListener('dragleave', dragLeave);
        column.addEventListener('drop', drop);
    });
    console.log(`Listeners D&D añadidos a ${cards.length} tarjetas y ${columns.length} columnas.`);
}

// NUEVO: Sistema robusto de referencias directas para drag and drop
let draggedItemData = null;

// Variable global para preservar estado de scroll durante drag and drop
let scrollStateBeforeDrop = null;

// Función para obtener el translateX actual de un contenedor
function obtenerTranslateX(container) {
    if (!container) return 0;
    
    // Primero intentar obtener del estado guardado
    const containerId = container.dataset.containerId;
    if (containerId && estadosScroll.has(containerId)) {
        const estado = estadosScroll.get(containerId);
        return estado.translateX || 0;
    }
    
    // Si no está en el estado, extraer del CSS transform
    const transform = container.style.transform;
    if (transform && transform.includes('translateX')) {
        const match = transform.match(/translateX\(([^)]+)px\)/);
        if (match && match[1]) {
            return parseFloat(match[1]) || 0;
        }
    }
    
    return 0;
}

// Función para capturar estado de scroll con precisión
function capturarEstadoScrollPreciso() {
    const estadoScroll = {};
    
    // Capturar scroll de ambos tableros
    const mainBoard = document.getElementById('kanban-board');
    const complementaryBoard = document.getElementById('kanban-board-complementarias');
    
    [mainBoard, complementaryBoard].forEach(board => {
        if (board) {
            const container = board.querySelector('.kanban-columns-container');
            if (container && container.dataset.containerId) {
                const containerId = container.dataset.containerId;
                estadoScroll[containerId] = {
                    scrollLeft: container.scrollLeft,
                    translateX: obtenerTranslateX(container),
                    timestamp: performance.now()
                };
            }
        }
    });
    
    return estadoScroll;
}

// Función para restaurar estado de scroll con requestAnimationFrame
function restaurarEstadoScrollPreciso(estadoScroll) {
    if (!estadoScroll) return;
    
    requestAnimationFrame(() => {
        Object.keys(estadoScroll).forEach(containerId => {
            const container = document.querySelector(`[data-container-id="${containerId}"]`);
            if (container) {
                const estado = estadoScroll[containerId];
                
                // Restaurar scrollLeft
                container.scrollLeft = estado.scrollLeft;
                
                // Restaurar translateX si existe
                if (estado.translateX !== undefined) {
                    const board = container.closest('#kanban-board, #kanban-board-complementarias');
                    if (board) {
                        establecerPosicionContenedor(board, container, estado.translateX);
                    }
                }
            }
        });
    });
}

function dragStart(e) {
    const card = e.target.closest('.kanban-card');
    if (!card || !card.dataset.pedidoId) {
        console.warn('Drag iniciado en elemento inválido');
        e.preventDefault();
        draggedItemData = null;
        return;
    }
    
    const fromColumn = card.closest('.kanban-column');
    const fromColId = fromColumn ? fromColumn.dataset.etapa : null;
    
    console.log(`Drag Start: ${card.dataset.pedidoId} desde columna ${fromColId}`);
    
    // Capturar estado de scroll actual (simplificado)
    scrollStateBeforeDrop = capturarEstadoScrollPreciso();
    
    // Guardar referencias simples y directas
    draggedItemData = {
        id: card.dataset.pedidoId,
        el: card,
        fromColId: fromColId
    };
    
    // Configurar el dataTransfer
    e.dataTransfer.setData('text/plain', card.dataset.pedidoId);
    e.dataTransfer.effectAllowed = 'move';
    
    // Añadir clase visual con delay para evitar problemas de render
    setTimeout(() => {
        if (card.parentNode) {
            card.classList.add('dragging');
        }
    }, 0);
}

function dragEnd(e) {
    const card = e.target.closest('.kanban-card');
    if (card) card.classList.remove('dragging');
    
    // IMPORTANTE: No limpiar draggedItemData aquí porque drop aún no se ha ejecutado
    // draggedItemData se limpiará en la función drop después de usarse
    console.log("Drag End - manteniendo draggedItemData para drop");
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

    // NUEVO: capturar estado de scroll antes de mutar el DOM
    scrollStateBeforeDrop = capturarEstadoScrollPreciso();

    column.classList.remove('drag-over');
    const pedidoId = e.dataTransfer.getData('text/plain');
    const nuevaEtapa = column.dataset.etapa;

    console.log(`Drop iniciado: ${pedidoId} -> ${nuevaEtapa}`);

    // Verificar datos de drag válidos - intentar fallback si falta
    if (!draggedItemData) {
        console.warn('No hay draggedItemData, usando fallback');
        draggedItemData = {
            id: pedidoId,
            el: document.querySelector(`[data-pedido-id="${pedidoId}"]`),
            fromColId: null
        };
    }
    // Validar coherencia del drag; si sigue inválido, abortar
    if (!draggedItemData || draggedItemData.id !== pedidoId) {
        console.warn('Datos de drag inválidos, abortando drop');
        draggedItemData = null;
        return;
    }

    let tarjeta = draggedItemData.el;
    // Si no tenemos referencia directa, buscar la tarjeta
    if (!tarjeta || !tarjeta.parentNode) {
        console.log('Buscando tarjeta por ID...');
        tarjeta = document.querySelector(`[data-pedido-id="${pedidoId}"]`);
        if (!tarjeta) {
            console.error('No se encontró la tarjeta');
            draggedItemData = null;
            return;
        }
    }

    const targetCol = column;
    
    // Verificar que no estamos moviendo a la misma columna
    const currentColumn = tarjeta.closest('.kanban-column');
    if (currentColumn && currentColumn.dataset.etapa === nuevaEtapa) {
        console.log('Movimiento a la misma columna, ignorando');
        draggedItemData = null;
        return;
    }

    try {
        // Capturar la columna origen antes de mover
        const fromColId = currentColumn ? currentColumn.dataset.etapa : draggedItemData.fromColId;
        
        // 1. Mover la tarjeta directamente
        targetCol.appendChild(tarjeta);
        console.log('Tarjeta movida visualmente');
        
        // 2. Actualizar data-col-id de la tarjeta
        tarjeta.dataset.colId = nuevaEtapa;
         
        // 3. Actualizar contadores de las columnas afectadas
        if (fromColId && fromColId !== nuevaEtapa) {
            actualizarContadorColumna(fromColId);
        }
        actualizarContadorColumna(nuevaEtapa);

        // 4. Marcar actualización local para evitar re-render innecesario
        window.lastLocalUpdate = {
            timestamp: Date.now(),
            type: 'move',
            pedidoId: pedidoId,
            fromStage: fromColId,
            toStage: nuevaEtapa
        };

        // 5. Actualizar en Firestore
        await updatePedido(window.db, pedidoId, { etapaActual: nuevaEtapa });
        
        console.log('Actualización en Firestore completada');
        
        // 6. Mantener scroll position
        console.log(`Pedido ${pedidoId} movido exitosamente de ${fromColId} a ${nuevaEtapa}`);
        
    } catch (error) {
        console.error('Error al mover pedido:', error);
        
        // En caso de error, revertir el cambio visual
        try {
            const originalColumn = document.querySelector(`[data-etapa="${draggedItemData.fromColId}"]`);
            if (originalColumn && tarjeta.parentNode !== originalColumn) {
                originalColumn.appendChild(tarjeta);
                tarjeta.dataset.colId = draggedItemData.fromColId;
                console.log('Cambio visual revertido');
            }
        } catch (revertError) {
            console.error('Error al revertir cambio visual:', revertError);
        }
        
        alert("Error al mover el pedido. El cambio ha sido revertido.");
    } finally {
        // Limpiar estado de drag
        draggedItemData = null;
        scrollStateBeforeDrop = null;
    }
}

// Configurar sistema de scroll unificado para ambos tableros
export function setupKanbanScrolling() {
    const mainBoard = document.getElementById('kanban-board');
    const complementaryBoard = document.getElementById('kanban-board-complementarias');
    
    // Limpiar estructura anterior
    limpiarEstructuraKanban();
    
    // Configurar cada tablero
    [mainBoard, complementaryBoard].forEach(board => {
        if (!board) return;
        
        // Aplicar estilos base del board
        aplicarEstilosBoard(board);
        
        // Configurar cada grupo de columnas
        const containers = board.querySelectorAll('.kanban-columns-container');
    containers.forEach(container => {
        configurarGrupoContenedor(container, board);
    });
    });
}

// NUEVO: Función para ejecutar re-render global preservando scroll
async function ejecutarReRenderGlobalConScroll() {
    console.log('Ejecutando re-render global con preservación de scroll');
    
    // Preservar estados de scroll actuales
    const estadosPreservados = new Map();
    document.querySelectorAll('.kanban-columns-container[data-container-id]').forEach(container => {
        const containerId = container.dataset.containerId;
        const estado = obtenerEstadoScroll(containerId);
        estadosPreservados.set(containerId, { ...estado });
    });
    
    // Determinar qué tablero re-renderizar
    const tabImpresion = document.getElementById('tab-kanban-impresion');
    const tabComplementarias = document.getElementById('tab-kanban-complementarias');
    
    try {
        if (tabImpresion && tabImpresion.classList.contains('active')) {
            renderKanban(window.currentPedidos, { only: 'impresion' });
        } else if (tabComplementarias && tabComplementarias.classList.contains('active')) {
            renderKanban(window.currentPedidos, { only: 'complementarias' });
        }
        
        // Restaurar estados de scroll después del re-render
        requestAnimationFrame(() => {
            estadosPreservados.forEach((estado, containerId) => {
                const container = document.querySelector(`[data-container-id="${containerId}"]`);
                if (container) {
                    const board = container.closest('#kanban-board, #kanban-board-complementarias');
                    if (board) {
                        establecerPosicionContenedor(board, container, estado.translateX);
                    }
                }
            });
        });
        
        console.log('Re-render global completado con scroll preservado');
    } catch (error) {
        console.error('Error en re-render global:', error);
    }
}

// Función para limpiar estructura del kanban
function limpiarEstructuraKanban() {
    // Limpiar todos los event listeners existentes
    document.querySelectorAll('#kanban-board, #kanban-board-complementarias').forEach(board => {
        limpiarEventosContenedor(board);
    });
    
    // Limpiar cache de límites de scroll
    limitesScrollCache.clear();
    
    // Eliminar elementos de debug y botones antiguos
    document.querySelectorAll('.debug-overlay, .scroll-button, .scroll-buttons-container').forEach(el => {
        el.remove();
    });
    
    // Resetear estilos de scroll nativo sin perder el estado de transform
    document.querySelectorAll('.kanban-columns-container').forEach(el => {
        el.style.overflowX = 'hidden';
        el.style.overflowY = 'hidden';
        // IMPORTANTE: no resetear el transform para preservar la vista
        // Si no hay estado previo, el configurador lo establecerá.
        // el.style.transform = 'translateX(0px)'; // eliminado
    });
}

// Función para aplicar estilos base al board
function aplicarEstilosBoard(board) {
    board.style.position = 'relative';
    board.style.overflow = 'hidden';
    board.style.cursor = 'grab';
    board.style.userSelect = 'none';
}

// Función para configurar grupo contenedor
function configurarGrupoContenedor(container, board) {
    if (!container) return;

    // Aplicar estilos al contenedor
    container.style.display = 'flex';
    container.style.gap = '1.2rem'; // Usar valor CSS directo
    container.style.transition = 'transform 0.2s ease-out';
    container.style.willChange = 'transform';
    
    // Inicializar posición usando el estado almacenado si existe
    const containerId = container.dataset.containerId;
    const estado = containerId && estadosScroll.has(containerId) ? estadosScroll.get(containerId) : null;
    establecerPosicionContenedor(board, container, (estado && typeof estado.translateX === 'number') ? estado.translateX : 0);

    // Habilitar scroll por arrastre después de que el DOM esté completamente renderizado
    requestAnimationFrame(() => {
        habilitarScrollArrastre(board, container);
        agregarBotonesNavegacion(board, container);
    });
}

// Función para agregar botones de navegación si es necesario
function agregarBotonesNavegacion(board, container) {
    const limites = obtenerLimitesConCache(board, container);
    if (limites.minTranslate >= 0) return; // No necesita botones
    
    // Implementación básica de botones de navegación
    // Se puede expandir según necesidades específicas
    console.log(`Botones de navegación disponibles para ${board.id}`);
}

// Función para actualizar el contador de una columna específica
function actualizarContadorColumna(etapa) {
    if (!etapa) return;
    
    const columna = document.querySelector(`[data-etapa="${etapa}"]`);
    if (!columna) return;
    
    const contadorElemento = columna.querySelector('.column-count');
    const tarjetas = columna.querySelectorAll('.kanban-card');
    
    if (contadorElemento) {
        contadorElemento.textContent = `(${tarjetas.length})`;
    }
}
