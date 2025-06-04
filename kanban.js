// Dependencias necesarias (ajusta los imports según tu estructura real)
import { etapasImpresion, etapasComplementarias, currentPedidos } from './firestore.js'; // O ajusta según donde declares estas variables
import { openPedidoModal, completeStage } from './pedidoModal.js';
import { updatePedido } from './firestore.js';

// Variables para ordenación
let kanbanSortKey = 'secuenciaPedido'; // 'secuenciaPedido' o 'cliente'
let kanbanSortAsc = true;

// NUEVO: Límite máximo absoluto para desplazamiento
let GLOBAL_MAX_TRANSLATE = -Infinity;

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
                    if (tx < GLOBAL_MAX_TRANSLATE) {
@@ -1142,84 +1142,72 @@ function addDebugOverlay(board, container) {
        
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
        GLOBAL_MAX_TRANSLATE = Math.min(GLOBAL_MAX_TRANSLATE, naturalMinTranslate);
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
