// Funciones de manejo de scroll y posicionamiento

const boardScrollPositions = {};

export function trackBoardScroll(element) {
    if (!element || element._trackScrollAttached) return;
    element.addEventListener('scroll', () => {
        boardScrollPositions[element.id] = element.scrollLeft;
    });
    element._trackScrollAttached = true;
}

export function calculateMinTranslate(board) {
    const container = board.querySelector('.kanban-columns-container');
    if (!container) return 0;
    const columns = container.children;
    const totalColumns = columns.length;
    const columnWidth = columns[0]?.offsetWidth || 273;
    const gap = 10;
    const visibleWidth = board.offsetWidth;
    const totalWidth = totalColumns * (columnWidth + gap) - gap;
    const minTranslate = visibleWidth - totalWidth;
    return minTranslate < 0 ? minTranslate : 0;
}

const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        if (mutation.type === 'attributes' &&
            mutation.attributeName === 'style' &&
            mutation.target.classList.contains('kanban-columns-container')) {
            const container = mutation.target;
            const board = container.closest('#kanban-board, #kanban-board-complementarias');
            const style = window.getComputedStyle(container);
            const matrix = style.transform || style.webkitTransform;
            if (matrix && matrix !== 'none') {
                const match = matrix.match(/matrix.*\((.+)\)/);
                if (match && match[1]) {
                    const values = match[1].split(', ');
                    const tx = parseFloat(values[4]) || 0;
                    const minTranslate = calculateMinTranslate(board, container);
                    if (tx < minTranslate) {
                        const originalTransition = container.style.transition;
                        container.style.transition = 'none';
                        container.style.transform = `translateX(${minTranslate}px)`;
                        container.offsetHeight;
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
});

export function fixAllContainerTranslates() {
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
                        const originalTransition = container.style.transition;
                        container.style.transition = 'none';
                        container.style.transform = `translateX(${minTranslate}px)`;
                        container.offsetHeight;
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

export function enableKanbanDragToScroll(container) {
    if (!container) return;
    let isDown = false;
    let startX;
    let scrollLeft;
    function isOnCard(e) {
        return !!e.target.closest('.kanban-card, button');
    }
    function resetDragState() {
        isDown = false;
        container.classList.remove('drag-scroll-active', 'no-user-select');
        container.style.cursor = 'grab';
    }
    container.addEventListener('mousedown', e => {
        if (isOnCard(e)) return;
        isDown = true;
        container.classList.add('drag-scroll-active', 'no-user-select');
        container.style.cursor = 'grabbing';
        startX = e.pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
    });
    container.addEventListener('mouseleave', resetDragState);
    container.addEventListener('mouseup', resetDragState);
    container.addEventListener('mousemove', e => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - container.offsetLeft;
        const walk = (x - startX) * 1;
        container.scrollLeft = scrollLeft - walk;
    });
}

export function setupKanbanScrolling() {
    const mainBoard = document.getElementById('kanban-board');
    const complementaryBoard = document.getElementById('kanban-board-complementarias');
    cleanupKanbanStructure();
    [mainBoard, complementaryBoard].forEach(board => {
        if (!board) return;
        cleanupEventListeners(board);
        setupBoardStyles(board);
        const groups = board.querySelectorAll('.kanban-group');
        groups.forEach(group => {
            setupGroupContainer(group);
            const container = group.querySelector('.kanban-columns-container');
            if (container) setContainerPosition(board, container, 0);
        });
    });
}

function cleanupKanbanStructure() {
    document.querySelectorAll('.debug-overlay').forEach(el => el.remove());
    document.querySelectorAll('.scroll-button, .scroll-buttons-container').forEach(el => el.remove());
    document.querySelectorAll('#kanban-board, #kanban-board-complementarias, .kanban-group, .kanban-columns-container').forEach(el => {
        el.style.overflow = 'hidden';
        el.scrollLeft = 0;
        el.setAttribute('data-no-native-scroll', 'true');
    });
}

function cleanupEventListeners(board) {
    const existing = board._scrollListeners || [];
    existing.forEach(listener => {
        if (listener.element && listener.type && listener.callback) {
            listener.element.removeEventListener(listener.type, listener.callback);
        }
    });
    board._scrollListeners = [];
}

function setupBoardStyles(board) {
    board.style.position = 'relative';
    board.style.overflow = 'hidden';
    board.style.width = '100%';
    board.style.padding = '0';
    board.style.cursor = 'grab';
    board.style.userSelect = 'none';
}

function setupGroupContainer(group) {
    group.style.width = '100%';
    group.style.position = 'relative';
    group.style.overflow = 'hidden';
    const columnsContainer = group.querySelector('.kanban-columns-container');
    if (!columnsContainer) return;
    const board = group.closest('#kanban-board, #kanban-board-complementarias');
    if (board) {
        const style = window.getComputedStyle(columnsContainer);
        const matrix = style.transform || style.webkitTransform;
        if (matrix && matrix !== 'none') {
            const match = matrix.match(/matrix.*\((.+)\)/);
            if (match && match[1]) {
                const values = match[1].split(', ');
                const tx = parseFloat(values[4]) || 0;
                const minTranslate = calculateMinTranslate(board, columnsContainer);
                if (tx < minTranslate) {
                    setContainerPosition(board, columnsContainer, tx);
                }
            }
        }
    }
    const columns = columnsContainer.querySelectorAll('.kanban-column');
    const columnWidth = 300;
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
        if (index < columns.length - 1) totalWidth += 10;
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
    if (board) {
        implementDirectScroll(board, columnsContainer);
        addScrollButtons(board.id, columnsContainer);
    }
}

function implementDirectScroll(board, container) {
    if (!board || !container) return;
    let isDragging = false;
    let startPos = 0;
    let currentTranslate;
    let prevTranslate;
    let animationSpeed = 1.5;
    let lastTouchTime = 0;
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
    currentTranslate = setContainerPosition(board, container, currentTranslate);
    prevTranslate = currentTranslate;
    if (!container._scrollState) container._scrollState = {};
    container._scrollState.currentTranslate = currentTranslate;
    container._scrollState.prevTranslate = prevTranslate;
    const getPositionX = event => event.type.includes('mouse') ? event.pageX : event.touches[0].pageX;
    const updatePos = newTranslateAttempt => {
        const clampedTranslate = setContainerPosition(board, container, newTranslateAttempt);
        currentTranslate = clampedTranslate;
        return clampedTranslate;
    };
    const handleMouseDown = e => {
        if (e.target.closest('.kanban-card, button, .debug-overlay, .scroll-button, a, input, select, textarea')) return;
        isDragging = true;
        startPos = getPositionX(e);
        prevTranslate = currentTranslate;
        board.style.cursor = 'grabbing';
    };
    const handleMouseMove = e => {
        if (!isDragging) return;
        const currentDOMPosition = getPositionX(e);
        const diff = currentDOMPosition - startPos;
        let factor = animationSpeed;
        const absDiff = Math.abs(diff);
        if (absDiff > 100) factor *= 0.8;
        else if (absDiff > 50) factor *= 0.9;
        const newTargetTranslate = prevTranslate + (diff * factor);
        updatePos(newTargetTranslate);
    };
    const handleMouseUp = () => {
        if (!isDragging) return;
        isDragging = false;
        board.style.cursor = 'grab';
        updatePos(currentTranslate);
        prevTranslate = currentTranslate;
    };
    const handleTouchStart = e => {
        if (e.target.closest('.kanban-card, button, .debug-overlay, .scroll-button, a, input, select, textarea')) return;
        lastTouchTime = Date.now();
        isDragging = true;
        startPos = e.touches[0].pageX;
        prevTranslate = currentTranslate;
    };
    const handleTouchMove = e => {
        if (!isDragging) return;
        const now = Date.now();
        const elapsed = now - lastTouchTime;
        lastTouchTime = now;
        const currentDOMPosition = e.touches[0].pageX;
        const diff = currentDOMPosition - startPos;
        let factor = animationSpeed;
        if (elapsed < 16) factor *= 0.7;
        const newTargetTranslate = prevTranslate + (diff * factor);
        updatePos(newTargetTranslate);
    };
    const handleTouchEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        updatePos(currentTranslate);
        prevTranslate = currentTranslate;
    };
    const handleWheel = e => {
        if (e.deltaX !== 0) {
            const newTargetTranslate = currentTranslate - e.deltaX;
            updatePos(newTargetTranslate);
            prevTranslate = currentTranslate;
        }
    };
    board.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    board.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    board.addEventListener('wheel', handleWheel, { passive: false });
}

function addScrollButtons(boardId, container) {
    const board = document.getElementById(boardId);
    if (!board) return;
    const oldButtons = board.querySelectorAll('.scroll-button, .scroll-buttons-container');
    oldButtons.forEach(btn => btn.remove());
    const containerWidth = container.scrollWidth;
    const boardWidth = board.clientWidth;
    if (containerWidth <= boardWidth) return;
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'scroll-buttons-container';
    buttonContainer.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;`;
    const leftBtn = document.createElement('button');
    leftBtn.innerHTML = '◀';
    leftBtn.className = 'scroll-button scroll-left';
    leftBtn.style.cssText = `position:absolute;left:5px;top:50%;transform:translateY(-50%);z-index:9999;background:rgba(0,0,0,0.3);color:white;border:none;border-radius:50%;width:36px;height:36px;font-size:16px;cursor:pointer;opacity:0.7;transition:opacity 0.2s;pointer-events:auto;box-shadow:0 2px 5px rgba(0,0,0,0.2);`;
    const rightBtn = document.createElement('button');
    rightBtn.innerHTML = '▶';
    rightBtn.className = 'scroll-button scroll-right';
    rightBtn.style.cssText = `position:absolute;right:5px;top:50%;transform:translateY(-50%);z-index:9999;background:rgba(0,0,0,0.3);color:white;border:none;border-radius:50%;width:36px;height:36px;font-size:16px;cursor:pointer;opacity:0.7;transition:opacity 0.2s;pointer-events:auto;box-shadow:0 2px 5px rgba(0,0,0,0.2);`;
    const getTranslateX = () => {
        const style = window.getComputedStyle(container);
        const matrix = style.transform || style.webkitTransform || style.mozTransform;
        if (matrix === 'none' || typeof matrix === 'undefined') return 0;
        const matrixValues = matrix.match(/matrix.*\((.+)\)/);
        if (matrixValues && matrixValues.length > 1) {
            const values = matrixValues[1].split(', ');
            return parseFloat(values[4]) || 0;
        }
        return 0;
    };
    const scrollAmount = 280;
    leftBtn.onclick = e => {
        e.preventDefault();
        e.stopPropagation();
        const currentX = getTranslateX();
        const newX = currentX + scrollAmount;
        setContainerPosition(board, container, newX);
    };
    rightBtn.onclick = e => {
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

function addDebugOverlay(board, container) {
    const existingOverlay = board.querySelector('.debug-overlay');
    if (existingOverlay) existingOverlay.remove();
    const debugOverlay = document.createElement('div');
    debugOverlay.className = 'debug-overlay';
    debugOverlay.style.cssText = `position:absolute;bottom:5px;right:5px;background:rgba(0,0,0,0.6);color:white;padding:3px 6px;font-size:9px;z-index:1000;pointer-events:none;border-radius:3px;`;
    const updateDebugInfo = () => {
        const boardWidth = board.clientWidth;
        const containerWidth = container.scrollWidth;
        const style = window.getComputedStyle(container);
        const matrix = new DOMMatrix(style.transform);
        const translateX = matrix.m41;
        debugOverlay.innerHTML = `Board: ${boardWidth}px<br>Content: ${containerWidth}px<br>TranslateX: ${Math.round(translateX)}px`;
    };
    updateDebugInfo();
    const intervalId = setInterval(updateDebugInfo, 1000);
    board._debugInterval = intervalId;
    board.appendChild(debugOverlay);
}

export function setContainerPosition(board, container, newTranslate) {
    if (!board || !container) return 0;
    const boardWidth = board.clientWidth;
    const containerWidth = container.scrollWidth;
    let clampedTranslate;
    if (containerWidth <= boardWidth) {
        clampedTranslate = (boardWidth - containerWidth) / 2;
    } else {
        const naturalMinTranslate = -(containerWidth - boardWidth);
        let effectiveMinTranslate = naturalMinTranslate;
        if (newTranslate > 0) {
            clampedTranslate = 0;
        } else if (newTranslate < effectiveMinTranslate) {
            clampedTranslate = effectiveMinTranslate;
        } else {
            clampedTranslate = newTranslate;
        }
    }
    if (isNaN(clampedTranslate) || typeof clampedTranslate === 'undefined') {
        clampedTranslate = 0;
    }
    const currentTransform = container.style.transform;
    const newTransform = `translateX(${clampedTranslate}px)`;
    if (currentTransform !== newTransform) {
        container.style.transform = newTransform;
    }
    if (!container._scrollState) container._scrollState = {};
    container._scrollState.currentTranslate = clampedTranslate;
    return clampedTranslate;
}

window.addEventListener('load', () => {
    document.querySelectorAll('.kanban-columns-container').forEach(container => {
        observer.observe(container, { attributes: true });
    });
});

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        fixAllContainerTranslates();
        setInterval(fixAllContainerTranslates, 750);
    }, 500);
});

