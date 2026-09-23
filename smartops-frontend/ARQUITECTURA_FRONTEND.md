# SmartOps Frontend: arquitectura y modales

Guía de referencia para futuros agentes y desarrolladores que deban mantener la PWA industrial SmartOps.

## 1. Propósito del frontend

SmartOps es una PWA de uso táctil para registrar producción, pausas, paros y cierre de órdenes de producción según el formato FO-A-MA-01.

El frontend está construido con HTML, CSS y JavaScript vanilla. No utiliza bundler ni módulos ES: los archivos se cargan secuencialmente mediante etiquetas `<script>` y exponen sus servicios en `window`.

La aplicación sigue esta separación:

- **Configuración:** catálogos, estados, causas rápidas, centros de trabajo y OP demo.
- **Persistencia:** sesión, historial local y cola Offline-First.
- **Estado:** transiciones de la operación y cronómetro.
- **Servicios:** red, sincronización, clasificación de texto y escáner.
- **UI:** render de estado, modales, timer y notificaciones.
- **Orquestación:** arranque, listeners y conexión entre módulos.

## 2. Estructura actual

```text
smartops-frontend/
├── index.html                  # Shell visual, layout y definición de los 6 modales
├── manifest.json               # Configuración instalable de la PWA
├── sw.js                       # Service Worker y caché offline
├── css/
│   └── styles.css              # Estilos industriales y estados visuales
├── ARQUITECTURA_FRONTEND.md    # Esta guía
└── js/
    ├── config.js               # Catálogos y constantes de negocio
    ├── storage.js              # localStorage, sesión, historial y cola offline
    ├── api.js                  # Backend, sincronización y clasificador IA
    ├── state.js                # Máquina de estados y cronómetro
    ├── scanner.js              # Cámara QR, ingreso manual y OP demo
    ├── ui.js                   # Render principal de la UI según snapshot
    ├── app.js                  # Arranque, eventos, red y feedback táctil/audio
    └── ui/
        ├── timer.js            # Presentación del cronómetro
        ├── toasts.js           # Notificaciones visuales
        └── modals.js           # Apertura, cierre y cola/historial
```

## 3. Orden de carga

El orden de scripts en `index.html` es parte del contrato actual. Se debe conservar al modificarlo:

```text
config.js -> storage.js -> api.js -> state.js -> scanner.js -> ui.js
-> ui/timer.js -> ui/toasts.js -> ui/modals.js -> app.js
```

La razón es que los módulos se comunican mediante objetos globales:

- `SmartOpsConfig`
- `SmartOpsStorage`
- `SmartOpsAPI`
- `SmartOpsState`
- `SmartOpsScanner`
- `SmartOpsUI`
- `SmartOpsTimer`
- `SmartOpsToasts`
- `SmartOpsModals`
- `SmartOpsApp`

Si en el futuro se migra a ES Modules, habrá que reemplazar también este contrato de carga global de forma coordinada.

## 4. Responsabilidad de cada módulo

### `config.js`

Expone `window.SmartOpsConfig` con:

- `ESTADOS`: `INACTIVO`, `PRODUCCIÓN`, `PAUSA`, `PARO / NOVEDAD` y `FINALIZADO`.
- `CATEGORIAS_OFICIALES`: las seis categorías FO-A-MA-01.
- `CAUSAS_RAPIDAS`: causas seleccionables en un toque.
- `CENTROS_DE_TRABAJO`: catálogo de máquinas o puestos.
- `OPERARIOS_CATALOGO`: operarios disponibles para pruebas.
- `ORDENES_DEMO`: órdenes de producción para pruebas y fallback.

No debe contener manipulación del DOM.

### `storage.js`

Expone `window.SmartOpsStorage`. Usa `localStorage` para tres datos:

- `smartops_cola_eventos`: eventos pendientes de sincronización.
- `smartops_historial_eventos`: bitácora local, limitada a 30 eventos.
- `smartops_estado_sesion`: OP activa, estado y tiempos para recuperar una recarga.

También actualiza el badge `offline-queue-badge` del header.

### `api.js`

Expone `window.SmartOpsAPI`. Sus responsabilidades son:

- Enviar eventos al endpoint de Google Apps Script.
- Encolar eventos si no hay red o falla la petición.
- Sincronizar la cola pendiente.
- Clasificar texto libre en una categoría oficial.
- Delegar los mensajes visuales a `SmartOpsToasts` mediante `mostrarNotificacion`.

La API no debe decidir cambios de estado de producción. Esa decisión pertenece a `SmartOpsState`.

### `state.js`

Expone `window.SmartOpsState`. Es la máquina de estados de la operación.

Funciones principales:

- `asignarOP(op)`
- `iniciarProduccion()`
- `pausarLabor(motivo)`
- `reportarNovedad(categoriaId, detalle, codigo)`
- `reportarNovedadIA(texto)`
- `finalizarOperacion()`
- `crearPayload(tipoEvento, datos)`
- `iniciarTicker()` y `detenerTicker()`

El estado se conserva en `SmartOpsState.state`. Los consumidores visuales se suscriben con `subscribe(fn)` y reciben una copia mediante `getSnapshot()`.

Regla de mantenimiento: el estado debe decidir y notificar; la presentación debe vivir en `SmartOpsUI` o en `ui/*`. Existe un fallback visual histórico en `actualizarUI()` para compatibilidad, pero las nuevas modificaciones deben usar los módulos de UI.

### `ui.js`

Expone `window.SmartOpsUI`. Su método `render(snapshot)` actualiza:

- Texto y baliza del estado.
- Orden de producción y plano.
- Cronómetro visible.
- Banner de pausa o paro.
- Habilitación y texto de los botones principales.

No envía eventos ni cambia la máquina de estados.

### `ui/timer.js`

Expone `window.SmartOpsTimer`.

- `formatearTiempo(segundos)`: produce `HH:MM:SS`.
- `actualizarTimerDisplay(segundos)`: escribe en `cronometro-display`.

### `ui/toasts.js`

Expone `window.SmartOpsToasts` y presenta mensajes temporales en `toast-container`.

Tipos soportados: `info`, `success`, `warning` y `error`.

Los módulos de negocio deben llamar a `SmartOpsAPI.mostrarNotificacion(...)`, que delega en este módulo. Así se evita acoplar la lógica de negocio a la estructura visual del toast.

### `ui/modals.js`

Expone `window.SmartOpsModals` y centraliza la apertura/cierre de modales y el render del historial/cola.

Métodos principales:

- `abrirModalNovedad()`
- `abrirModalIA()`
- `abrirModalPausa()`
- `abrirModalFinalizar()`
- `abrirModalColaHistorial()`
- `cerrarModal(modalId)`
- `cerrarTodosLosModales()`
- `renderizarDetalleCola()`

### `scanner.js`

Expone `window.SmartOpsScanner`.

- Inicia y detiene `html5-qrcode`.
- Procesa QR o cédula manual.
- Identifica al operario mediante `SmartOpsAPI.verificarOperario`.
- Permite seleccionar OP demo.
- Controla el modal `modal-scanner` porque el escáner necesita iniciar y detener la cámara junto con su visibilidad.

### `app.js`

Expone `window.SmartOpsApp` y es el punto de entrada en `DOMContentLoaded`.

Se encarga de:

- Registrar el Service Worker.
- Llenar selectores del header.
- Suscribirse a `SmartOpsState` y llamar a `SmartOpsUI.render`.
- Enlazar botones y eventos de modales.
- Vigilar `online` y `offline`.
- Renderizar la matriz de causas rápidas.
- Proporcionar feedback táctil y sonido industrial.

Debe mantenerse como coordinador. La lógica de negocio debe ir a `state.js` o `api.js`; la lógica visual reutilizable debe ir a `ui/*`.

## 5. Modales

Todos los modales usan la clase `modal-backdrop` y comienzan ocultos con `hidden`. La apertura consiste en retirar `hidden`; el cierre consiste en volver a agregarlo.

### Modal 1: identificación de operario / escáner

- **ID:** `modal-scanner`
- **Apertura:** botón `btn-abrir-scanner`, mediante `SmartOpsScanner.abrirModalScanner()`.
- **Cierre:** `btn-cerrar-scanner`, tecla `Escape` o cierre global.
- **Elementos importantes:**
  - `qr-reader-container`: vista de cámara.
  - `camera-fallback-notice`: aviso cuando no hay cámara o permisos.
  - `input-op-manual`: cédula manual.
  - `btn-confirmar-op-manual`: búsqueda manual.
  - `scanner-resultado`: resultado, error o estado de consulta.
- **Flujo:** la cámara o la cédula producen un identificador; `scanner.js` consulta al backend, actualiza el operario y muestra un toast.
- **Precaución:** al cerrar se debe detener la cámara con `SmartOpsScanner.detenerEscaner()`.

### Modal 2: reporte rápido de causas

- **ID:** `modal-novedades`
- **Apertura:** botón `btn-novedad`, mediante `SmartOpsApp.abrirModalNovedad()`.
- **Cierre:** `btn-cerrar-novedades`, selección de causa o tecla `Escape`.
- **Contenido dinámico:** `matriz-causas-rapidas`.
- **Origen de datos:** `SmartOpsConfig.CATEGORIAS_OFICIALES` y `SmartOpsConfig.CAUSAS_RAPIDAS`.
- **Acción:** cada causa llama a `SmartOpsApp.seleccionarCausaParo(...)`, que envía la transición a `SmartOpsState.reportarNovedad(...)`.
- **Acceso secundario:** `btn-abrir-ia-modal` cierra este modal y abre el modal de IA.

### Modal 3: clasificador asistido por IA

- **ID:** `modal-ia`
- **Apertura:** `btn-abrir-ia-modal` o `SmartOpsApp.abrirModalIA()`.
- **Cierre:** `btn-cerrar-ia`, aplicación del resultado o tecla `Escape`.
- **Entrada:** `textarea-ia-texto`.
- **Analizar:** `btn-probar-ia` llama a `SmartOpsAPI.clasificarTextoConIA(...)`.
- **Resultado:**
  - `ia-resultado-box`: contenedor que se hace visible.
  - `ia-categoria-resultado`: categoría sugerida.
  - `ia-confianza-resultado`: porcentaje.
  - `ia-explicacion-resultado`: explicación.
  - `btn-aplicar-ia`: confirma y registra el paro.
- **Regla:** analizar no registra todavía el paro; el registro sucede únicamente al pulsar `btn-aplicar-ia`.

### Modal 4: pausa operativa

- **ID:** `modal-pausa`
- **Apertura:** botón `btn-pausar`, mediante `SmartOpsApp.abrirModalPausa()`.
- **Cierre:** `btn-cerrar-pausa`, selección de motivo o tecla `Escape`.
- **Opciones:** elementos `.btn-opcion-pausa` con `data-motivo`.
- **Acción:** cada opción llama a `SmartOpsState.pausarLabor(motivo)` y después cierra el modal.
- **Motivos actuales:** almuerzo/refrigerio, charla de seguridad, relevo de turno y limpieza/orden 5S.
- **Condición:** `pausarLabor` solo tiene efecto si el estado actual es `PRODUCCIÓN`.

### Modal 5: confirmación de finalización

- **ID:** `modal-finalizar`
- **Apertura:** botón `btn-finalizar`, mediante `SmartOpsApp.abrirModalFinalizar()`.
- **Cierre:** `btn-cancelar-finalizar`, `btn-confirmar-finalizar` o tecla `Escape`.
- **Resumen:** `resumen-tiempo-final` muestra el tiempo acumulado antes de confirmar.
- **Confirmación:** `SmartOpsState.finalizarOperacion()` crea el evento `CIERRE_OP`, envía/encola el payload, limpia la sesión y devuelve el estado a `INACTIVO`.
- **Precaución:** abrir el modal no finaliza nada; la transición ocurre únicamente en el botón de confirmación.

### Modal 6: cola offline e historial

- **ID:** `modal-historial`
- **Apertura:** botón `network-status-btn`, mediante `SmartOpsApp.abrirModalColaHistorial()`.
- **Cierre:** `btn-cerrar-historial` o tecla `Escape`.
- **Contenido:** `historial-cola-items`, renderizado por `SmartOpsModals.renderizarDetalleCola()`.
- **Datos:** pendientes desde `SmartOpsStorage.obtenerColaPendiente()` e historial desde `SmartOpsStorage.obtenerHistorial()`.
- **Sincronización:** `btn-forzar-sync` llama a `SmartOpsAPI.sincronizarCola()`.
- **Precaución:** el modal solo consulta y muestra la cola; la eliminación de pendientes la realiza `api.js` después de un envío exitoso.

## 6. Flujo de datos principal

```text
Interacción del operario
        |
        v
      app.js / scanner.js
        |
        v
   SmartOpsState o SmartOpsAPI
        |
        +--> SmartOpsStorage (sesión, historial, cola)
        +--> SmartOpsAPI (red, fallback offline)
        |
        v
  SmartOpsState.notify(snapshot)
        |
        v
   SmartOpsUI.render(snapshot)
        |
        v
       DOM
```

Para mensajes visuales, el flujo es:

```text
state.js / api.js / scanner.js
        |
        v
SmartOpsAPI.mostrarNotificacion(...)
        |
        v
SmartOpsToasts.mostrarNotificacion(...)
        |
        v
#toast-container
```

## 7. Reglas para futuros cambios

1. Antes de editar un modal, localizar su `id` en `index.html` y sus listeners en `app.js`.
2. No duplicar el mismo comportamiento en `app.js`, `ui/modals.js` y `state.js`.
3. Las transiciones de negocio deben pasar por `SmartOpsState`.
4. Las peticiones y sincronizaciones deben pasar por `SmartOpsAPI`.
5. Todo dato que deba persistir debe pasar por `SmartOpsStorage`.
6. El render debe recibir datos y actualizar DOM; no debe fabricar payloads ni decidir transiciones.
7. Si se agrega un nuevo módulo, añadir su `<script>` antes de `app.js` y documentarlo aquí.
8. Después de cualquier cambio JavaScript, ejecutar `node --check` sobre el archivo modificado y, cuando el cambio sea transversal, sobre todos los módulos.
9. Probar especialmente los estados `INACTIVO`, `PRODUCCIÓN`, `PAUSA`, `PARO / NOVEDAD` y el retorno después de recargar la página.
10. Mantener los IDs de los elementos o actualizar simultáneamente los listeners que los consumen.

## 8. Validación rápida

Desde la raíz del repositorio:

```powershell
node --check smartops-frontend/js/config.js
node --check smartops-frontend/js/storage.js
node --check smartops-frontend/js/api.js
node --check smartops-frontend/js/state.js
node --check smartops-frontend/js/scanner.js
node --check smartops-frontend/js/ui.js
node --check smartops-frontend/js/ui/timer.js
node --check smartops-frontend/js/ui/toasts.js
node --check smartops-frontend/js/ui/modals.js
node --check smartops-frontend/js/app.js
```

Esta validación comprueba sintaxis, pero no reemplaza una prueba manual en navegador con cámara, almacenamiento local y cambios de conectividad.
