# Instrucciones para agentes de IA (Kanban de Producción)

Objetivo
- Tablero Kanban con DnD (HTML5) y persistencia en Firestore. UI optimista: mover tarjeta en el DOM inmediatamente, sin re-render global.
- Invariante: no resetear la vista (translateX/scroll) al mover tarjetas ni al re-renderizar por cambios locales.

Arquitectura
- Kanban y scroll: `kanban.js`
  - Render: `renderKanban(pedidos, options)` crea grupos/columnas y llama a `setupKanbanScrolling()`.
  - DnD: `addDragAndDropListeners()`, handlers `dragStart/dragEnter/dragLeave/dragOver/drop/dragEnd`.
  - Scroll custom por `transform: translateX(...)`: `habilitarScrollArrastre()`, límites: `calcularLimitesScroll()`, estado global: `estadosScroll` (Map por `data-container-id`).
  - Preservación de estado: `capturarEstadoScrollPreciso()` y `restaurarEstadoScrollPreciso()`.
  - Infraestructura: `configurarGrupoContenedor()`, `establecerPosicionContenedor()`, `obtenerLimitesConCache()`, `limpiarEstructuraKanban()`.
- Persistencia y datos: `firestore.js` (definiciones como `etapasImpresion`, `etapasComplementarias`, `listenToPedidos`, `updatePedido`).
- Orquestación app y supresión de re-render: `app.js` y `ui.js`.
- Estilos: `style.css` define `.kanban-columns-container` (overflow hidden, transición de transform) y `.kanban-column`.

Flujo DnD (extraído de logs reales)
- "Drag Start: {id} desde columna {origen}"
- "Drop iniciado: {id} -> {destino}"
- "Tarjeta movida visualmente" (DOM antes de persistir)
- app: "Omitiendo re-renderizado - actualización local reciente detectada"
- "Actualización en Firestore completada" y confirmación de movimiento

Convenciones y contratos
- Etapas se muestran en español (p. ej., “Laminación SL2”, “Laminación NEXUS”). Si existen claves internas, mantener mapeo etiqueta↔clave en un solo lugar.
- Logs en español con id de pedido y etapas. No eliminarlos; son parte del diagnóstico.
- Firestore: write mínimo (campo `etapaActual` + `updatedAt` si aplica). Ignorar por una ventana corta los snapshots del último cambio local para no forzar re-render.

Reglas de scroll/navegación (no romper)
- Cada grupo usa `.kanban-columns-container` con `data-container-id` estable (p. ej., `impresion` y `complementarias`).
- No reemplazar nodos `.kanban-columns-container` en limpiezas; preservar su estado en `estadosScroll` y restaurarlo con `establecerPosicionContenedor(...)`.
- Antes/después del drop: capturar y restaurar estado de scroll con `capturarEstadoScrollPreciso()`/`restaurarEstadoScrollPreciso()`; evitar `scrollIntoView`/`scrollTo`/focus que muevan la vista.
- El sistema usa `translateX` con límites dinámicos; no depender de `scrollLeft`.

Patrones de implementación
- UI optimista: mover la tarjeta en el DOM en `drop` antes de persistir; actualizar contadores de columnas afectadas.
- En `renderKanban`, permitir `options.only` (`impresion` | `complementarias`) para render parcial; llamar a `setupKanbanScrolling()` tras cada render.
- `addDragAndDropListeners()` se invoca al final del render para reanclar eventos.

Puntos de entrada rápidos
- Render: `renderKanban`
- Scroll: `setupKanbanScrolling`, `habilitarScrollArrastre`, `calcularLimitesScroll`
- DnD: `addDragAndDropListeners`, `drop`
- Datos: `firestore.js` (`listenToPedidos`, `updatePedido`)
- Orquestación: `app.js`, `ui.js` (tabs activas renderizan `only` correspondiente)

Comandos útiles (shell)
- Inspeccionar archivos/estructura: `tree -L 2`
- Buscar logs/puntos clave:
  - `grep -n "Tarjeta movida visualmente" kanban.js`
  - `grep -n "Omitiendo re-renderizado" app.js`
  - `grep -n "Actualización en Firestore completada" kanban.js firestore.js`

Criterios de cambio para PRs
- Mantener UI optimista y la invariante de no resetear scroll/translateX.
- Si agregas etapas, actualiza el mapeo etiqueta↔clave y validadores de drop.
- Evitar re-render global por cambios locales; preferir patch de DOM.
- Actualiza este archivo cuando cambien flujos DnD, scroll, Firestore o convenciones.
