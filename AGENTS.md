# AGENTS.md

## 🧠 Contexto del Proyecto

Este repositorio implementa un sistema de tableros Kanban basado en jKanban y sincronizado con Firebase. Se utiliza para gestionar pedidos o tareas por etapas de un proceso productivo. El sistema debe ser intuitivo, modular y fácilmente mantenible.

## 📂 Estructura Principal del Proyecto

- `app.js`: Inicialización de Firebase y lógica principal del flujo de carga.
- `kanban.js`: Renderizado del tablero Kanban, lógica de drag & drop y estilos dinámicos.
- `auth.js`: Control de autenticación y temporizador de sesión.
- `style.css`: Estilos del tablero y elementos visuales de la UI.
- `index.html`: Plantilla base con referencias a los módulos JS y CSS.

## 📐 Guía de Desarrollo

### 1. Modularidad Extrema
- Todas las funciones deben tener una única responsabilidad clara.
- Divide código largo en módulos pequeños reutilizables.
- Prefiere funciones puras cuando sea posible.

### 2. DRY (Don't Repeat Yourself)
- Evita duplicación de lógica.
- Cualquier patrón repetido debe ser extraído a una función utilitaria.
- Centraliza la configuración y comportamiento reutilizable.

### 3. Configuración Parametrizada
- No usar valores "hardcodeados".
- Usar constantes al inicio de cada archivo o agruparlas en un objeto `config`.
- Para valores complejos, considerar un archivo externo `.json` o `.env`.

### 4. Claridad y Legibilidad
- Usa nombres explícitos y descriptivos (`renderPedidosPorEtapa`, `getColumnColorByClientes`, etc.).
- Comenta funciones no obvias y decisiones importantes de diseño.
- Usa `JSDoc` o docstrings para describir parámetros y retornos.

### 5. Mantenibilidad y Escalabilidad
- El código debe ser fácil de extender.
- Anticipar futuras etapas del Kanban, nuevos roles de usuario, o integraciones adicionales.
- Manejo robusto de errores y validaciones claras.

### 6. Herramientas y Librerías
- Considerar el uso de herramientas externas si:
  - Reducen código innecesario.
  - Mejoran la UI/UX significativamente.
  - Tienen soporte activo.
- Ejemplos recomendados:
  - `Chart.js` para visualizaciones de métricas.
  - `Sortable.js` para reemplazar o mejorar el DnD.
  - `day.js` o `date-fns` para manejo de fechas.
- Siempre consultar antes de añadir una nueva dependencia externa.

### 7. Preguntas y Ambigüedad
- Si no se entiende completamente la intención de una función o comportamiento deseado, se debe preguntar antes de implementarlo.
- Priorizar código que pueda ser explicado fácilmente en una revisión técnica.

## 🧪 Comportamiento Esperado del Tablero

- Las columnas deben poder desplazarse horizontalmente con scroll o DnD.
- Las tarjetas deben arrastrarse entre columnas manteniendo el estado en Firestore.
- Los colores de las columnas deben actualizarse dinámicamente según el contenido.
- El tablero debe poder soportar múltiples visualizaciones (ej. etapas de producción vs. etapas complementarias).

## 🛑 Restricciones

- No modificar directamente `firebase-config.js` ni alterar autenticación sin validación.
- No introducir estilos globales fuera de `#kanban-board` o `#kanban-board-complementarias`.
- No usar `var`, preferir `const` y `let`.

## ✅ Estándares Técnicos

- ECMAScript 2020 o superior.
- CSS moderno con flexbox (evitar `float`).
- Estructura de carpetas organizada por funcionalidad si el proyecto crece.
