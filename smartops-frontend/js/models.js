/**
 * SmartOps SuperBrix S.A. - Capa de Modelos de Payload
 * Fuente de verdad del contrato con el backend (Google Apps Script).
 *
 * REGLA: Ningún otro módulo construye JSON para el backend a mano.
 *        Todos llaman a las funciones de este módulo y pasan sus datos.
 *
 * Carga: después de config.js, antes de api.js.
 */

const SmartOpsModels = {


  MAPA_CATEGORIA_BACKEND: Object.freeze({
    'MATERIAL':      'Espera de Materiales / Logística',
    'HERRAMIENTA':   'Alistamiento y Preparación (Setup)',
    'FALLA_MAQUINA': 'Falla Técnica / Mantenimiento',
    'SETUP':         'Alistamiento y Preparación (Setup)',
    'CALIDAD':       'Calidad y Aprobación',
    'INSTRUCCION':   'Instrucciones / Coordinación'
  }),

  /**
   * Traduce un ID de categoría interno a su nombre oficial para el backend.
   * Si ya viene como nombre oficial lo deja pasar sin cambios.
   * @param {string} categoriaId
   * @returns {string}
   */
  traducirCategoria(categoriaId) {
    return this.MAPA_CATEGORIA_BACKEND[categoriaId] || categoriaId || '';
  },

  // ─────────────────────────────────────────────────────────────
  // MODELO 1: VERIFICAR OPERARIO
  // Usado por: api.js → verificarOperario()
  // ─────────────────────────────────────────────────────────────

  /**
   * Construye el payload para consultar un operario por cédula.
   * Backend espera exactamente: { action, operarioId }
   * @param {string} cedula - Número de cédula (solo dígitos)
   * @returns {{ action: string, operarioId: string }}
   */
  verificarOperarioPayload(cedula) {
    if (!cedula) {
      throw new Error('[Models] verificarOperarioPayload: cedula es requerida');
    }
    return {
      action: 'VERIFICAR_OPERARIO',
      operarioId: String(cedula).trim()
    };
  },

  // ─────────────────────────────────────────────────────────────
  // MODELO 2: REGISTRAR EVENTO
  // Usado por: state.js → crearPayload()
  // Cubre: INICIO_PRODUCCION, PAUSA_LABOR, PARO_NOVEDAD, CIERRE_OP
  // ─────────────────────────────────────────────────────────────

  /**
   * Construye el payload base para cualquier evento de operación.
   * Aplica automáticamente la traducción de categorías.
   *
   * @param {string} tipoEvento - INICIO_PRODUCCION | PAUSA_LABOR | PARO_NOVEDAD | CIERRE_OP
   * @param {Object} contexto   - Snapshot del estado actual (op, operario, ct…)
   * @param {Object} extras     - Campos adicionales según el tipo de evento
   * @returns {Object} Payload listo para enviar al backend
   */
  eventoPayload(tipoEvento, contexto, extras = {}) {
    // Si viene categoriaDirecta con ID interno, traducirla al nombre oficial
    const categoriaTraducida = extras.categoriaDirecta
      ? this.traducirCategoria(extras.categoriaDirecta)
      : undefined;

    const payload = {
      // Metadatos del formato
      action: 'REGISTRAR_EVENTO',
      formato: 'FO-A-MA-01',
      version: '2026.1',

      // Evento
      tipoEvento: tipoEvento,
      timestamp: new Date().toISOString(),

      // Orden de producción
      op: contexto.op || 'N/A',
      descripcionLabor: contexto.descripcionLabor || 'N/A',
      plano: contexto.plano || 'N/A',

      // Operario (viene de la DB real tras verificar cédula)
      operarioId: contexto.operarioId || 'SIN_ID',
      nombreOperario: contexto.nombreOperario || 'Sin identificar',
      ctEmpleado: contexto.ctEmpleado || 'SIN_CT',

      // Centro de trabajo seleccionado en la UI
      ctOperacion: contexto.ctOperacion || 'SIN_CT_OP',

      // Campos extra del evento
      ...extras,

      // Sobrescribir categoriaDirecta con la versión traducida (si aplica)
      ...(categoriaTraducida !== undefined && { categoriaDirecta: categoriaTraducida })
    };

    return payload;
  },

  // ─────────────────────────────────────────────────────────────
  // BUILDERS ESPECIALIZADOS (usan eventoPayload internamente)
  // Ofrecen una API de alto nivel y auto-documentan qué se envía
  // ─────────────────────────────────────────────────────────────

  /**
   * Payload para inicio o reanudación de producción
   * @param {Object} contexto
   * @param {{ esReanudacion: boolean, tiempoAcumuladoPrevioSegundos: number, duracionInterrupcionSegundos?: number }} extras
   */
  inicioProduccion(contexto, extras) {
    return this.eventoPayload('INICIO_PRODUCCION', contexto, {
      esReanudacion: extras.esReanudacion || false,
      tiempoAcumuladoPrevioSegundos: extras.tiempoAcumuladoPrevioSegundos || 0,
      duracionInterrupcionSegundos: extras.duracionInterrupcionSegundos || 0,
      duracionMinutos: Math.round((extras.duracionInterrupcionSegundos || 0) / 60 * 10) / 10
    });
  },

  /**
   * Payload para pausa operativa
   * @param {Object} contexto
   * @param {{ motivoPausa: string, duracionMinutos: number }} extras
   */
  pausaLabor(contexto, extras) {
    return this.eventoPayload('PAUSA_LABOR', contexto, {
      motivoPausa: extras.motivoPausa || 'Pausa Operativa',
      duracionMinutos: extras.duracionMinutos || 0
    });
  },

  /**
   * Payload para paro / novedad de máquina
   * Aplica la traducción de categoría automáticamente.
   * @param {Object} contexto
   * @param {{ categoriaId: string, codigoCausa: string, textoNovedad: string, duracionMinutos: number }} extras
   */
  paroNovedad(contexto, extras) {
    return this.eventoPayload('PARO_NOVEDAD', contexto, {
      categoriaDirecta: extras.categoriaId || '',   // ← se traduce dentro de eventoPayload
      codigoCausa: extras.codigoCausa || 'NOV-GEN',
      textoNovedad: extras.textoNovedad || '',
      duracionMinutos: extras.duracionMinutos || 0
    });
  },

  /**
   * Payload para cierre de orden de producción
   * @param {Object} contexto
   * @param {{ duracionMinutos: number, tiempoTotalFormato: string, novedadesRegistradas: Array, tiempoPausaAcumuladoSegundos?: number }} extras
   */
  cierreOP(contexto, extras) {
    return this.eventoPayload('CIERRE_OP', contexto, {
      duracionMinutos: extras.duracionMinutos || 0,
      tiempoTotalFormato: extras.tiempoTotalFormato || '00:00:00',
      tiempoPausaAcumuladoSegundos: extras.tiempoPausaAcumuladoSegundos || 0,
      novedadesRegistradas: extras.novedadesRegistradas || []
    });
  }
};

window.SmartOpsModels = SmartOpsModels;
