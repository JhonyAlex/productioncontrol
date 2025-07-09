// Dependencias necesarias (ajusta los imports según tu estructura real)
import { currentPedidos, etapasImpresion, etapasComplementarias } from './firestore.js';
import { doc, updateDoc, addDoc, deleteDoc, serverTimestamp, collection } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { handleSearch, setupSearchAutocomplete, safeCloseModal } from './utils.js';

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
    // Solo mostrar etapas complementarias
    const orden = (ordenPersonalizado && ordenPersonalizado.length
        ? ordenPersonalizado
        : SECUENCIA_ETAPAS_DEFAULT.slice()
    ).filter(et => !etapasImpresion.includes(et));

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

    // --- NUEVO: Manejo del campo secuenciaPedido ---
    let secuenciaPedidoInput = document.getElementById('secuenciaPedido');
    if (!secuenciaPedidoInput) {
        // Crear el input si no existe (lo ideal es agregarlo en el HTML, pero aquí lo agregamos por JS)
        const row = document.querySelector('#pedido-form .row');
        if (row) {
            const div = document.createElement('div');
            div.className = 'col-md-4';
            div.innerHTML = `
                <label for="secuenciaPedido" class="form-label">Nº Secuencia*</label>
                <input type="number" class="form-control" id="secuenciaPedido" min="1000" step="1" required>
                <div class="form-text text-danger d-none" id="secuenciaPedido-error">Debe ser único y mayor o igual a 1000.</div>
            `;
            row.parentNode.insertBefore(div, row.nextSibling);
        }
        secuenciaPedidoInput = document.getElementById('secuenciaPedido');
    }

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
            if (pedido.secuenciaPedido) {
                secuenciaPedidoInput.value = pedido.secuenciaPedido;
            }
            // CAMBIO: campo fecha como datetime-local
            if (pedido.fecha) {
                let fechaVal = '';
                if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(pedido.fecha)) {
                    fechaVal = pedido.fecha.slice(0, 16);
                } else if (/^\d{2}\/\d{2}/.test(pedido.fecha)) {
                    // Si es formato DD/MM, no se puede convertir a datetime-local, dejar vacío
                    fechaVal = '';
                }
                document.getElementById('fecha').value = fechaVal;
            }
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
                // Solo selecciona etapas complementarias
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
        // Asignar automáticamente el siguiente número de secuencia (de 10 en 10)
        const maxSec = Math.max(1000, ...window.currentPedidos.map(p => Number(p.secuenciaPedido) || 0));
        secuenciaPedidoInput.value = (Math.floor((maxSec + 10) / 10) * 10);
        // CAMBIO: fecha por defecto a ahora (datetime-local)
        const now = new Date();
        const pad = n => n.toString().padStart(2, '0');
        const fechaDefault = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
        document.getElementById('fecha').value = fechaDefault;
    }
    // --- INICIALIZAR SINCRONIZACIÓN ---
    setTimeout(syncMaquinaEtapa, 100);
    if (pedidoModal) pedidoModal.show();
}
window.openPedidoModal = openPedidoModal;

// --- NUEVA FUNCIÓN ---
function duplicarPedido(pedido) {
    // Cerrar el modal actual usando la función de utilidad
    safeCloseModal('pedidoModal');

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
    const selectedEtapas = etapasOrden.filter(et => etapasChecked.includes(et));

    const secuenciaPedidoInput = document.getElementById('secuenciaPedido');
    const secuenciaPedido = Number(secuenciaPedidoInput.value);
    const secuenciaPedidoError = document.getElementById('secuenciaPedido-error');
    secuenciaPedidoError.classList.add('d-none');

    // Validación de secuenciaPedido
    if (!secuenciaPedido || secuenciaPedido < 1000) {
        secuenciaPedidoError.textContent = "Debe ser un número mayor o igual a 1000.";
        secuenciaPedidoError.classList.remove('d-none');
        return;
    }
    // Unicidad
    const repetido = window.currentPedidos.some(p =>
        Number(p.secuenciaPedido) === secuenciaPedido && (!pedidoId || p.id !== pedidoId)
    );
    if (repetido) {
        secuenciaPedidoError.textContent = "El número de secuencia ya existe. Debe ser único.";
        secuenciaPedidoError.classList.remove('d-none');
        return;
    }

    const fechaInput = document.getElementById('fecha').value;
    const fechaError = document.getElementById('fecha-error');
    fechaError.classList.add('d-none');
    let fechaISO = '';
    if (fechaInput && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(fechaInput)) {
        fechaISO = fechaInput;
    } else if (fechaInput) {
        fechaError.textContent = "Debes seleccionar una fecha y hora válida.";
        fechaError.classList.remove('d-none');
        return;
    }

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
        fecha: fechaISO,
        observaciones: document.getElementById('observaciones').value.trim(),
        secuenciaPedido: secuenciaPedido,
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
        // Cerrar el modal correctamente usando la función de utilidad
        safeCloseModal('pedidoModal');
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
        // Cerrar el modal correctamente usando la función de utilidad
        safeCloseModal('pedidoModal');
    } catch (error) {
        alert("Error al eliminar el pedido. Inténtalo de nuevo.");
    }
}

export async function returnToPrintStage() {
    // Obtén referencias DOM dinámicamente
    const pedidoIdInput = document.getElementById('pedido-id');
    const pedidoModalElement = document.getElementById('pedidoModal');

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
        
        // Usar la función de utilidad para cerrar el modal de manera segura
        safeCloseModal(pedidoModalElement);
    } catch (error) {
        alert("Error al regresar el pedido a impresión. Inténtalo de nuevo.");
        console.error("Error al regresar pedido a impresión:", error);
    }
}

// Implementación real de completeStage
export async function completeStage(pedidoId) {
    // --- AJUSTE: Secuencia solo considera etapas complementarias ---
    const pedido = window.currentPedidos.find(p => p.id === pedidoId);
    if (!pedido || !pedido.etapasSecuencia || !Array.isArray(pedido.etapasSecuencia)) {
        alert("No se pudo avanzar la etapa. Datos incompletos.");
        return;
    }

    // Filtra la secuencia para excluir etapas de impresión
    const secuenciaComplementaria = pedido.etapasSecuencia.filter(
        et => !etapasImpresion.includes(et)
    );

    // Busca el índice de la etapa actual en la secuencia complementaria
    const idx = secuenciaComplementaria.indexOf(pedido.etapaActual);
    let nuevaEtapa = null;

    if (idx === -1) {
        // Si la etapa actual no está en complementarias, avanzar a la primera complementaria (si existe)
        nuevaEtapa = secuenciaComplementaria.length > 0 ? secuenciaComplementaria[0] : "Completado";
    } else if (idx < secuenciaComplementaria.length - 1) {
        nuevaEtapa = secuenciaComplementaria[idx + 1];
    } else {
        nuevaEtapa = "Completado";
    }

    if (!confirm(`¿Avanzar el pedido '${pedido.numeroPedido}' a la etapa '${nuevaEtapa}'?`)) return;
    try {
        await updateDoc(
            doc(window.db, "pedidos", pedidoId),
            { etapaActual: nuevaEtapa, lastMoved: serverTimestamp(), etapasSecuencia: pedido.etapasSecuencia }
        );
    } catch (error) {
        alert("Error al avanzar la etapa.");
    }
}
window.completeStage = completeStage;
if (typeof module !== 'undefined' && module.exports) { module.exports = { savePedido }; }
