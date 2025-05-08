let charts = {};

function destroyCharts() {
    for (const key in charts) {
        if (charts[key]) charts[key].destroy();
    }
    charts = {};
}

function groupBy(arr, keyFn) {
    const map = {};
    arr.forEach(item => {
        const key = keyFn(item);
        map[key] = map[key] || [];
        map[key].push(item);
    });
    return map;
}

function sum(arr, fn) {
    return arr.reduce((acc, x) => acc + (Number(fn(x)) || 0), 0);
}

// Analiza fechas en formato ISO (datetime-local) o DD/MM
function parseFecha(fecha) {
    if (!fecha) return null;
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/.test(fecha)) {
        // Soporta tanto date como datetime-local
        return new Date(fecha.slice(0, 10));
    }
    // Si es DD/MM
    const m = fecha.match(/^(\d{2})\/(\d{2})$/);
    if (m) {
        const now = new Date();
        return new Date(now.getFullYear(), Number(m[2]) - 1, Number(m[1]));
    }
    return null;
}

function safeGetCanvas(id) {
    const el = document.getElementById(id);
    return el && el.offsetParent !== null ? el : null;
}

// Añadir función de ayuda para formatear números con 2 decimales máximo
function formatNumber(value) {
    if (typeof value === 'number') {
        // Si es un número entero o tiene menos de 2 decimales, no hacer nada
        if (Number.isInteger(value) || (value.toString().split('.')[1] || '').length <= 2) {
            return value;
        }
        // Si tiene más de 2 decimales, formatear a 2 decimales
        return Number(value.toFixed(2));
    }
    return value;
}

// --- COPIA de etapaToColor desde listView.js ---
function etapaToColor(etapa) {
    let hash = 0;
    for (let i = 0; i < etapa.length; i++) {
        hash = etapa.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 40%, 85%)`;
}

// --- NUEVO: Renderiza tabla HTML para cada gráfico ---
function renderTable(containerId, headers, rows) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Create a row container if it doesn't exist
    let rowContainer = container.parentElement;
    if (!rowContainer.classList.contains('row')) {
        rowContainer = document.createElement('div');
        rowContainer.className = 'row mb-4';
        container.parentNode.insertBefore(rowContainer, container);
        rowContainer.appendChild(container);
    }
    
    // Create chart container if it doesn't exist
    let chartContainer = document.getElementById(containerId.replace('tabla', 'grafico'));
    if (chartContainer) {
        chartContainer.className = 'col-md-6';
        container.className = 'col-md-6';
    }
    
    let html = `<div class="table-responsive"><table class="table table-sm table-bordered mb-0"><thead><tr>`;
    headers.forEach(h => html += `<th>${h}</th>`);
    html += `</tr></thead><tbody>`;
    rows.forEach(row => {
        html += `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`;
    });
    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

export function renderGraficosReportes(pedidos) {
    destroyCharts();

    // Si la sección está oculta, no intentes renderizar
    const reportesDiv = document.getElementById('reportes-graficos');
    if (!reportesDiv || reportesDiv.style.display === 'none') return;

    // --- Total metros por máquina ---
    const maquinas = {};
    pedidos.forEach(p => {
        const maq = p.maquinaImpresion || 'Sin máquina';
        maquinas[maq] = (maquinas[maq] || 0) + (Number(p.metros) || 0);
    });
    const maqLabels = Object.keys(maquinas);
    const maqData = maqLabels.map(k => formatNumber(maquinas[k]));
    const canvasMaq = safeGetCanvas('grafico-metros-maquina');
    if (canvasMaq) {
        charts.metrosMaquina = new Chart(canvasMaq, {
            type: 'bar',
            data: {
                labels: maqLabels,
                datasets: [{ label: 'Metros', data: maqData, backgroundColor: '#0d6efd' }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }
    renderTable('tabla-metros-maquina', ['Máquina', 'Metros'], maqLabels.map((k, i) => [k, maqData[i]]));

    // --- Total metros por tipo de etapa (filtros rápidos) ---
    const tipos = {
        Laminación: p => (p.etapaActual||'').toLowerCase().startsWith('lamin'),
        Rebobinado: p => (p.etapaActual||'').toLowerCase().startsWith('rebob'),
        Perforado: p => (p.etapaActual||'').toLowerCase().startsWith('perfor'),
        Pendiente: p => (p.etapaActual||'').toLowerCase().startsWith('pendiente'),
        Todo: _ => true
    };
    const tipoLabels = Object.keys(tipos);
    const tipoData = tipoLabels.map(t => formatNumber(sum(pedidos.filter(tipos[t]), p => p.metros)));
    const canvasEtapa = safeGetCanvas('grafico-metros-etapa');
    if (canvasEtapa) {
        charts.metrosEtapa = new Chart(canvasEtapa, {
            type: 'bar',
            data: {
                labels: tipoLabels,
                datasets: [{ label: 'Metros', data: tipoData, backgroundColor: '#198754' }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }
    renderTable('tabla-metros-etapa', ['Tipo', 'Metros'], tipoLabels.map((k, i) => [k, tipoData[i]]));

    // --- Pedidos por estado/etapa actual ---
    const etapas = groupBy(pedidos, p => p.etapaActual || 'N/A');
    const etapaLabels = Object.keys(etapas);
    const etapaData = etapaLabels.map(k => etapas[k].length);
    const canvasEtapasActual = safeGetCanvas('grafico-etapas-actual');
    if (canvasEtapasActual) {
        charts.etapasActual = new Chart(canvasEtapasActual, {
            type: 'pie',
            data: {
                labels: etapaLabels,
                datasets: [{ data: etapaData, backgroundColor: etapaLabels.map((_,i)=>`hsl(${i*50},70%,70%)`) }]
            },
            options: { responsive: true }
        });
    }
    renderTable('tabla-etapas-actual', ['Etapa', 'Cantidad'], etapaLabels.map((k, i) => [k, etapaData[i]]));

    // --- Top 5 clientes ---
    const clientes = groupBy(pedidos, p => p.cliente || 'Sin cliente');
    const clienteArr = Object.entries(clientes).map(([k,v])=>({cliente:k, count:v.length}));
    clienteArr.sort((a,b)=>b.count-a.count);
    const topClientes = clienteArr.slice(0,5);
    const canvasClientes = safeGetCanvas('grafico-clientes');
    if (canvasClientes) {
        charts.clientes = new Chart(canvasClientes, {
            type: 'bar',
            data: {
                labels: topClientes.map(x=>x.cliente),
                datasets: [{ label: 'Pedidos', data: topClientes.map(x=>x.count), backgroundColor: '#fd7e14' }]
            },
            options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } }
        });
    }
    renderTable('tabla-clientes', ['Cliente', 'Pedidos'], topClientes.map(x => [x.cliente, x.count]));

    // --- Evolución de pedidos por fecha (solo 2 últimas semanas) ---
    const fechas = {};
    pedidos.forEach(p => {
        const d = parseFecha(p.fecha);
        if (!d) return;
        const key = d.toISOString().slice(0,10);
        fechas[key] = (fechas[key]||0)+1;
    });
    // Filtra solo las 2 últimas semanas
    const allDates = Object.keys(fechas).sort();
    const last14 = allDates.slice(-14);
    const canvasEvol = safeGetCanvas('grafico-evolucion-fecha');
    if (canvasEvol) {
        charts.evolucionFecha = new Chart(canvasEvol, {
            type: 'line',
            data: {
                labels: last14,
                datasets: [{ label: 'Pedidos', data: last14.map(k=>formatNumber(fechas[k])), borderColor:'#6610f2', backgroundColor:'#b197fc', fill:true }]
            },
            options: { responsive: true }
        });
    }
    renderTable('tabla-evolucion-fecha', ['Fecha', 'Pedidos'], last14.map(k => [k, fechas[k]]));

    // --- Distribución por transparencia ---
    const trans = groupBy(pedidos, p => p.transparencia === 'true' ? 'Sí' : 'No');
    const transLabels = Object.keys(trans);
    const transData = transLabels.map(k=>trans[k].length);
    const canvasTrans = safeGetCanvas('grafico-transparencia');
    if (canvasTrans) {
        charts.transparencia = new Chart(canvasTrans, {
            type: 'doughnut',
            data: {
                labels: transLabels,
                datasets: [{ data: transData, backgroundColor: ['#20c997','#adb5bd'] }]
            },
            options: { responsive: true }
        });
    }
    renderTable('tabla-transparencia', ['Transparencia', 'Cantidad'], transLabels.map((k, i) => [k, transData[i]]));

    // --- Distribución por superficie ---
    const sup = groupBy(pedidos, p => p.superficie === 'true' ? 'Sí' : 'No');
    const supLabels = Object.keys(sup);
    const supData = supLabels.map(k=>sup[k].length);
    const canvasSup = safeGetCanvas('grafico-superficie');
    if (canvasSup) {
        charts.superficie = new Chart(canvasSup, {
            type: 'doughnut',
            data: {
                labels: supLabels,
                datasets: [{ data: supData, backgroundColor: ['#0dcaf0','#adb5bd'] }]
            },
            options: { responsive: true }
        });
    }
    renderTable('tabla-superficie', ['Superficie', 'Cantidad'], supLabels.map((k, i) => [k, supData[i]]));
}

// --- EXPORTAR PDF ---
function exportarReportesPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    let y = 10;

    // Logo
    const logoImg = new Image();
    logoImg.src = 'logo.png';
    logoImg.onload = () => {
        // 220x45 px ≈ 58x12 mm
        doc.addImage(logoImg, 'PNG', 10, y, 58, 12);
        y += 17; // Ajusta el espacio después del logo
        doc.setFontSize(18);
        doc.text('Reportes Gráficos de Producción', 150, y, { align: 'center' });
        y += 15;

        // Para cada gráfico, exportar imagen y título
        [
            { id: 'grafico-metros-maquina', title: 'Total de metros por máquina de impresión' },
            { id: 'grafico-metros-etapa', title: 'Total de metros por tipo de etapa' },
            { id: 'grafico-etapas-actual', title: 'Pedidos por estado/etapa actual' },
            { id: 'grafico-clientes', title: 'Top 5 clientes por cantidad de pedidos' },
            { id: 'grafico-evolucion-fecha', title: 'Evolución de pedidos por fecha' },
            { id: 'grafico-transparencia', title: 'Distribución por Transparencia' },
            { id: 'grafico-superficie', title: 'Distribución por Superficie' }
        ].forEach(({ id, title }, idx) => {
            const canvas = document.getElementById(id);
            if (!canvas) return;
            if (y > 170) { doc.addPage(); y = 15; }
            doc.setFontSize(13);
            doc.text(title, 15, y + 15);
            const imgData = canvas.toDataURL('image/png', 1.0);
            // Mantén el tamaño de los gráficos igual, solo cambia el logo
            doc.addImage(imgData, 'PNG', 15, y + 18, 100, 45);
            y += 65;
        });

        doc.save(`ReportesGraficos_${new Date().toISOString().slice(0,10)}.pdf`);
    };
}

// --- EXPORTAR EXCEL ---
function exportarReportesExcel() {
    // Verifica que XLSX esté disponible
    if (typeof XLSX === 'undefined') {
        alert('No se encontró la librería XLSX para exportar a Excel.');
        return;
    }
    const wb = XLSX.utils.book_new();

    // 1. Metros por máquina
    const tablaMaquina = [['Máquina', 'Metros']];
    const canvas1 = document.getElementById('grafico-metros-maquina');
    if (canvas1 && charts.metrosMaquina) {
        const data = charts.metrosMaquina.data;
        for (let i = 0; i < data.labels.length; i++) {
            tablaMaquina.push([data.labels[i], formatNumber(data.datasets[0].data[i])]);
        }
        const ws1 = XLSX.utils.aoa_to_sheet(tablaMaquina);
        XLSX.utils.book_append_sheet(wb, ws1, 'Metros por Máquina');
    }

    // 2. Metros por tipo de etapa
    const tablaEtapa = [['Tipo', 'Metros']];
    if (charts.metrosEtapa) {
        const data = charts.metrosEtapa.data;
        for (let i = 0; i < data.labels.length; i++) {
            tablaEtapa.push([data.labels[i], formatNumber(data.datasets[0].data[i])]);
        }
        const ws2 = XLSX.utils.aoa_to_sheet(tablaEtapa);
        XLSX.utils.book_append_sheet(wb, ws2, 'Metros por Etapa');
    }

    // 3. Pedidos por etapa actual
    const tablaEstado = [['Etapa', 'Cantidad']];
    if (charts.etapasActual) {
        const data = charts.etapasActual.data;
        for (let i = 0; i < data.labels.length; i++) {
            tablaEstado.push([data.labels[i], formatNumber(data.datasets[0].data[i])]);
        }
        const ws3 = XLSX.utils.aoa_to_sheet(tablaEstado);
        XLSX.utils.book_append_sheet(wb, ws3, 'Pedidos por Estado');
    }

    // 4. Top 5 clientes
    const tablaClientes = [['Cliente', 'Pedidos']];
    if (charts.clientes) {
        const data = charts.clientes.data;
        for (let i = 0; i < data.labels.length; i++) {
            tablaClientes.push([data.labels[i], formatNumber(data.datasets[0].data[i])]);
        }
        const ws4 = XLSX.utils.aoa_to_sheet(tablaClientes);
        XLSX.utils.book_append_sheet(wb, ws4, 'Top 5 Clientes');
    }

    // 5. Evolución por fecha
    const tablaEvol = [['Fecha', 'Pedidos']];
    if (charts.evolucionFecha) {
        const data = charts.evolucionFecha.data;
        for (let i = 0; i < data.labels.length; i++) {
            tablaEvol.push([data.labels[i], formatNumber(data.datasets[0].data[i])]);
        }
        const ws5 = XLSX.utils.aoa_to_sheet(tablaEvol);
        XLSX.utils.book_append_sheet(wb, ws5, 'Evolución por Fecha');
    }

    // 6. Transparencia
    const tablaTrans = [['Transparencia', 'Cantidad']];
    if (charts.transparencia) {
        const data = charts.transparencia.data;
        for (let i = 0; i < data.labels.length; i++) {
            tablaTrans.push([data.labels[i], formatNumber(data.datasets[0].data[i])]);
        }
        const ws6 = XLSX.utils.aoa_to_sheet(tablaTrans);
        XLSX.utils.book_append_sheet(wb, ws6, 'Transparencia');
    }

    // 7. Superficie
    const tablaSup = [['Superficie', 'Cantidad']];
    if (charts.superficie) {
        const data = charts.superficie.data;
        for (let i = 0; i < data.labels.length; i++) {
            tablaSup.push([data.labels[i], formatNumber(data.datasets[0].data[i])]);
        }
        const ws7 = XLSX.utils.aoa_to_sheet(tablaSup);
        XLSX.utils.book_append_sheet(wb, ws7, 'Superficie');
    }

    XLSX.writeFile(wb, `ReportesGraficos_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// --- EXPORTAR LISTA FILTRADA A PDF ---
function exportarListaFiltradaPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    let y = 10;

    const logoImg = new Image();
    logoImg.src = 'logo.png';
    logoImg.onload = () => {
        doc.addImage(logoImg, 'PNG', 10, y, 58, 12); // 220x45 px ≈ 58x12 mm

        // Fecha actual alineada a la derecha
        const fechaActual = new Date().toLocaleDateString();
        doc.setFontSize(12);
        doc.text(`Fecha: ${fechaActual}`, 285, y + 8, { align: 'right' }); // 297mm ancho A4 horizontal

        y += 17;
        doc.setFontSize(18);
        doc.text('Listado de Producción', 150, y, { align: 'center' });
        y += 10;

        const tabla = document.querySelector('#list-view table');
        if (!tabla) {
            alert('No se encontró la tabla de la lista filtrada.');
            return;
        }

        // --- ORDEN Y SELECCIÓN DE COLUMNAS PARA EXPORTAR ---
        // Define el orden y los nombres de las columnas a exportar (sin Nº Secuencia)
        // Deben coincidir exactamente con los encabezados de la tabla generada en listView.js
        const columnasExportar = [
            "Desarr.",
            "Cliente",         // <--- debe ser "Cliente" (sin "A") según listView.js
            "Nº Pedido",
            "Metros",
            "SUP",
            "TTE",
            "Capa",
            "Camisa",
            "Observaciones",
            "Etapa Actual",
            "Fecha"
        ];

        // Función para normalizar texto (elimina tildes, minúsculas, quita espacios)
        function normalizarTexto(txt) {
            return (txt || "")
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/\s+/g, "");
        }

        // Obtén los encabezados actuales de la tabla web
        const encabezados = Array.from(tabla.rows[0].cells).map(cell => cell.innerText.trim());

        // Mapea el índice de cada columna a exportar según el encabezado de la tabla web (normalizado)
        const encabezadosNorm = encabezados.map(normalizarTexto);
        const columnasExportarNorm = columnasExportar.map(normalizarTexto);
        const indicesExportar = columnasExportarNorm.map(nombreNorm =>
            encabezadosNorm.findIndex(hNorm => hNorm === nombreNorm)
        );

        // Si alguna columna no se encuentra, muestra advertencia
        if (indicesExportar.some(idx => idx === -1)) {
            alert('Alguna columna requerida no se encontró en la tabla web.\n\nColumnas requeridas:\n' + columnasExportar.join(', ') + '\n\nEncabezados encontrados:\n' + encabezados.join(', '));
            return;
        }

        // Construye las filas para exportar en el orden deseado y omitiendo "Nº Secuencia"
        const rows = Array.from(tabla.rows).map(row => {
            const cells = Array.from(row.cells).map(cell => cell.innerText);
            // Solo toma las columnas en el orden definido
            const fila = indicesExportar.map(idx => cells[idx]);
            // Formatea la columna "Fecha" para mostrar solo la fecha (sin hora)
            const idxFecha = columnasExportarNorm.findIndex(n => n === normalizarTexto('Fecha'));
            if (idxFecha !== -1 && fila[idxFecha]) {
                fila[idxFecha] = fila[idxFecha].split(' ')[0].split('T')[0];
            }
            return fila;
        });
        // --- FIN ORDEN Y SELECCIÓN DE COLUMNAS ---

        if (doc.autoTable) {
            // Busca el índice de la columna "Etapa Actual"
            const idxEtapa = columnasExportarNorm.findIndex(n => n.includes(normalizarTexto('Etapa Actual')));
            doc.autoTable({
                startY: y,
                head: [rows[0]],
                body: rows.slice(1),
                styles: { fontSize: 9 },
                margin: { left: 10, right: 10 },
                didParseCell: function (data) {
                    if (data.section === 'body' && idxEtapa !== -1) {
                        const etapa = data.row.raw[idxEtapa] || '';
                        // Convierte HSL a RGB para jsPDF autoTable
                        const hsl = etapaToColor(etapa);
                        // hsl(210, 40%, 85%) -> [h,s,l]
                        const match = hsl.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/);
                        if (match) {
                            const h = parseInt(match[1], 10);
                            const s = parseInt(match[2], 10) / 100;
                            const l = parseInt(match[3], 10) / 100;
                            // Conversión HSL a RGB
                            function hslToRgb(h, s, l) {
                                let r, g, b;
                                if (s === 0) {
                                    r = g = b = l;
                                } else {
                                    const hue2rgb = function(p, q, t) {
                                        if (t < 0) t += 1;
                                        if (t > 1) t -= 1;
                                        if (t < 1/6) return p + (q - p) * 6 * t;
                                        if (t < 1/2) return q;
                                        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                                        return p;
                                    };
                                    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                                    const p = 2 * l - q;
                                    r = hue2rgb(p, q, h / 360 + 1/3);
                                    g = hue2rgb(p, q, h / 360);
                                    b = hue2rgb(p, q, h / 360 - 1/3);
                                }
                                return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
                            }
                            const rgb = hslToRgb(h, s, l);
                            data.cell.styles.fillColor = rgb;
                        }
                    }
                }
            });
        } else {
            alert('jsPDF autoTable plugin no está cargado.');
        }
        doc.save(`ListaFiltrada_${new Date().toISOString().slice(0,10)}.pdf`);
    };
}

// --- EXPORTAR LISTA FILTRADA A EXCEL ---
function exportarListaFiltradaExcel() {
    if (typeof XLSX === 'undefined') {
        alert('No se encontró la librería XLSX para exportar a Excel.');
        return;
    }
    const tabla = document.querySelector('#list-view table');
    if (!tabla) {
        alert('No se encontró la tabla de la lista filtrada.');
        return;
    }
    const rows = Array.from(tabla.rows).map(row =>
        Array.from(row.cells).map(cell => cell.innerText)
    );
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lista Filtrada');
    XLSX.writeFile(wb, `ListaFiltrada_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// --- EVENTOS ---
if (typeof window !== 'undefined') {
    setTimeout(() => {
        const btnPDF = document.getElementById('btn-exportar-reportes-pdf');
        if (btnPDF) btnPDF.onclick = exportarReportesPDF;
        const btnExcel = document.getElementById('btn-exportar-reportes-excel');
        if (btnExcel) btnExcel.onclick = exportarReportesExcel;
    }, 500);

    // Exportar funciones para los enlaces del menú
    window.exportToPDF = exportarListaFiltradaPDF;
    window.exportToExcel = exportarListaFiltradaExcel;
}

window.renderGraficosReportes = renderGraficosReportes;
