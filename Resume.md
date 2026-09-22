# Resumen Técnico del MVP SmartOps (SuperBrix S.A. - Formato FO-A-MA-01)

Documento de auditoría técnica y estado actual del desarrollo del MVP móvil PWA **SmartOps**, diseñado para la digitalización del formato de taller **FO-A-MA-01** bajo condiciones de operación industrial severas.

---

## 1. 🚀 Capacidades Actuales del MVP

| Capacidad | Estado | Descripción Técnica |
|---|---|---|
| **Arquitectura Modular Desacoplada** | ✅ Implementado | 8 módulos independientes (`config`, `storage`, `api`, `state`, `scanner`, `app`, `sw`, `styles`). |
| **Flujo Operativo de 3 Toques** | ✅ Implementado | 1) Carga de OP -> 2) Inicio de labor -> 3) Reporte directo de novedad o finalización. |
| **Ergonomía Táctil Industrial** | ✅ Implementado | Matriz 2x2 de botones masivos (>76px) optimizados para operarios con guantes y manos con grasa (`touch-action: manipulation`). |
| **Cronómetro Gigante Tabular** | ✅ Implementado | Formato `HH:MM:SS` en `JetBrains Mono` con balizas luminosas dinámicas (🟢 verde produciendo, ⏸️ ámbar pausado, ⚠️ rojo en paro). |
| **Arquitectura Offline-First** | ✅ Implementado | Funcionamiento garantizado sin internet: Service Worker (`sw.js`) cachea el App Shell estático; eventos resguardados en `localStorage`. |
| **Semáforo y Cola de Sincronización** | ✅ Implementado | Header persistente con indicador LED de red (`ONLINE`/`OFFLINE`), contador numérico de eventos en espera y sincronización automática en ráfaga al detectar señal. |
| **Persistencia de Sesión Activa** | ✅ Implementado | Si el operario recarga la ventana o se apaga la pantalla, el estado de la OP, operario, CT y tiempo transcurrido se recuperan automáticamente. |
| **Feedback Sensorial Multimodal** | ✅ Implementado | Vibración háptica (`navigator.vibrate`) y clic auditivo industrial sintetizado con **Web Audio API** nativo (sin requerir archivos de audio externos ni conectividad). |
| **Identidad Visual "Warm Horizon"** | ✅ Implementado | Diseño de alto contraste adaptado de `DESIGN.md` (`Plus Jakarta Sans`, `JetBrains Mono`, fondo alabastro `#FFF8F5`, acentos terracota y naranja solar). |
| **Ejecución Local Libre de Restricciones** | ✅ Implementado | Servidor nativo Node.js (`server.js`) y script Batch (`start.bat`) que eluden las políticas restrictivas de PowerShell (`ExecutionPolicy`). |

---

## 2. ⚠️ Limitaciones Actuales

1. **Persistencia Basada en LocalStorage (No IndexedDB aún)**:
   - Capacidad máxima aproximada de 5MB por dominio. Suficiente para miles de eventos de texto plano, pero si se acumulan imágenes de piezas rechazadas requerirá migrar a `IndexedDB`.
2. **Entorno de Red Unidireccional**:
   - Actualmente el terminal envía eventos hacia Google Apps Script (ingesta), pero no consulta en tiempo real cambios de estado que realice un supervisor desde una consola central.
3. **Restricciones de Cámara en Contextos No Seguros**:
   - La API de cámara (`MediaDevices.getUserMedia`) exige contexto seguro (`https://` o `localhost`). Si se sirve por IP local (`http://192.168.x.x`) en una red WiFi de planta sin certificado SSL, el navegador bloquea la cámara (activando el fallback demo).
4. **Ausencia de Autenticación Centralizada (SSO / LDAP / PIN)**:
   - La selección de operario y máquina se realiza mediante selectores rápidos sin validación de credenciales biométricas o PIN de seguridad.
5. **No hay Conteo de Piezas por Ciclo en Pantalla**:
   - El cronómetro mide tiempos acumulados y pausas, pero no registra el número de golpes de prensa o piezas torneadas unidad a unidad.

---

## 3. 🧩 Implementaciones Mock (Simuladas / Hardcodeadas)

Actualmente se encuentran en modo mock o precargadas las siguientes entidades para permitir pruebas inmediatas sin dependencias externas:

1. **Catálogo de Centros de Trabajo (`config.js`)**:
   - `CT-TORNO-01` (Torno CNC Mazak 01)
   - `CT-TORNO-02` (Torno Paralelo Colchester)
   - `CT-FRESA-01` (Centro Mecanizado Haas VF-3)
   - `CT-CORTE-01` (Sierra Cinta Behringer)
   - `CT-SOLD-01` (Estación Soldadura TIG 01)
   - `CT-ENSAM-01` (Mesa Ensamble Mecánico)
2. **Catálogo de Operarios de Taller (`config.js`)**:
   - Carlos Mendoza (`OPR-104`), Andrés Rivas (`OPR-205`), Javier Gómez (`OPR-312`), Mauricio Peña (`OPR-418`).
3. **Órdenes de Producción Demo (`config.js`)**:
   - `OP-60211`: Eje Principal Molino Arrocero SB-50 (Plano `PL-MOL-4402`).
   - `OP-70442`: Brida Acople Entrada 8" (Plano `PL-BRI-1120`).
   - `OP-50103`: Corona Dentada Mod 6 Z-48 (Plano `PL-COR-9931`).
   - `OP-80315`: Eje Mezclador Industrial Doble Cinta (Plano `PL-MEZ-3301`).
4. **URL de Endpoint Backend (`config.js`)**:
   - `https://script.google.com/macros/s/AKfycbz_mock_superbrix_foama01/exec` (URL placeholder pendiente de reemplazar por la Web App real del usuario).
5. **Simulación de Respuesta Fetch**:
   - Cuando la URL mock falla o no responde, el sistema simula con éxito la resiliencia encolando el evento en local (`estadoSync: 'PENDIENTE'`).

---

## 4. 🔍 Verificaciones y Validaciones por Agregar

Para llevar el MVP a un entorno de producción masivo en planta, se recomienda implementar las siguientes validaciones:

### A. Validaciones Operativas
- [ ] **Validación de OP Vacía antes de Iniciar**: Bloquear completamente la pulsación de `INICIAR LABOR` si no se ha confirmado una OP válida (actualmente lanza toast de aviso y abre modal).
- [ ] **Confirmación de Cantidad Terminada al Finalizar**: Input numérico obligatorio con piezas buenas y piezas defectuosas antes de permitir el cierre de la orden.
- [ ] **Control de Tiempos Negativos o Saltos de Reloj**: Validación contra manipulación del reloj interno del dispositivo (comparando timestamps locales contra la última marca conocida).

### B. Validaciones de Datos e Ingesta
- [ ] **Esquema de Payload Estricto**: Validación con schema (tipo Zod o Joi liviano) antes de encolar, asegurando campos obligatorios (`timestampISO`, `centroTrabajo`, `operario`, `ordenProduccion`, `tipoEvento`).
- [ ] **Deduplicación de Eventos**: Hash o UUID por evento para evitar registros duplicados si el usuario presiona repetidamente el botón mientras se reestablece la red.
- [ ] **Límite y Depuración de Historial**: Mecanismo de purga automática de eventos locales viejos (>7 días o >500 registros) para prevenir desbordamiento de cuota de almacenamiento.

---

## 5. 📷 Implementación QR / Código de Barras

### Estado y Arquitectura:
- **Librería Utilizada**: `html5-qrcode` (vía CDN en `index.html`).
- **Archivo Responsable**: [`smartops-frontend/js/scanner.js`](file:///c:/Users/Aprendiz/Desktop/BootCamp/smartops-frontend/js/scanner.js).

### Flujo de Funcionamiento:
1. Al presionar **`ESCANEAR`**, se invoca `SmartOpsScanner.abrirModalScanner()`.
2. Se solicita acceso a la cámara trasera (`facingMode: "environment"`) con recuadro de lectura delimitado a 250x250px a 10 FPS.
3. Al detectar un código:
   - Se limpia y apaga el sensor de video (`detenerEscaner()`) para evitar drenaje de batería.
   - Se normaliza el texto leído (ej: convierte `60211` en `OP-60211`).
   - Se asigna a la máquina de estados (`SmartOpsState.asignarOP(codigo)`).
   - Se emite feedback sensorial (vibración háptica + beep agudo de 880 Hz).
   - Se cierra el modal automáticamente y se habilita el botón `INICIAR LABOR`.

### Estrategia de Fallback Industrial:
- Si el dispositivo no tiene cámara o el operario deniega permisos:
  - Se muestra automáticamente un aviso explicativo.
  - **Fallback 1**: Cuadrícula de **Órdenes Demo a 1 toque** (`OP-60211`, `OP-70442`, `OP-50103`, etc.).
  - **Fallback 2**: Campo de **Ingreso Numérico Manual** con botón `CARGAR`, ideal para cuando el código impreso en la hoja de ruta está roto o manchado con refrigerante/aceite.

---

## 6. 🌐 Llamada a la API y Comunicación Backend

### Estado y Arquitectura:
- **Archivo Responsable**: [`smartops-frontend/js/api.js`](file:///c:/Users/Aprendiz/Desktop/BootCamp/smartops-frontend/js/api.js).
- **Backend Destino**: Google Apps Script (Web App con función `doPost(e)`).

### Prevención de Errores de CORS:
- **Problema Estándar de Apps Script**: Google Apps Script no soporta peticiones HTTP `OPTIONS` (preflight). Si se envía `Content-Type: application/json`, el navegador lanza error de CORS.
- **Solución Implementada**:
  - Las peticiones se envían con cabecera:
    ```javascript
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    }
    ```
  - El cuerpo se mantiene como string JSON estructurado (`JSON.stringify(payload)`).
  - Esto clasifica la petición como **Simple Request**, eliminando la necesidad de preflight `OPTIONS`.
  - Se añade `redirect: 'follow'` para permitir que el cliente siga de forma transparente la redirección 302 que genera Apps Script hacia `googleusercontent.com`.

### Resiliencia y Mecanismo Offline-First:
1. `navigator.onLine` es evaluado antes del envío.
2. Si está offline: guarda en `localStorage` (`SmartOpsStorage.guardarEventoEnCola()`) y activa el contador en el badge rojo.
3. Si está online: ejecuta `fetch()` con un timeout estricto de 5 segundos (`AbortController`).
4. Si el servidor falla (500, timeout, pérdida súbita de señal): **fallback automático** hacia la cola local sin perder datos del operario.
5. **Sincronización Automática**: Al dispararse el evento nativo del navegador `window.addEventListener('online')`, se ejecuta `sincronizarCola()`, despachando los pendientes en ráfaga y vaciando la cola tras confirmación.

---

## 7. 🧠 Llamada a LLM y Clasificación Inteligente

### Estado Actual:
- **Módulo Responsable**: `SmartOpsAPI.clasificarTextoConIA(textoLibre)` en [`smartops-frontend/js/api.js`](file:///c:/Users/Aprendiz/Desktop/BootCamp/smartops-frontend/js/api.js).
- **Modal de Usuario**: Modal 3 (`#modal-ia`) en `index.html`.

### Mecanismo Heurístico/Semántico Actual:
Actualmente opera mediante un **motor semántico local por reglas industriales** que mapea el vocabulario de taller no estructurado a las **6 Categorías Oficiales de SuperBrix**:

| Palabras Clave Detectadas | Categoría Clasificada | Confianza Asignada |
|---|---|---|
| *materia, acero, barra, chapa, lámina, torcido, lote* | `MATERIAL` | 94% |
| *broca, fresa, inserto, plaquita, desgaste, filo, afilado* | `HERRAMIENTA` | 96% |
| *alarma, calentamiento, motor, servo, fuga, aceite, husillo, CNC* | `FALLA_MAQUINA` | 95% |
| *mordaza, centrado, montaje, reloj comparador, calibrar, setup* | `SETUP` | 92% |
| *cota, tolerancia, rugosidad, rebaba, micrómetro, defecto* | `CALIDAD` | 91% |
| *plano, ingeniería, supervisor, duda, visto bueno* | `INSTRUCCION` | 93% |

### Próximo Paso: Conexión Directa con Gemini API:
Para conectar este módulo directamente con la API real de Google Gemini (o proxy en Apps Script):

```javascript
// Prompt Industrial para Gemini Flash:
const PROMPT_SISTEMA_GEMINI = `
Eres un asistente industrial experto en el formato FO-A-MA-01 de SuperBrix S.A.
Tu labor es clasificar la siguiente descripción de imprevisto del operario dentro de EXACTAMENTE una de las 6 categorías oficiales:
1. MATERIAL
2. HERRAMIENTA
3. FALLA_MAQUINA
4. SETUP
5. CALIDAD
6. INSTRUCCION

Responde ÚNICAMENTE en formato JSON:
{
  "categoriaId": "CODIGO",
  "categoriaNombre": "Nombre",
  "confianza": 95,
  "explicacion": "Motivo breve"
}
`;
```

Esta llamada puede enrutarse directamente mediante el SDK `@google/genai` o delegarse al mismo script de Google Apps Script para proteger la API Key sin exponerla en el cliente web.
