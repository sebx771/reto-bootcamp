# SmartOps - SuperBrix S.A. (Terminal Móvil PWA FO-A-MA-01)

MVP móvil PWA desarrollado para **SuperBrix S.A.** con el fin de digitalizar el formato de taller mecánico **FO-A-MA-01**. Diseñado específicamente para entornos de producción hostiles: manos enguantadas, ruido severo, sin micrófono, interacción rápida en 3 toques y arquitectura **Offline-First**.

---

## 🏗️ Estructura del Proyecto

El código está organizado de manera desacoplada y modular cumpliendo los requisitos técnicos de [`develop.md`](file:///c:/Users/Aprendiz/Desktop/BootCamp/develop.md):

```
smartops-frontend/
├── index.html              # Shell Kiosco industrial táctil y modales accesibles
├── manifest.json           # Manifiesto PWA para instalación standalone
├── sw.js                   # Service Worker (Caché y soporte 100% offline)
├── css/
│   └── styles.css          # Estilos industriales, alto contraste y cronómetro LCD
└── js/
    ├── config.js           # Catálogo oficial FO-A-MA-01, paros, CTs, OPs y endpoints
    ├── storage.js          # Persistencia Offline-First, cola de pendientes y sincronización
    ├── api.js              # Capa de red, reintentos, fallback local y clasificador IA
    ├── state.js            # Máquina de estados (Producción, Pausa, Paro, Cronómetro)
    ├── scanner.js          # Escáner QR/Barras (html5-qrcode) + fallback OPs demo
    └── app.js              # Controlador principal, ciclo de vida y feedback háptico/audio
```

---

## ⚡ Características Principales

1. **Ergonomía Industrial Táctil (Uso con Guantes)**:
   - Matriz 2x2 con botones masivos de **>76px de altura** y alto contraste.
   - Retroalimentación táctil (`navigator.vibrate`) y feedback de clic auditivo industrial sintetizado con Web Audio API (sin dependencias ni archivos de audio externos).
2. **Cronómetro Gigante Legible a Distancia**:
   - Tipografía monoespaciada tabular (`HH:MM:SS`) con luz piloto/baliza según estado:
     - 🟢 **Producción Activa**: Baliza verde pulsante.
     - ⏸️ **Pausa Operativa**: Baliza ámbar con banner de suspensión.
     - ⚠️ **Paro / Novedad**: Baliza roja estroboscópica con detalle de categoría FO-A-MA-01.
3. **Flujo de 3 Toques**:
   - **Toque 1**: Seleccionar o escanear Orden de Producción (OP).
   - **Toque 2**: Presionar `INICIAR LABOR`.
   - **Toque 3**: Reportar Novedad en 1 toque eligiendo la causa en la matriz de las 6 categorías oficiales.
4. **Offline-First Garantizado**:
   - `sw.js` cachea todo el cascarón de la aplicación.
   - Si se pierde la señal de red, el semáforo cambia a `OFFLINE` y todos los registros se resguardan en `localStorage`.
   - Un badge numérico en el header muestra cuántos registros están en espera.
   - Al volver la señal (`online`), el sistema sincroniza automáticamente los eventos en ráfaga contra el backend de Google Apps Script.
5. **Visión por Computador (QR / Código de Barras)**:
   - Integración con `html5-qrcode` para lectura rápida con cámara trasera.
   - Fallback integrado con catálogo de OPs de prueba (`OP-60211`, `OP-70442`, `OP-50103`, `OP-80315`) e ingreso numérico manual para cuando las hojas de ruta tienen grasa o polvo.
6. **Asistente de Clasificación con IA**:
   - Modal interactivo para que el operario escriba una frase imprevista en lenguaje natural.
   - El motor semántico industrial clasifica la incidencia en una de las 6 categorías oficiales de SuperBrix con porcentaje de confianza.

---

## 📋 Catálogo Oficial FO-A-MA-01

| Categoría | Código | Descripción Común |
|---|---|---|
| **Material** | `MATERIAL` | Falta de materia prima, material torcido o fuera de especificación. |
| **Herramienta** | `HERRAMIENTA` | Desgaste o fractura de inserto, falta de broca/fresa en pañol. |
| **Falla Máquina** | `FALLA_MAQUINA` | Falla eléctrica, hidráulica, neumática o sobrecalentamiento de husillo. |
| **Setup / Ajuste** | `SETUP` | Montaje de mordazas, centrado de pieza con reloj comparador o reglaje CNC. |
| **Calidad** | `CALIDAD` | Medida fuera de tolerancia dimensional o rugosidad no conforme. |
| **Instrucción / Planos** | `INSTRUCCION` | Duda en plano mecánico, falta de especificación o visto bueno de ingeniería. |

---

## 🚀 Cómo Ejecutar en Local

Puedes servir la aplicación con cualquier servidor web estático. Por ejemplo:

### Opción 1: Python
```bash
python -m http.server 8080
```
Luego abre tu navegador en: [http://localhost:8080/smartops-frontend/](http://localhost:8080/smartops-frontend/)

### Opción 2: Node.js (npx http-server)
```bash
npx http-server -p 8080
```

### Opción 3: Abrir directamente
Puedes abrir directamente el archivo [`smartops-frontend/index.html`](file:///c:/Users/Aprendiz/Desktop/BootCamp/smartops-frontend/index.html) en Chrome, Edge o Firefox.
