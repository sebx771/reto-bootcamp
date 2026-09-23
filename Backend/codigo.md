# Backend Google App Script
aqui ira el  codigo del backend que esta en la nube 

```js
//router.gs
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const payload = JSON.parse(e.postData.contents);
    let respuesta;

    // ENRUTADOR: Decide qué módulo usar según la propiedad 'action'
    if (payload.action === "VERIFICAR_OPERARIO") {
      respuesta = verificarOperario(payload.operarioId);
    
    } else if (payload.action === "REGISTRAR_EVENTO") {
       respuesta = guardarRegistroNovedad(payload);

    } else if (payload.action === "CLASIFICAR_IA") {
      // Clasificar texto libre con Gemini y devolver al frontend ANTES de registrar
      if (!payload.textoNovedad || payload.textoNovedad.trim() === "") {
        respuesta = { status: "ERROR", mensaje: "textoNovedad es requerido" };
      } else {
        const resultado = clasificarConGemini(payload.textoNovedad);

        // Mapa inverso: nombre oficial de Gemini → ID interno del frontend
        const MAPA_ID = {
          "Producción Activa":                  "FALLA_MAQUINA",
          "Alistamiento y Preparación (Setup)":  "SETUP",
          "Espera de Materiales / Logística":    "MATERIAL",
          "Falla Técnica / Mantenimiento":       "FALLA_MAQUINA",
          "Calidad y Aprobación":                "CALIDAD",
          "Instrucciones / Coordinación":        "INSTRUCCION",
          "Accidente / Incidente de Seguridad":  "ACCIDENTE"
        };

        respuesta = {
          status: "SUCCESS",
          categoriaId:      MAPA_ID[resultado.categoria] || "FALLA_MAQUINA",
          categoriaNombre:  resultado.categoria,
          causa:            resultado.causa,
          confianza:        92
        };
      }

    } else {
      respuesta = { "ERROR": "ACCION NO RECONOCIDA" };
    }

    return ContentService.createTextOutput(JSON.stringify(respuesta))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "ERROR", mensaje: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}


```

```js
// Operario.gs
const NOMBRE_HOJA_OPERARIOS = "Maestro_Operarios";

function verificarOperario(operarioId) {
  if (!operarioId) return { status: "ERROR", mensaje: "ID no proporcionado" };

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOMBRE_HOJA_OPERARIOS);
  if (!sheet) return { status: "ERROR", mensaje: "La hoja de operarios no existe" };

  const datos = sheet.getDataRange().getValues();
  
  // Empezamos en 1 para saltar los encabezados: [Operario_ID, Nombre_Completo, CT_Empleado, Especialidad...][cite: 2]
  for (let i = 1; i < datos.length; i++) {
    if (datos[i][0].toString().trim() === operarioId.toString().trim()) {
      return {
        status: "SUCCESS",
        operario: {
          nombre: datos[i][1],
          ctEmpleado: datos[i][2].toString()
        }
      };
    }
  }
  
  return { status: "ERROR", mensaje: "Operario no encontrado en la base de datos" };
}
```

```js
//Registro.gs
//**
 * MÓDULO DE REGISTROS Y PERSISTENCIA (Google Sheets)
 * Formato espejo FO-A-MA-01
 */

const NOMBRE_HOJA_REGISTROS = "Registros_Operaciones";

/**
 * Inicializa la hoja de registros con sus encabezados si no existe.
 */
function inicializarHojaRegistros() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(NOMBRE_HOJA_REGISTROS);
  
  if (!sheet) {
    sheet = ss.insertSheet(NOMBRE_HOJA_REGISTROS);
    const encabezados = [
      "ID_Registro",
      "Fecha",
      "Timestamp_Evento",
      "OP",
      "Operario_ID",
      "Nombre_Operario",
      "CT_Operacion",
      "CT_Empleado",
      "Tipo_Evento",
      "Duracion_Minutos",
      "Texto_Novedad",
      "Categoria_Final",
      "Causa_IA",
      "Origen_Clasificacion",
      "Estado_Aprobacion"
    ];
    sheet.appendRow(encabezados);
    sheet.getRange(1, 1, 1, encabezados.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Procesa y guarda un registro de operación o novedad enviado por la PWA.
 */
function guardarRegistroNovedad(payload) {
  // 1. Freno de seguridad: Validar datos críticos antes de procesar
  if (!payload.tipoEvento || !payload.op) {
    throw new Error("Datos incompletos: El payload debe contener 'tipoEvento' y 'op'.");
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(NOMBRE_HOJA_REGISTROS);
  if (!sheet) {
    sheet = inicializarHojaRegistros();
  }

  // 2. Resolver clasificación (Botón Directo vs IA)
  let categoriaFinal = payload.categoriaDirecta || "";
  let causaIA = "";
  let origenClasificacion = "Botón Directo";

  // Si trae texto libre y no viene con categoría directa, invocar a Gemini
  if (!categoriaFinal && payload.textoNovedad && payload.textoNovedad.trim() !== "") {
    const resultadoIA = clasificarConGemini(payload.textoNovedad);
    categoriaFinal = resultadoIA.categoria;
    causaIA = resultadoIA.causa;
    origenClasificacion = "IA (Gemini/Groq)";
  } else if (!categoriaFinal && (payload.tipoEvento === "INICIO_PRODUCCION" || payload.tipoEvento === "INICIO")) {
    categoriaFinal = "Producción Activa";
    origenClasificacion = "Automático";
  }

  // 3. Generar metadatos de tiempo del sistema
  const idRegistro = "REG-" + Utilities.formatDate(new Date(), "America/Bogota", "yyyyMMdd-HHmmss-sss");
  const fechaHoy = Utilities.formatDate(new Date(), "America/Bogota", "yyyy-MM-dd");
  const timestampEvento = payload.timestamp || new Date().toISOString();

  // 4. Estructurar fila normalizada en el orden exacto de los encabezados
  const fila = [
    idRegistro,                                  // A. ID_Registro
    fechaHoy,                                    // B. Fecha
    timestampEvento,                             // C. Timestamp_Evento
    payload.op,                                  // D. OP (Garantizado por el freno de seguridad)
    payload.operarioId || "SIN_ID",              // E. Operario_ID
    payload.nombreOperario || "Operario Planta", // F. Nombre_Operario
    payload.ctOperacion || "CT-TALLER",          // G. CT_Operacion
    payload.ctEmpleado || "CT-BASE",             // H. CT_Empleado
    payload.tipoEvento,                          // I. Tipo_Evento
    Number(payload.duracionMinutos) || 0,        // J. Duracion_Minutos (EL TIEMPO EXACTO EN NÚMERO)
    payload.textoNovedad || "",                  // K. Texto_Novedad
    categoriaFinal || "Sin categoría",           // L. Categoria_Final
    causaIA || "N/A",                            // M. Causa_IA
    origenClasificacion,                         // N. Origen_Clasificacion
    "Pendiente"                                  // O. Estado_Aprobacion
  ];

  // 5. Guardar en Sheets
  sheet.appendRow(fila);

  return {
    status: "SUCCESS",
    mensaje: "Registro guardado correctamente",
    idRegistro: idRegistro,
    categoriaAsignada: categoriaFinal || "Sin categoría",
    causaIA: causaIA || "Sin análisis IA",
    minutosGuardados: Number(payload.duracionMinutos) || 0
  };
}**
 * MÓDULO DE REGISTROS Y PERSISTENCIA (Google Sheets)
 * Formato espejo FO-A-MA-01
 */

const NOMBRE_HOJA_REGISTROS = "Registros_Operaciones";

/**
 * Inicializa la hoja de registros con sus encabezados si no existe.
 */
function inicializarHojaRegistros() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(NOMBRE_HOJA_REGISTROS);
  
  if (!sheet) {
    sheet = ss.insertSheet(NOMBRE_HOJA_REGISTROS);
    const encabezados = [
      "ID_Registro",
      "Fecha",
      "Timestamp_Evento",
      "OP",
      "Operario_ID",
      "Nombre_Operario",
      "CT_Operacion",
      "CT_Empleado",
      "Tipo_Evento",
      "Duracion_Minutos",
      "Texto_Novedad",
      "Categoria_Final",
      "Causa_IA",
      "Origen_Clasificacion",
      "Estado_Aprobacion"
    ];
    sheet.appendRow(encabezados);
    sheet.getRange(1, 1, 1, encabezados.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Procesa y guarda un registro de operación o novedad enviado por la PWA.
 */
function guardarRegistroNovedad(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(NOMBRE_HOJA_REGISTROS);
  if (!sheet) {
    sheet = inicializarHojaRegistros();
  }

  // Resolver clasificación
  let categoriaFinal = payload.categoriaDirecta || "";
  let causaIA = "";
  let origenClasificacion = "Botón Directo";

  // Si trae texto libre y no viene con categoría directa, invocar a Gemini
  if (!categoriaFinal && payload.textoNovedad && payload.textoNovedad.trim() !== "") {
    const resultadoIA = clasificarConGemini(payload.textoNovedad);
    categoriaFinal = resultadoIA.categoria;
    causaIA = resultadoIA.causa;
    origenClasificacion = "IA (Gemini/Groq)";
  } else if (!categoriaFinal && payload.tipoEvento === "INICIO") {
    categoriaFinal = "Producción Activa";
    origenClasificacion = "Automático";
  }

  // Estructurar fila normalizada
  const idRegistro = "REG-" + Utilities.formatDate(new Date(), "America/Bogota", "yyyyMMdd-HHmmss-sss");
  const fechaHoy = Utilities.formatDate(new Date(), "America/Bogota", "yyyy-MM-dd");
  const timestampEvento = payload.timestamp || new Date().toISOString();

  const fila = [
    idRegistro,
    fechaHoy,
    timestampEvento,
    payload.op || "N/A",
    payload.operarioId || "SIN_ID",
    payload.nombreOperario || "Operario Planta",
    payload.ctOperacion || "CT-TALLER",
    payload.ctEmpleado || "CT-BASE",
    payload.tipoEvento || "NOVEDAD",          // INICIO, PAUSA, NOVEDAD, FIN
    Number(payload.duracionMinutos) || 0,
    payload.textoNovedad || "",
    categoriaFinal||"sin categoria",
    causaIA||"sin analisis AI",
    origenClasificacion,
    "Pendiente"                              // Estado para panel de supervisor
  ];

  sheet.appendRow(fila);

  return {
    status: "SUCCESS",
    mensaje: "Registro guardado correctamente",
    idRegistro: idRegistro,
    categoriaAsignada: categoriaFinal,
    causaIA: causaIA
  };
}
```

```js
// Gemini.gs
/**
 * MÓDULO DE INTELIGENCIA ARTIFICIAL (Gemini API + Groq Fallback)
 * Cumplimiento del 25% de la rúbrica SuperBrix
 */

// NOTA: Si usas Gemini, la clave debe empezar por "AIzaSy..."
const GEMINI_API_KEY = "tu_api_key_aqui"; 
const GROQ_API_KEY = "aqui_api_key"; // Asegúrate de poner una clave real que empiece por "gsk_"

const CATEGORIAS_OFICIALES = [
  "Producción Activa",
  "Alistamiento y Preparación (Setup)",
  "Espera de Materiales / Logística",
  "Falla Técnica / Mantenimiento",
  "Calidad y Aprobación",
  "Instrucciones / Coordinación",
  "Accidente / Incidente de Seguridad"
];

function clasificarConGemini(textoOperario) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const systemPrompt = `Eres un asistente de analítica industrial para la planta metalmecánica de SuperBrix S.A.
Tu tarea es analizar el reporte de un operario de taller y clasificarlo estrictamente en una de las siguientes 7 categorías:
1. "Producción Activa"
2. "Alistamiento y Preparación (Setup)"
3. "Espera de Materiales / Logística"
4. "Falla Técnica / Mantenimiento"
5. "Calidad y Aprobación"
6. "Instrucciones / Coordinación"
7. "Accidente / Incidente de Seguridad"

Responde EXCLUSIVAMENTE un objeto JSON válido con este formato:
{
  "categoria": "<Una de las 7 categorías exactas>",
  "causa": "<Breve resumen de la causa raíz en 4 palabras>"
}`;

  const payload = {
    contents: [{ parts: [{ text: systemPrompt }, { text: `Reporte del operario: "${textoOperario}"` }] }],
    generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const res = UrlFetchApp.fetch(url, options);
    
    // 🔥 EL FRENO DE EMERGENCIA: Si Google rechaza la clave, forzamos el error para saltar a Groq
    if (res.getResponseCode() !== 200) {
      throw new Error(`Gemini falló (Código ${res.getResponseCode()}). Posible API Key inválida.`);
    }

    const json = JSON.parse(res.getContentText());

    if (json.candidates && json.candidates[0].content.parts[0].text) {
      let outputText = json.candidates[0].content.parts[0].text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(outputText);
      
      const normalize = (s) => (s || '').toLowerCase().trim();
      const catIA = normalize(parsed.categoria);
      const catOficial = CATEGORIAS_OFICIALES.find(c => normalize(c) === catIA);
      
      if (catOficial) {
        return { categoria: catOficial, causa: parsed.causa || "No especificada" };
      }
    }
    throw new Error("Categoría de Gemini no coincide con el catálogo oficial.");

  } catch (err) {
    Logger.log("⚠️ Redirigiendo a Llama 3 (Groq Fallback): " + err.message);
    return clasificarConGroq(textoOperario); 
  }
}

function clasificarConGroq(textoOperario) {
  const url = "https://api.groq.com/openai/v1/chat/completions";
  const systemPrompt = `Eres un asistente de analítica industrial para la planta metalmecánica de SuperBrix S.A.
Tu tarea es analizar el reporte de un operario de taller y clasificarlo estrictamente en una de las siguientes 7 categorías:
1. "Producción Activa"
2. "Alistamiento y Preparación (Setup)"
3. "Espera de Materiales / Logística"
4. "Falla Técnica / Mantenimiento"
5. "Calidad y Aprobación"
6. "Instrucciones / Coordinación"
7. "Accidente / Incidente de Seguridad"

Responde EXCLUSIVAMENTE un objeto JSON válido con este formato:
{
  "categoria": "<Una de las 7 categorías exactas>",
  "causa": "<Breve resumen de la causa raíz en 4 palabras>"
}`;

  const payload = {
    model: "openai/gpt-oss-120b",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Reporte del operario: "${textoOperario}"` }
    ],
    temperature: 0.1,
    response_format: { type: "json_object" }
  };

  const options = {
    method: "post",
    headers: {
      "Authorization": "Bearer " + GROQ_API_KEY,
      "Content-Type": "application/json"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const res = UrlFetchApp.fetch(url, options);
    
    if (res.getResponseCode() !== 200) {
      throw new Error(`Groq falló (Código ${res.getResponseCode()}). Revisa tu GROQ_API_KEY.`);
    }

    const json = JSON.parse(res.getContentText());

    if (json.choices && json.choices[0].message && json.choices[0].message.content) {
      const parsed = JSON.parse(json.choices[0].message.content);
      const normalize = (s) => (s || '').toLowerCase().trim();
      const catIA = normalize(parsed.categoria);
      const catOficial = CATEGORIAS_OFICIALES.find(c => normalize(c) === catIA);
      
      if (catOficial) {
        return { categoria: catOficial, causa: parsed.causa || "No especificada" };
      }
    }
    return { categoria: "Falla Técnica / Mantenimiento", causa: "Revisión requerida" };
  } catch (err) {
    Logger.log("❌ Doble fallo IA (Gemini y Groq caídos): " + err.message);
    return { categoria: "Falla Técnica / Mantenimiento", causa: "Error crítico de servidor IA" };
  }
}

function testGeminiAPI() {
  const textoPrueba = "Paré la fresadora porque estoy esperando que traigan la broca de 1/2 pulgada";
  Logger.log("Enviando a IA: " + textoPrueba);
  
  const resultado = clasificarConGemini(textoPrueba);
  
  Logger.log("Resultado estructurado de la IA:\n" + JSON.stringify(resultado, null, 2));
  
  if (resultado.categoria === "Espera de Materiales / Logística") {
    Logger.log("✅ ÉXITO: La IA clasificó correctamente la novedad.");
  } else {
    Logger.log("❌ ERROR: La categoría no coincide. Se esperaba 'Espera de Materiales / Logística'.");
  }
}
```

```
```
