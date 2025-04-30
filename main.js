// Suponiendo que cada fila de la tabla tiene un atributo data-completado="true" si está completado
document.addEventListener('DOMContentLoaded', function() {
    const listView = document.getElementById('list-view');
    const completadosBtn = document.getElementById('completados-btn');
    let mostrandoCompletados = false;

    function filtrarTabla() {
        const filas = listView.querySelectorAll('tbody tr');
        filas.forEach(fila => {
            const esCompletado = fila.getAttribute('data-completado') === 'true';
            if (mostrandoCompletados) {
                fila.style.display = esCompletado ? '' : 'none';
            } else {
                fila.style.display = esCompletado ? 'none' : '';
            }
        });
    }

    completadosBtn.addEventListener('click', function() {
        mostrandoCompletados = !mostrandoCompletados;
        completadosBtn.textContent = mostrandoCompletados ? 'Ver pendientes' : 'Completados';
        filtrarTabla();
    });

    // Oculta completados por defecto al cargar
    filtrarTabla();
});