let currentSort = { key: null, asc: true };
let currentFilters = {};
let quickStageFilter = null; // Puede ser 'laminacion', 'rebobinado', 'perforado', 'pendiente' o null

function normalizeValue(val) {
    if (typeof val === 'string') return val.toLowerCase().trim();
    if (typeof val === 'number') return val;
    return val || '';
}

function etapaToColor(etapa) {
    let hash = 0;
    for (let i = 0; i < etapa.length; i++) {
        hash = etapa.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 40%, 85%)`;
}

// --- NUEVO: función para color de cliente consistente ---
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 60%, 80%)`;
}

export function renderList(pedidos) {
    const listView = document.getElementById('list-view');
    if (!listView) {
        console.error("renderList: Elemento #list-view no encontrado.");
        return;
    }

    // --- Filtros rápidos y ordenamiento (sin inputs de filtro por columna) ---
    let filteredPedidos = pedidos.slice();
    if (quickStageFilter) {
        const startsWith = {
            laminacion: 'lamin',
            rebobinado: 'rebob',
            perforado: 'perfor',
            pendiente: 'pendiente'
        };
        filteredPedidos = filteredPedidos.filter(p =>
            (p.etapaActual || '').toLowerCase().startsWith(startsWith[quickStageFilter])
        );
    }

    // Aplica ordenamiento
    if (currentSort.key) {
        filteredPedidos.sort((a, b) => {
            let va = a[currentSort.key], vb = b[currentSort.key];
            if (!isNaN(Number(va)) && !isNaN(Number(vb))) {
                va = Number(va); vb = Number(vb);
            } else {
                va = normalizeValue(va); vb = normalizeValue(vb);
            }
            if (va < vb) return currentSort.asc ? -1 : 1;
            if (va > vb) return currentSort.asc ? 1 : -1;
            return 0;
        });
    }

    const columns = [
        { key: 'secuenciaPedido', label: 'Nº Secuencia' },
        { key: 'numeroPedido', label: 'Nº Pedido' },
        { key: 'cliente', label: 'Cliente' },
        { key: 'maquinaImpresion', label: 'Máquina Imp.' },
        { key: 'desarrTexto', label: 'Desarr.' },
        { key: 'metros', label: 'Metros' },
        { key: 'superficie', label: 'SUP' },
        { key: 'transparencia', label: 'TTE' },
        { key: 'capa', label: 'Capa' },
        { key: 'camisa', label: 'Camisa' },
        { key: 'fecha', label: 'Fecha' },
        { key: 'etapaActual', label: 'Etapa Actual' },
        { key: 'acciones', label: 'Acciones' }
    ];

    let tableHTML = `
        <table class="table table-striped table-hover table-bordered">
            <thead>
                <tr>
                    ${columns.map(col => `
                        <th style="cursor:pointer;" data-key="${col.key}">
                            ${col.label}
                            ${currentSort.key === col.key ? (currentSort.asc ? '▲' : '▼') : ''}
                        </th>
                    `).join('')}
                </tr>
            </thead>
            <tbody>
    `;

    if (filteredPedidos.length === 0) {
        tableHTML += '<tr><td colspan="13" class="text-center">No hay pedidos para mostrar.</td></tr>';
    } else {
        filteredPedidos.forEach(pedido => {
            const etapaColor = etapaToColor(pedido.etapaActual || '');
            // --- NUEVO: badge de cliente con color consistente ---
            let clienteBadge = '';
            if (pedido.cliente) {
                const color = stringToColor(pedido.cliente);
                clienteBadge = `<span class="badge badge-cliente ms-1" style="background:${color};color:#333;font-size:0.75em;">${pedido.cliente}</span>`;
            }
            tableHTML += `
                <tr>
                    <td>${pedido.secuenciaPedido || ''}</td>
                    <td>${pedido.numeroPedido || 'N/A'}</td>
                    <td>${clienteBadge || '-'}</td>
                    <td>${pedido.maquinaImpresion || 'N/A'}</td>
                    <td>${pedido.desarrTexto || ''}${pedido.desarrNumero ? ` (${pedido.desarrNumero})` : ''}</td>
                    <td>${pedido.metros || '-'}</td>
                    <td>${pedido.superficie === 'true' ? 'Sí' : 'No'}</td>
                    <td>${pedido.transparencia === 'true' ? 'Sí' : 'No'}</td>
                    <td>${pedido.capa || '-'}</td>
                    <td>${pedido.camisa || '-'}</td>
                    <td>${pedido.fecha || '-'}</td>
                    <td>
                        <span class="badge etapa-badge-lista" style="background:${etapaColor};color:#333;font-size:0.95em;">
                            ${pedido.etapaActual || 'N/A'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="openPedidoModal('${pedido.id}')">
                            <i class="bi bi-pencil-square"></i> Editar
                        </button>
                    </td>
                </tr>
            `;
        });
    }

    tableHTML += `
            </tbody>
        </table>
    `;

    // Encuentra el contenedor específico para la tabla
    const listTableContainer = document.getElementById('list-table-container');
    if (listTableContainer) {
        listTableContainer.innerHTML = tableHTML; // Inserta solo la tabla aquí
    } else {
        console.error("renderList: Elemento #list-table-container no encontrado.");
        // Como fallback, podrías seguir usando listView, pero perderías los otros elementos
        // listView.innerHTML = tableHTML;
    }

    // --- Listeners para ordenamiento ---
    columns.forEach(col => {
        const th = document.querySelector(`#list-table-container th[data-key="${col.key}"]`);
        if (th) {
            th.onclick = () => {
                if (currentSort.key === col.key) {
                    currentSort.asc = !currentSort.asc;
                } else {
                    currentSort.key = col.key;
                    currentSort.asc = true;
                }
                renderList(pedidos);
            };
        }
    });

    // Guardar la referencia a los pedidos filtrados para las exportaciones
    window.currentFilteredPedidos = filteredPedidos;
}

// --- NUEVO: listeners para los botones de filtro rápido ---
if (typeof window !== 'undefined') {
    setTimeout(() => {
        const btns = [
            { id: 'btn-filtrar-laminacion', val: 'laminacion' },
            { id: 'btn-filtrar-rebobinado', val: 'rebobinado' },
            { id: 'btn-filtrar-perforado', val: 'perforado' },
            { id: 'btn-filtrar-pendiente', val: 'pendiente' },
            { id: 'btn-filtrar-todos', val: null }
        ];
        btns.forEach(({ id, val }) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.onclick = () => {
                    quickStageFilter = val;
                    btns.forEach(({ id }) => {
                        const b = document.getElementById(id);
                        if (b) b.classList.remove('active');
                    });
                    if (val !== null) btn.classList.add('active');
                    else document.getElementById('btn-filtrar-todos').classList.add('active');
                    renderList(window.currentPedidos || []);
                };
            }
        });
    }, 0);
}

// --- NUEVO: Funciones de exportación ---
function getEtapaMayoritaria(pedidos) {
    if (!pedidos || pedidos.length === 0) return "N/A";
    
    const etapas = {};
    pedidos.forEach(pedido => {
        const etapa = pedido.etapaActual || "N/A";
        etapas[etapa] = (etapas[etapa] || 0) + 1;
    });
    
    let maxCount = 0;
    let etapaMayoritaria = "N/A";
    
    Object.entries(etapas).forEach(([etapa, count]) => {
        if (count > maxCount) {
            maxCount = count;
            etapaMayoritaria = etapa;
        }
    });
    
    return etapaMayoritaria;
}

function getCurrentDate() {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('es-ES', options);
}

function exportToPDF() {
    const pedidos = window.currentFilteredPedidos || [];
    if (!pedidos.length) {
        alert('No hay datos para exportar');
        return;
    }
    
    // Cargar jsPDF desde CDN si no está disponible
    if (typeof jsPDF === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => {
            const autoTableScript = document.createElement('script');
            autoTableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js';
            autoTableScript.onload = () => generatePDF(pedidos);
            document.head.appendChild(autoTableScript);
        };
        document.head.appendChild(script);
    } else {
        generatePDF(pedidos);
    }
}

function generatePDF(pedidos) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const etapaMayoritaria = getEtapaMayoritaria(pedidos);
    const fechaActual = getCurrentDate();
    
    // Añadir logos
    try {
        const logo1 = new Image();
        logo1.src = 'logo.png';
        const logo2 = new Image();
        logo2.src = 'logo2.png';
        
        doc.addImage(logo1, 'PNG', 10, 10, 30, 15);
        doc.addImage(logo2, 'PNG', 250, 10, 30, 15);
    } catch (e) {
        console.error('Error al cargar los logos:', e);
    }
    
    // Añadir información de cabecera
    doc.setFontSize(18);
    doc.text('Planificación Semanal', 140, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Fecha: ${fechaActual}`, 140, 28, { align: 'center' });
    doc.text(`Máquina: ${etapaMayoritaria}`, 140, 36, { align: 'center' });
    
    // Preparar datos para la tabla
    const headers = [
        'DESARR.', 'NºPEDIDO', 'METROS', 'SUPERFICIE', 'TRANSPARENCIA', 
        'CAPAS', 'CAMISA', 'SECUENCIA TRABAJO ACTUAL', 'OBSERVACIONES/FS', 'FECHA'
    ];
    
    const data = pedidos.map(p => [
        `${p.desarrTexto || ''}${p.desarrNumero ? ` (${p.desarrNumero})` : ''}`,
        p.numeroPedido || '',
        p.metros || '',
        p.superficie === 'true' ? 'Sí' : 'No',
        p.transparencia === 'true' ? 'Sí' : 'No',
        p.capa || '',
        p.camisa || '',
        p.etapaActual || '',
        p.observaciones || '',
        p.fecha || ''
    ]);
    
    // Generar tabla
    doc.autoTable({
        startY: 45,
        head: [headers],
        body: data,
        theme: 'grid',
        styles: { 
            fontSize: 9,
            cellPadding: 3
        },
        headStyles: {
            fillColor: [66, 134, 244],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        }
    });
    
    // Guardar PDF
    doc.save(`Planificacion_Semanal_${etapaMayoritaria.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

function exportToExcel() {
    const pedidos = window.currentFilteredPedidos || [];
    if (!pedidos.length) {
        alert('No hay datos para exportar');
        return;
    }
    
    // Cargar SheetJS desde CDN si no está disponible
    if (typeof XLSX === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = () => generateExcel(pedidos);
        document.head.appendChild(script);
    } else {
        generateExcel(pedidos);
    }
}

function generateExcel(pedidos) {
    const etapaMayoritaria = getEtapaMayoritaria(pedidos);
    const fechaActual = getCurrentDate();
    
    // Preparar datos para Excel
    const headers = [
        'DESARR.', 'NºPEDIDO', 'METROS', 'SUPERFICIE', 'TRANSPARENCIA', 
        'CAPAS', 'CAMISA', 'SECUENCIA TRABAJO ACTUAL', 'OBSERVACIONES/FS', 'FECHA'
    ];
    
    // Cabecera con título y fecha
    const headerRows = [
        ['PLANIFICACIÓN SEMANAL', '', '', '', '', '', '', '', '', ''],
        [`Fecha: ${fechaActual}`, '', '', '', '', '', '', '', '', ''],
        [`Máquina: ${etapaMayoritaria}`, '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
        headers
    ];
    
    // Datos de los pedidos
    const dataRows = pedidos.map(p => [
        `${p.desarrTexto || ''}${p.desarrNumero ? ` (${p.desarrNumero})` : ''}`,
        p.numeroPedido || '',
        p.metros || '',
        p.superficie === 'true' ? 'Sí' : 'No',
        p.transparencia === 'true' ? 'Sí' : 'No',
        p.capa || '',
        p.camisa || '',
        p.etapaActual || '',
        p.observaciones || '',
        p.fecha || ''
    ]);
    
    // Combinar todas las filas
    const allRows = [...headerRows, ...dataRows];
    
    // Crear libro de trabajo
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(allRows);
    
    // Agregar estilos (fusionar celdas para títulos)
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push(
        { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, // Fusionar celdas para el título
        { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }, // Fusionar celdas para la fecha
        { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } }  // Fusionar celdas para la máquina
    );
    
    XLSX.utils.book_append_sheet(wb, ws, "Planificación Semanal");
    
    // Guardar Excel
    XLSX.writeFile(wb, `Planificacion_Semanal_${etapaMayoritaria.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// Exportamos las funciones para usarlas desde la UI
window.exportToPDF = exportToPDF;
window.exportToExcel = exportToExcel;
