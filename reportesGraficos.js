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

function parseFecha(fecha) {
    if (!fecha) return null;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(fecha)) {
        return new Date(fecha);
    }
    // Si es DD/MM
    const m = fecha.match(/^(\d{2})\/(\d{2})$/);
    if (m) {
        const now = new Date();
        return new Date(now.getFullYear(), Number(m[2])-1, Number(m[1]));
    }
    return null;
}

export function renderGraficosReportes(pedidos) {
    destroyCharts();
    // --- Total metros por máquina ---
    const maquinas = {};
    pedidos.forEach(p => {
        const maq = p.maquinaImpresion || 'Sin máquina';
        maquinas[maq] = (maquinas[maq] || 0) + (Number(p.metros) || 0);
    });
    const maqLabels = Object.keys(maquinas);
    const maqData = maqLabels.map(k => maquinas[k]);
    charts.metrosMaquina = new Chart(document.getElementById('grafico-metros-maquina'), {
        type: 'bar',
        data: {
            labels: maqLabels,
            datasets: [{ label: 'Metros', data: maqData, backgroundColor: '#0d6efd' }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });

    // --- Total metros por tipo de etapa (filtros rápidos) ---
    const tipos = {
        Laminación: p => (p.etapaActual||'').toLowerCase().startsWith('lamin'),
        Rebobinado: p => (p.etapaActual||'').toLowerCase().startsWith('rebob'),
        Perforado: p => (p.etapaActual||'').toLowerCase().startsWith('perfor'),
        Pendiente: p => (p.etapaActual||'').toLowerCase().startsWith('pendiente'),
        Todo: _ => true
    };
    const tipoLabels = Object.keys(tipos);
    const tipoData = tipoLabels.map(t => sum(pedidos.filter(tipos[t]), p => p.metros));
    charts.metrosEtapa = new Chart(document.getElementById('grafico-metros-etapa'), {
        type: 'bar',
        data: {
            labels: tipoLabels,
            datasets: [{ label: 'Metros', data: tipoData, backgroundColor: '#198754' }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });

    // --- Pedidos por estado/etapa actual ---
    const etapas = groupBy(pedidos, p => p.etapaActual || 'N/A');
    const etapaLabels = Object.keys(etapas);
    const etapaData = etapaLabels.map(k => etapas[k].length);
    charts.etapasActual = new Chart(document.getElementById('grafico-etapas-actual'), {
        type: 'pie',
        data: {
            labels: etapaLabels,
            datasets: [{ data: etapaData, backgroundColor: etapaLabels.map((_,i)=>`hsl(${i*50},70%,70%)`) }]
        },
        options: { responsive: true }
    });

    // --- Top 5 clientes ---
    const clientes = groupBy(pedidos, p => p.cliente || 'Sin cliente');
    const clienteArr = Object.entries(clientes).map(([k,v])=>({cliente:k, count:v.length}));
    clienteArr.sort((a,b)=>b.count-a.count);
    const topClientes = clienteArr.slice(0,5);
    charts.clientes = new Chart(document.getElementById('grafico-clientes'), {
        type: 'bar',
        data: {
            labels: topClientes.map(x=>x.cliente),
            datasets: [{ label: 'Pedidos', data: topClientes.map(x=>x.count), backgroundColor: '#fd7e14' }]
        },
        options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } }
    });

    // --- Evolución de pedidos por fecha ---
    const fechas = {};
    pedidos.forEach(p => {
        const d = parseFecha(p.fecha);
        if (!d) return;
        const key = d.toISOString().slice(0,10);
        fechas[key] = (fechas[key]||0)+1;
    });
    const fechasSorted = Object.keys(fechas).sort();
    charts.evolucionFecha = new Chart(document.getElementById('grafico-evolucion-fecha'), {
        type: 'line',
        data: {
            labels: fechasSorted,
            datasets: [{ label: 'Pedidos', data: fechasSorted.map(k=>fechas[k]), borderColor:'#6610f2', backgroundColor:'#b197fc', fill:true }]
        },
        options: { responsive: true }
    });

    // --- Distribución por transparencia ---
    const trans = groupBy(pedidos, p => p.transparencia === 'true' ? 'Sí' : 'No');
    const transLabels = Object.keys(trans);
    const transData = transLabels.map(k=>trans[k].length);
    charts.transparencia = new Chart(document.getElementById('grafico-transparencia'), {
        type: 'doughnut',
        data: {
            labels: transLabels,
            datasets: [{ data: transData, backgroundColor: ['#20c997','#adb5bd'] }]
        },
        options: { responsive: true }
    });

    // --- Distribución por superficie ---
    const sup = groupBy(pedidos, p => p.superficie === 'true' ? 'Sí' : 'No');
    const supLabels = Object.keys(sup);
    const supData = supLabels.map(k=>sup[k].length);
    charts.superficie = new Chart(document.getElementById('grafico-superficie'), {
        type: 'doughnut',
        data: {
            labels: supLabels,
            datasets: [{ data: supData, backgroundColor: ['#0dcaf0','#adb5bd'] }]
        },
        options: { responsive: true }
    });
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
        doc.addImage(logoImg, 'PNG', 10, y, 30, 15);
        y += 5;
        doc.setFontSize(18);
        doc.text('Reportes Gráficos de Producción', 150, y + 10, { align: 'center' });
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
            doc.addImage(imgData, 'PNG', 15, y + 18, 100, 45);
            y += 65;
        });

        doc.save(`ReportesGraficos_${new Date().toISOString().slice(0,10)}.pdf`);
    };
}

// --- EXPORTAR EXCEL ---
function exportarReportesExcel() {
    const wb = XLSX.utils.book_new();

    // 1. Metros por máquina
    const tablaMaquina = [['Máquina', 'Metros']];
    const canvas1 = document.getElementById('grafico-metros-maquina');
    if (canvas1 && charts.metrosMaquina) {
        const data = charts.metrosMaquina.data;
        for (let i = 0; i < data.labels.length; i++) {
            tablaMaquina.push([data.labels[i], data.datasets[0].data[i]]);
        }
        const ws1 = XLSX.utils.aoa_to_sheet(tablaMaquina);
        XLSX.utils.book_append_sheet(wb, ws1, 'Metros por Máquina');
    }

    // 2. Metros por tipo de etapa
    const tablaEtapa = [['Tipo', 'Metros']];
    if (charts.metrosEtapa) {
        const data = charts.metrosEtapa.data;
        for (let i = 0; i < data.labels.length; i++) {
            tablaEtapa.push([data.labels[i], data.datasets[0].data[i]]);
        }
        const ws2 = XLSX.utils.aoa_to_sheet(tablaEtapa);
        XLSX.utils.book_append_sheet(wb, ws2, 'Metros por Etapa');
    }

    // 3. Pedidos por etapa actual
    const tablaEstado = [['Etapa', 'Cantidad']];
    if (charts.etapasActual) {
        const data = charts.etapasActual.data;
        for (let i = 0; i < data.labels.length; i++) {
            tablaEstado.push([data.labels[i], data.datasets[0].data[i]]);
        }
        const ws3 = XLSX.utils.aoa_to_sheet(tablaEstado);
        XLSX.utils.book_append_sheet(wb, ws3, 'Pedidos por Estado');
    }

    // 4. Top 5 clientes
    const tablaClientes = [['Cliente', 'Pedidos']];
    if (charts.clientes) {
        const data = charts.clientes.data;
        for (let i = 0; i < data.labels.length; i++) {
            tablaClientes.push([data.labels[i], data.datasets[0].data[i]]);
        }
        const ws4 = XLSX.utils.aoa_to_sheet(tablaClientes);
        XLSX.utils.book_append_sheet(wb, ws4, 'Top 5 Clientes');
    }

    // 5. Evolución por fecha
    const tablaEvol = [['Fecha', 'Pedidos']];
    if (charts.evolucionFecha) {
        const data = charts.evolucionFecha.data;
        for (let i = 0; i < data.labels.length; i++) {
            tablaEvol.push([data.labels[i], data.datasets[0].data[i]]);
        }
        const ws5 = XLSX.utils.aoa_to_sheet(tablaEvol);
        XLSX.utils.book_append_sheet(wb, ws5, 'Evolución por Fecha');
    }

    // 6. Transparencia
    const tablaTrans = [['Transparencia', 'Cantidad']];
    if (charts.transparencia) {
        const data = charts.transparencia.data;
        for (let i = 0; i < data.labels.length; i++) {
            tablaTrans.push([data.labels[i], data.datasets[0].data[i]]);
        }
        const ws6 = XLSX.utils.aoa_to_sheet(tablaTrans);
        XLSX.utils.book_append_sheet(wb, ws6, 'Transparencia');
    }

    // 7. Superficie
    const tablaSup = [['Superficie', 'Cantidad']];
    if (charts.superficie) {
        const data = charts.superficie.data;
        for (let i = 0; i < data.labels.length; i++) {
            tablaSup.push([data.labels[i], data.datasets[0].data[i]]);
        }
        const ws7 = XLSX.utils.aoa_to_sheet(tablaSup);
        XLSX.utils.book_append_sheet(wb, ws7, 'Superficie');
    }

    XLSX.writeFile(wb, `ReportesGraficos_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// --- EVENTOS ---
if (typeof window !== 'undefined') {
    setTimeout(() => {
        const btnPDF = document.getElementById('btn-exportar-reportes-pdf');
        if (btnPDF) btnPDF.onclick = exportarReportesPDF;
        const btnExcel = document.getElementById('btn-exportar-reportes-excel');
        if (btnExcel) btnExcel.onclick = exportarReportesExcel;
    }, 500);
}

window.renderGraficosReportes = renderGraficosReportes;
