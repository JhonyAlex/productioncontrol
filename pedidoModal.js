// Dependencias necesarias (ajusta los imports según tu estructura real)
import { currentPedidos, etapasImpresion, etapasComplementarias } from './firestore.js';
import { doc, updateDoc, addDoc, deleteDoc, serverTimestamp, collection } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Secuencia por defecto (puedes ajustar el orden si lo deseas)
const SECUENCIA_ETAPAS_DEFAULT = [
    "Laminación SL2",
    "Laminación NEXUS",
    "Perforación MAC",
    "Perforación MIC",
    "Rebobinado S2DT",
    "Rebobinado PROSLIT",
    "Rebobinado TEMAC",
    "Pendiente de Laminar",
    "Pendiente de Rebobinado"
];

// Renderiza la lista ordenable de etapas
function renderEtapasSecuenciaList(seleccionadas = [], ordenPersonalizado = null) {
    const container = document.getElementById('etapas-secuencia-list');
    if (!container) return;
    // Usa el orden personalizado si existe, si no el default
    const orden = ordenPersonalizado && ordenPersonalizado.length
        ? ordenPersonalizado
        : SECUENCIA_ETAPAS_DEFAULT.slice();

    container.innerHTML = '';
    orden.forEach((etapa, idx) => {
        const checked = seleccionadas.includes(etapa);
        const li = document.createElement('li');
        li.className = 'list-group-item py-2' + (checked ? '' : ' inactive');
        li.draggable = true;
        li.dataset.idx = idx;
        li.dataset.etapa = etapa;

        li.innerHTML = `
            <span class="drag-handle bi bi-list"></span>
            <input class="form-check-input etapa-check" type="checkbox" value="${etapa}" id="etapa-${etapa.toLowerCase().replace(/[\s.]+/g, '-')}" ${checked ? 'checked' : ''}>
            <label class="form-check-label flex-grow-1" for="etapa-${etapa.toLowerCase().replace(/[\s.]+/g, '-')}">${etapa}</label>
            <button type="button" class="move-btn" title="Subir" ${idx === 0 ? 'disabled' : ''}><i class="bi bi-arrow-up"></i></button>
            <button type="button" class="move-btn" title="Bajar" ${idx === orden.length - 1 ? 'disabled' : ''}><i class="bi bi-arrow-down"></i></button>
        `;
        container.appendChild(li);
    });

    // Listeners para check y botones de mover
    container.querySelectorAll('.etapa-check').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const item = e.target.closest('.list-group-item');
            if (e.target.checked) {
                item.classList.remove('inactive');
            } else {
                item.classList.add('inactive');
            }
        });
    });
    container.querySelectorAll('.move-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            const idx = Array.from(container.children).indexOf(li);
            const isUp = btn.title === 'Subir';
            if ((isUp && idx === 0) || (!isUp && idx === container.children.length - 1)) return;
            const swapWith = isUp ? idx - 1 : idx + 1;
            if (swapWith < 0 || swapWith >= container.children.length) return;
            container.insertBefore(li, isUp ? container.children[swapWith] : container.children[swapWith].nextSibling);
            // Actualiza los botones de subir/bajar
            renderEtapasSecuenciaList(getEtapasChecked(), getEtapasOrden());
        });
    });

    // Drag & drop para reordenar
    let draggedIdx = null;
    container.querySelectorAll('.list-group-item').forEach((item, idx) => {
        item.addEventListener('dragstart', () => {
            draggedIdx = idx;
            item.classList.add('dragging');
        });
        item.addEventListener('dragend', () => {
            draggedIdx = null;
            item.classList.remove('dragging');
        });
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            const overIdx = Array.from(container.children).indexOf(item);
            if (draggedIdx === null || draggedIdx === overIdx) return;
            const draggedItem = container.children[draggedIdx];
            if (overIdx > draggedIdx) {
                container.insertBefore(draggedItem, item.nextSibling);
            } else {
                container.insertBefore(draggedItem, item);
            }
            // Actualiza los botones de subir/bajar
            renderEtapasSecuenciaList(getEtapasChecked(), getEtapasOrden());
        });
    });
}

// Obtiene el orden actual de las etapas
function getEtapasOrden() {
    const container = document.getElementById('etapas-secuencia-list');
    return Array.from(container.children).map(li => li.dataset.etapa);
}

// Obtiene las etapas activas (checked)
function getEtapasChecked() {
    const container = document.getElementById('etapas-secuencia-list');
    return Array.from(container.querySelectorAll('.etapa-check'))
        .filter(cb => cb.checked)
        .map(cb => cb.value);
}

// --- SINCRONIZACIÓN ENTRE MÁQUINA IMPRESIÓN Y ETAPA DE IMPRESIÓN ---
function syncMaquinaEtapa() {
    const maquinaImpresionSelect = document.getElementById('maquinaImpresion');
    const etapasList = document.getElementById('etapas-secuencia-list');
    if (!maquinaImpresionSelect || !etapasList) return;

    // Cuando cambia la máquina, fuerza la etapa de impresión al inicio
    maquinaImpresionSelect.addEventListener('change', () => {
        const selectedMaquina = maquinaImpresionSelect.value;
        if (!selectedMaquina) return;
        const printStage = `Impresión ${selectedMaquina}`;
        // Elimina cualquier etapa de impresión existente en la lista
        Array.from(etapasList.children).forEach((li) => {
            if (etapasImpresion.includes(li.dataset.etapa)) {
                etapasList.removeChild(li);
            }
        });
        // Inserta la nueva etapa de impresión al inicio
        const li = document.createElement('li');
        li.className = 'list-group-item py-2';
        li.draggable = false;
        li.dataset.idx = 0;
        li.dataset.etapa = printStage;
        li.innerHTML = `
            <span class="drag-handle bi bi-list"></span>
            <input class="form-check-input etapa-check" type="checkbox" value="${printStage}" id="etapa-${printStage.toLowerCase().replace(/[\s.]+/g, '-')}" checked disabled>
            <label class="form-check-label flex-grow-1" for="etapa-${printStage.toLowerCase().replace(/[\s.]+/g, '-')}">${printStage}</label>
            <button type="button" class="move-btn" title="Subir" disabled><i class="bi bi-arrow-up"></i></button>
            <button type="button" class="move-btn" title="Bajar" disabled><i class="bi bi-arrow-down"></i></button>
        `;
        etapasList.insertBefore(li, etapasList.firstChild);
    });

    // Cuando se modifica la lista, si la primera etapa es de impresión, actualiza el select
    const observer = new MutationObserver(() => {
        const orden = getEtapasOrden();
        const primeraEtapa = orden[0];
        if (primeraEtapa && etapasImpresion.includes(primeraEtapa)) {
            const maquina = primeraEtapa.replace('Impresión ', '');
            if (maquinaImpresionSelect.value !== maquina) {
                maquinaImpresionSelect.value = maquina;
            }
        }
    });
    observer.observe(etapasList, { childList: true, subtree: false });
}

export function openPedidoModal(pedidoId = null) {
    // Obtén referencias DOM dinámicamente
    const pedidoForm = document.getElementById('pedido-form');
    const pedidoIdInput = document.getElementById('pedido-id');
    const deletePedidoBtn = document.getElementById('delete-pedido-btn');
    const returnToPrintBtn = document.getElementById('return-to-print-btn');
    const pedidoModalElement = document.getElementById('pedidoModal');
    const pedidoModalLabel = document.getElementById('pedidoModalLabel');
    const pedidoModal = pedidoModalElement ? new bootstrap.Modal(pedidoModalElement) : null;

    pedidoForm.reset();
    pedidoIdInput.value = '';
    deletePedidoBtn.style.display = 'none';
    returnToPrintBtn.style.display = 'none';
    document.getElementById('etapas-secuencia-container').querySelectorAll('.etapa-check').forEach(cb => cb.checked = false);

    // Quitar botón duplicar si existe
    let btnDuplicar = document.getElementById('btn-duplicar-pedido');
    if (btnDuplicar) btnDuplicar.remove();

    if (pedidoId) {
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
            if (pedido.etapasSecuencia && Array.isArray(pedido.etapasSecuencia)) {
                const printStage = `Impresión ${pedido.maquinaImpresion}`;
                pedido.etapasSecuencia.forEach(etapa => {
                    if (etapa !== printStage) {
                        const checkbox = document.getElementById(`etapa-${etapa.toLowerCase().replace(/[\s]+/g, '-')}`);
                        if (checkbox) checkbox.checked = true;
                    }
                });
            }
            deletePedidoBtn.style.display = 'inline-block';
            if (!etapasImpresion.includes(pedido.etapaActual) && pedido.etapaActual !== 'Completado') {
                returnToPrintBtn.style.display = 'inline-block';
            }
            // Mostrar botón duplicar solo si está en etapa de impresión
            if (etapasImpresion.includes(pedido.etapaActual)) {
                btnDuplicar = document.createElement('button');
                btnDuplicar.type = 'button';
                btnDuplicar.id = 'btn-duplicar-pedido';
                btnDuplicar.className = 'btn btn-outline-secondary btn-sm ms-2';
                btnDuplicar.title = 'Duplicar pedido';
                btnDuplicar.innerHTML = '<i class="bi bi-files"></i>';
                btnDuplicar.onclick = () => duplicarPedido(pedido);
                pedidoModalLabel.parentNode.appendChild(btnDuplicar);
            }
            // Determinar orden personalizado y etapas activas
            let ordenPersonalizado = SECUENCIA_ETAPAS_DEFAULT.slice();
            let seleccionadas = [];
            if (pedido.etapasSecuencia && Array.isArray(pedido.etapasSecuencia)) {
                // Quitar la etapa de impresión
                seleccionadas = pedido.etapasSecuencia.filter(et => !etapasImpresion.includes(et));
                // Orden personalizado: primero las que están en la secuencia, luego el resto
                ordenPersonalizado = [
                    ...seleccionadas,
                    ...SECUENCIA_ETAPAS_DEFAULT.filter(et => !seleccionadas.includes(et))
                ];
            }
            renderEtapasSecuenciaList(seleccionadas, ordenPersonalizado);
        } else {
            alert("Error: No se pudo cargar la información del pedido.");
            return;
        }
    } else {
        pedidoModalLabel.textContent = 'Añadir Nuevo Pedido';
        document.getElementById('maquinaImpresion').value = '';
        document.getElementById('superficie').value = 'false';
        document.getElementById('transparencia').value = 'false';
        // Nuevo pedido: secuencia por defecto, nada seleccionado
        renderEtapasSecuenciaList([], SECUENCIA_ETAPAS_DEFAULT);
    }
    // --- INICIALIZAR SINCRONIZACIÓN ---
    setTimeout(syncMaquinaEtapa, 100);
    if (pedidoModal) pedidoModal.show();
}
window.openPedidoModal = openPedidoModal;

// --- NUEVA FUNCIÓN ---
function duplicarPedido(pedido) {
    // Cierra el modal actual
    const pedidoModalElement = document.getElementById('pedidoModal');
    const pedidoModal = pedidoModalElement ? bootstrap.Modal.getInstance(pedidoModalElement) : null;
    if (pedidoModal) pedidoModal.hide();

    setTimeout(() => {
        // Abre el modal en modo "nuevo", rellenando los campos con los datos del pedido original
        openPedidoModal(null);
        // Rellenar campos (excepto ID y etapaActual)
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
        // Limpiar el campo oculto de ID para asegurar que es un nuevo registro
        document.getElementById('pedido-id').value = '';
        // Etapas secuencia (sin la etapa de impresión, se recalcula al guardar)
        document.getElementById('etapas-secuencia-container').querySelectorAll('.etapa-check').forEach(cb => {
            cb.checked = pedido.etapasSecuencia?.includes(cb.value) || false;
        });
    }, 400); // Espera a que el modal se cierre antes de abrir el nuevo
}

export async function savePedido(event) {
    event.preventDefault();
    // Obtén referencias DOM dinámicamente
    const pedidoForm = document.getElementById('pedido-form');
    const pedidoIdInput = document.getElementById('pedido-id');
    const pedidoId = pedidoIdInput.value;
    const maquinaImpresion = document.getElementById('maquinaImpresion').value;
    const printStage = `Impresión ${maquinaImpresion}`;
    // --- NUEVO: obtener secuencia según orden y checks ---
    const etapasOrden = getEtapasOrden();
    const etapasChecked = getEtapasChecked();
    const selectedEtapas = [printStage, ...etapasOrden.filter(et => etapasChecked.includes(et))];

    const pedidoData = {
        numeroPedido: document.getElementById('numeroPedido').value.trim(),
        cliente: document.getElementById('cliente').value.trim(),
        maquinaImpresion: maquinaImpresion,
        desarrTexto: document.getElementById('desarrTexto').value.trim(),
        desarrNumero: document.getElementById('desarrNumero').value || null,
        metros: document.getElementById('metros').value || null,
        superficie: document.getElementById('superficie').value,
        transparencia: document.getElementById('transparencia').value,
        capa: document.getElementById('capa').value.trim(),
        camisa: document.getElementById('camisa').value.trim(),
        fecha: document.getElementById('fecha').value.trim(),
        observaciones: document.getElementById('observaciones').value.trim(),
        etapasSecuencia: selectedEtapas,
    };

    // Validación mejorada
    if (!pedidoData.numeroPedido || !pedidoData.maquinaImpresion) {
        alert("Por favor, completa los campos obligatorios: Número Pedido y Máquina Impresión.");
        return;
    }
    if (pedidoData.metros && isNaN(Number(pedidoData.metros))) {
        alert("El campo 'Metros' debe ser un número válido.");
        return;
    }
    if (pedidoData.desarrNumero && isNaN(Number(pedidoData.desarrNumero))) {
        alert("El campo 'Desarr. (Número)' debe ser un número válido.");
        return;
    }

    try {
        if (pedidoId) {
            // --- NUEVO: Si la etapa actual es de impresión, sincroniza con la máquina seleccionada ---
            const pedido = currentPedidos.find(p => p.id === pedidoId);
            let etapaActual = pedido?.etapaActual;
            if (etapaActual && etapasImpresion.includes(etapaActual)) {
                etapaActual = printStage;
            }
            await updateDoc(
                doc(window.db, "pedidos", pedidoId),
                {
                    ...pedidoData,
                    etapaActual: etapaActual || pedido?.etapaActual,
                    lastUpdated: serverTimestamp()
                }
            );
        } else {
            pedidoData.etapaActual = printStage;
            pedidoData.createdAt = serverTimestamp();
            await addDoc(window.pedidosCollection, pedidoData);
        }
        // Cerrar el modal correctamente usando la instancia de Bootstrap
        const pedidoModalElement = document.getElementById('pedidoModal');
        if (pedidoModalElement) {
            const modalInstance = bootstrap.Modal.getInstance(pedidoModalElement);
            if (modalInstance) modalInstance.hide();
        }
        pedidoForm.reset();
    } catch (error) {
        alert(`Error al guardar el pedido: ${error.message}`);
    }
}

export async function deletePedido() {
    // Obtén referencias DOM dinámicamente
    const pedidoIdInput = document.getElementById('pedido-id');
    const pedidoModalElement = document.getElementById('pedidoModal');
    const pedidoId = pedidoIdInput.value;
    if (!pedidoId) {
        alert("No se ha seleccionado ningún pedido para eliminar.");
        return;
    }
    if (!confirm(`¿Estás seguro de que quieres eliminar permanentemente el pedido con ID ${pedidoId}? Esta acción no se puede deshacer.`)) {
        return;
    }
    try {
        const pedidoRef = doc(window.db, "pedidos", pedidoId);
        await deleteDoc(pedidoRef);
        // Cerrar el modal correctamente usando la instancia de Bootstrap
        if (pedidoModalElement) {
            const modalInstance = bootstrap.Modal.getInstance(pedidoModalElement);
            if (modalInstance) modalInstance.hide();
        }
    } catch (error) {
        alert("Error al eliminar el pedido. Inténtalo de nuevo.");
    }
}

export async function returnToPrintStage() {
    // Obtén referencias DOM dinámicamente
    const pedidoIdInput = document.getElementById('pedido-id');
    const pedidoModalElement = document.getElementById('pedidoModal');
    const pedidoModal = pedidoModalElement ? new bootstrap.Modal(pedidoModalElement) : null;

    const pedidoId = pedidoIdInput.value;
    if (!pedidoId) {
        alert("No se ha seleccionado ningún pedido.");
        return;
    }
    const pedido = currentPedidos.find(p => p.id === pedidoId);
    if (!pedido) {
        alert("Error: No se encontró el pedido.");
        return;
    }
    let targetPrintStage = `Impresión ${pedido.maquinaImpresion}`;
    if (pedido.etapasSecuencia && pedido.etapasSecuencia.length > 0 && etapasImpresion.includes(pedido.etapasSecuencia[0])) {
        targetPrintStage = pedido.etapasSecuencia[0];
    } else if (!etapasImpresion.includes(targetPrintStage)) {
        alert("Error: No se pudo determinar la etapa de impresión inicial para este pedido.");
        return;
    }
    if (!confirm(`¿Estás seguro de que quieres regresar el pedido '${pedido.numeroPedido}' a la etapa de impresión '${targetPrintStage}'? Se perderá el progreso en etapas posteriores.`)) {
        return;
    }
    try {
        const pedidoRef = doc(window.db, "pedidos", pedidoId);
        await updateDoc(pedidoRef, {
            etapaActual: targetPrintStage,
            lastMoved: serverTimestamp()
        });
        // Cierra el modal después de la operación
        if (pedidoModalElement) {
            const modalInstance = bootstrap.Modal.getInstance(pedidoModalElement);
            if (modalInstance) modalInstance.hide();
        }
    } catch (error) {
        alert("Error al regresar el pedido a impresión. Inténtalo de nuevo.");
    }
}

// Implementación real de completeStage
export async function completeStage(pedidoId) {
    const pedido = window.currentPedidos.find(p => p.id === pedidoId);
    if (!pedido || !pedido.etapasSecuencia || !Array.isArray(pedido.etapasSecuencia)) {
        alert("No se pudo avanzar la etapa. Datos incompletos.");
        return;
    }
    const idx = pedido.etapasSecuencia.indexOf(pedido.etapaActual);
    if (idx === -1) {
        alert("No se pudo determinar la etapa actual.");
        return;
    }
    let nuevaEtapa = null;
    if (idx < pedido.etapasSecuencia.length - 1) {
        nuevaEtapa = pedido.etapasSecuencia[idx + 1];
    } else {
        nuevaEtapa = "Completado";
    }
    if (!confirm(`¿Avanzar el pedido '${pedido.numeroPedido}' a la etapa '${nuevaEtapa}'?`)) return;
    try {
        await updateDoc(
            doc(window.db, "pedidos", pedidoId),
            { etapaActual: nuevaEtapa, lastMoved: serverTimestamp() }
        );
    } catch (error) {
        alert("Error al avanzar la etapa.");
    }
}
window.completeStage = completeStage;
