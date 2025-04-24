// firestore.js
// Funciones CRUD y listeners de Firestore para pedidos
import { getFirestore, collection, addDoc, serverTimestamp, query, onSnapshot, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

export const etapasImpresion = [
    "Impresión WindMöller 1",
    "Impresión GIAVE",
    "Impresión WindMöller 3",
    "Impresión Anonimo"
];
export const etapasComplementarias = [
    "Laminación SL2",
    "Laminación NEXUS",
    "Perforación MAC",
    "Perforación MIC",
    "Rebobinado S2DT",
    "Rebobinado PROSLIT",
    "Rebobinado TEMAC",
    "Pendiente de Laminar",
    "Pendiente de Rebobinado",
    "Completado"
];
// Variable global para los pedidos actuales
export let currentPedidos = [];

export function getPedidosCollection(db) {
    return collection(db, "pedidos");
}

export function listenToPedidos(pedidosCollection, onUpdate, onError) {
    const q = query(pedidosCollection);
    return onSnapshot(q, (querySnapshot) => {
        const pedidos = [];
        querySnapshot.forEach((doc) => {
            pedidos.push({ id: doc.id, ...doc.data() });
        });
        currentPedidos = pedidos; // Actualiza la variable global
        window.currentPedidos = currentPedidos; // Hacerlo global
        onUpdate(pedidos);
    }, onError);
}

export async function addPedido(pedidosCollection, pedidoData) {
    pedidoData.createdAt = serverTimestamp();
    return await addDoc(pedidosCollection, pedidoData);
}

export async function updatePedido(db, pedidoId, data) {
    // Si se está cambiando la etapa y es de impresión, sincroniza maquinaImpresion
    if (data.etapaActual && etapasImpresion.includes(data.etapaActual)) {
        // Extrae el nombre de la máquina de la etapa
        const match = data.etapaActual.match(/^Impresión (.+)$/);
        if (match) {
            data.maquinaImpresion = match[1];
        }
    }
    const pedidoRef = doc(db, "pedidos", pedidoId);
    return await updateDoc(pedidoRef, data);
}

export async function deletePedidoById(db, pedidoId) {
    const pedidoRef = doc(db, "pedidos", pedidoId);
    return await deleteDoc(pedidoRef);
}
