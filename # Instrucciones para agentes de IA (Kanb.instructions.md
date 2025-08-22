# Instrucciones para agentes de IA (Kanban de Producción)

Objetivo
- Tablero Kanban con DnD y persistencia en Firestore. UI optimista: mover tarjeta en el DOM inmediatamente, sin re-render global.
- Invariante: no resetear la vista (translateX/scroll) al mover tarjetas ni al re-renderizar por cambios locales.

Arquitectura
- Kanban y scroll: [kanban.js](/workspaces/productioncontrol/kanban.js)
  - Render: `renderKanban(pedidos, options)` crea grupos y columnas y llama a `setupKanbanScrolling()`.
  - DnD: `addDragAndDropListeners()`, handlers `dragStart/dragEnter/dragLeave/dragOver/drop/dragEnd`.
  - Scroll custom por translateX: `habilitarScrollArrastre()`, límites: `calcularLimitesScroll()`, estado global: `estadosScroll` (Map por data-container-id).
  - Preservación de estado: `capturarEstadoScrollPreciso()` y `restaurarEstadoScrollPreciso()`.
  - Infraestructura: `configurarGrupoContenedor()`, `establecerPosicionContenedor()`, `obtenerLimitesConCache()`, `limpiarEstructuraKanban()`.
- Persistencia: [firestore.js](/workspaces/productioncontrol/firestore.js) (definiciones como `updatePedido`, `etapasImpresion`, `etapasComplementarias`).
- Estilos: [style.css](/workspaces/productioncontrol/style.css) define `.kanban-columns-container` (overflow hidden, width: fit-content, transición transform), `.kanban-column` (min 280px, max 320px), `.kanban-card`.

Patrones clave del tablero
- Contenedores scrollables: cada grupo usa `.kanban-columns-container` con data-container-id estable:
  - "impresion" para `etapasImpresion`
  - "complementarias" para `etapasComplementarias`
- Estado de scroll: `estadosScroll` guarda translateX por containerId. Nunca resetear transform a 0 en limpieza; siempre restaurar con `establecerPosicionContenedor(...)` si existe estado previo.
- Render incremental:
  - `renderKanban` solo reconstruye el grupo solicitado con `options.only` y luego llama a `setupKanbanScrolling()`.
  - Tras render, aplicar `establecerPosicionContenedor` usando el estado guardado.
- Ordenación:
  - Variables globales `kanbanSortKey` ('secuenciaPedido' | 'cliente') y `kanbanSortAsc`.
  - Botones en UI disparan `renderKanban(window.currentPedidos, options)` manteniendo estado.

Flujo DnD (extraído de logs)
- "Drag Start: {id} desde columna {origen}"
- "Drop iniciado: {id} -> {destino}"
- "Tarjeta movida visualmente" (DOM antes de persistir)
- app: "Omitiendo re-renderizado - actualización local reciente detectada"
- "Actualización en Firestore completada" y confirmación de movimiento

Convenciones y contratos
- Etapas en español en UI (p.ej., “Laminación SL2”, “Laminación NEXUS”). Si hay claves internas, mapear explícitamente etiqueta↔clave en un único lugar.
- Logs en español con contexto de pedido y etapa. No eliminarlos; son parte del diagnóstico.
- Firestore: hacer el write mínimo (cambiar etapa y timestamp). Ignorar por una ventana corta el snapshot del último cambio local para no forzar re-render.

Antipatrones a evitar
- No reemplazar nodos de `.kanban-columns-container` ni resetear transform/scroll durante limpiezas.
- No hacer re-render global del tablero por un movimiento local (usar UI optimista + supresión de re-render).
- No depender de scrollLeft: el sistema usa translateX con límites dinámicos.

Puntos de entrada útiles
- Render: [`renderKanban`](./kanban.js)
- Scroll: [`setupKanbanScrolling`](./kanban.js), [`habilitarScrollArrastre`](./kanban.js), [`calcularLimitesScroll`](./kanban.js)
- DnD: [`addDragAndDropListeners`](./kanban.js), [`drop`](./kanban.js)
- Estilos: [style.css](/workspaces/productioncontrol/style.css)