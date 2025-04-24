// Dependencias necesarias (ajusta los imports según tu estructura real)
import { currentPedidos, etapasImpresion } from './firestore.js';
import { doc, updateDoc, addDoc, deleteDoc, serverTimestamp, collection } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

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
        } else {
            alert("Error: No se pudo cargar la información del pedido.");
            return;
        }
    } else {
        pedidoModalLabel.textContent = 'Añadir Nuevo Pedido';
        document.getElementById('maquinaImpresion').value = '';
        document.getElementById('superficie').value = 'false';
        document.getElementById('transparencia').value = 'false';
    }
    if (pedidoModal) pedidoModal.show();
}
window.openPedidoModal = openPedidoModal;

export async function savePedido(event) {
    event.preventDefault();
    // Obtén referencias DOM dinámicamente
    const pedidoForm = document.getElementById('pedido-form');
    const pedidoIdInput = document.getElementById('pedido-id');
    const maquinaImpresion = document.getElementById('maquinaImpresion').value;
    const printStage = `Impresión ${maquinaImpresion}`;
    const selectedEtapas = [printStage];
    document.querySelectorAll('#etapas-secuencia-container .etapa-check:checked').forEach(checkbox => {
        selectedEtapas.push(checkbox.value);
    });

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
            const pedidoRef = doc(window.db, "pedidos", pedidoId);
            await updateDoc(pedidoRef, {
                ...pedidoData,
                lastUpdated: serverTimestamp()
            });
        } else {
            pedidoData.etapaActual = printStage;
            pedidoData.createdAt = serverTimestamp();
            await addDoc(window.pedidosCollection, pedidoData);
        }
        if (pedidoModal) pedidoModal.hide();
        pedidoForm.reset();
    } catch (error) {
        alert(`Error al guardar el pedido: ${error.message}`);
    }
}

export async function deletePedido() {
    // Obtén referencias DOM dinámicamente
    const pedidoIdInput = document.getElementById('pedido-id');
    const pedidoModalElement = document.getElementById('pedidoModal');
    const pedidoModal = pedidoModalElement ? new bootstrap.Modal(pedidoModalElement) : null;

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
        if (pedidoModal) pedidoModal.hide();
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
        if (pedidoModal) pedidoModal.hide();
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
