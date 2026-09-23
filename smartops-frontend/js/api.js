/**
 * SmartOps SuperBrix S.A. - Módulo de Red e Ingesta de Datos
 * Manejo de peticiones HTTP a Google Apps Script, sincronización y clasificación asistida
 */

const SmartOpsAPI = {
  /**
   * Envía un evento al backend de Google Apps Script con estrategia Offline-First
   * @param {Object} eventoPayload - Objeto con datos formateados según FO-A-MA-01
   * @returns {Promise<Object>} Resultado del envío o del encolamiento
   */
  async enviarEvento(eventoPayload) {
    const isOnline = navigator.onLine;

    // Si el navegador reporta estar desconectado, encolar inmediatamente
    if (!isOnline) {
      console.warn('[API] Dispositivo sin conexión. Encolando evento localmente...');
      const eventoEncolado = SmartOpsStorage.guardarEventoEnCola(eventoPayload);
      this.mostrarNotificacion('Sin conexión. Registro guardado en cola local.', 'warning');
      return { success: true, offline: true, evento: eventoEncolado };
    }

    // Si hay conexión, intentar el despacho HTTP vía fetch
    try {
      const endpoint = SmartOpsConfig.ENDPOINT_APPS_SCRIPT;
      
      // Control de tiempo de espera (5 segundos máximo para evitar colgar la UI del operario)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Se envía como text/plain para evitar el preflight OPTIONS de CORS en Google Apps Script
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(eventoPayload),
        redirect: 'follow',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Si el fetch responde con éxito
      SmartOpsStorage.registrarEnHistorial({
        ...eventoPayload,
        estadoSync: 'ENVIADO'
      });

      this.mostrarNotificacion('Evento registrado en el servidor exitosamente.', 'success');
      return { success: true, offline: false, response };
    } catch (error) {
      // Fallback automático a la cola de persistencia local en caso de error o timeout
      console.warn('[API] Fallo en la comunicación con Apps Script. Pasando a cola offline:', error.message);
      const eventoEncolado = SmartOpsStorage.guardarEventoEnCola(eventoPayload);
      this.mostrarNotificacion('Falla de red. Evento resguardado en la cola local.', 'warning');
      return { success: true, offline: true, evento: eventoEncolado, error: error.message };
    }
  },

  /**
   * Sincroniza en ráfaga todos los eventos acumulados en la cola local
   */
  async sincronizarCola() {
    if (!navigator.onLine) {
      console.log('[API] Intento de sincronización cancelado: aún sin conexión.');
      return;
    }

    const pendientes = SmartOpsStorage.obtenerColaPendiente();
    if (pendientes.length === 0) {
      console.log('[API] Cola vacía. No hay eventos pendientes de sincronizar.');
      return;
    }

    console.log(`[API] Sincronizando ${pendientes.length} eventos pendientes con SuperBrix backend...`);
    this.mostrarNotificacion(`Sincronizando ${pendientes.length} registros pendientes...`, 'info');

    let exitosos = 0;
    const fallidos = [];

    for (const evento of pendientes) {
      try {
        await fetch(SmartOpsConfig.ENDPOINT_APPS_SCRIPT, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(evento),
          redirect: 'follow'
        });

        // Eliminar de la cola tras éxito
        SmartOpsStorage.eliminarEventoDeCola(evento.idLocal);
        exitosos++;
      } catch (err) {
        console.error(`[API] Error al sincronizar evento ${evento.idLocal}:`, err);
        fallidos.push(evento);
      }
    }

    SmartOpsStorage.actualizarBadgeOffline();

    if (exitosos > 0) {
      this.mostrarNotificacion(`¡Se sincronizaron ${exitosos} eventos con éxito!`, 'success');
    }
    if (fallidos.length > 0) {
      this.mostrarNotificacion(`${fallidos.length} eventos quedaron pendientes por error de red.`, 'warning');
    }
  },

  /**
   * Motor de Asistencia IA: Clasifica un texto en lenguaje natural de operario
   * en una de las 6 categorías oficiales de SuperBrix FO-A-MA-01
   * @param {string} textoLibre
   * @returns {Object}
   */
  clasificarTextoConIA(textoLibre) {
    if (!textoLibre || textoLibre.trim().length === 0) {
      return {
        categoria: 'HERRAMIENTA',
        confianza: 50,
        motivo: 'Texto vacío; asignada categoría por defecto'
      };
    }

    const t = textoLibre.toLowerCase();

    // Reglas semánticas industriales de SuperBrix
    if (t.includes('materia') || t.includes('acero') || t.includes('barra') || t.includes('chapa') || 
        t.includes('lámina') || t.includes('torcid') || t.includes('lote') || t.includes('material')) {
      return {
        categoriaId: 'MATERIAL',
        categoriaNombre: 'Material',
        confianza: 94,
        explicacion: 'Detectadas referencias directas a materia prima o condiciones de suministro de corte.'
      };
    }

    if (t.includes('broca') || t.includes('fresa') || t.includes('inserto') || t.includes('plaquita') || 
        t.includes('desgaste') || t.includes('filo') || t.includes('cuchilla') || t.includes('afilado') || t.includes('pañol')) {
      return {
        categoriaId: 'HERRAMIENTA',
        categoriaNombre: 'Herramienta',
        confianza: 96,
        explicacion: 'Se identifica anomalía en útiles de corte o necesidad de reemplazo de insertos.'
      };
    }

    if (t.includes('alarma') || t.includes('motor') || t.includes('calent') || t.includes('servo') || 
        t.includes('fuga') || t.includes('aceite') || t.includes('hidraul') || t.includes('neumat') || 
        t.includes('husillo') || t.includes('variador') || t.includes('cnc') || t.includes('falla')) {
      return {
        categoriaId: 'FALLA_MAQUINA',
        categoriaNombre: 'Falla Máquina',
        confianza: 95,
        explicacion: 'Identificado desperfecto mecánico, eléctrico o de fluidos en la máquina.'
      };
    }

    if (t.includes('mordaza') || t.includes('centrado') || t.includes('montaje') || t.includes('reloj') || 
        t.includes('calibrar') || t.includes('cero') || t.includes('programa') || t.includes('g-code') || t.includes('setup')) {
      return {
        categoriaId: 'SETUP',
        categoriaNombre: 'Setup / Ajuste',
        confianza: 92,
        explicacion: 'La labor corresponde a puesta a punto, fijación de mordazas o alineación de pieza.'
      };
    }

    if (t.includes('cota') || t.includes('tolerancia') || t.includes('medida') || t.includes('rugosidad') || 
        t.includes('rebaba') || t.includes('micrometro') || t.includes('calibre') || t.includes('defecto') || t.includes('calidad')) {
      return {
        categoriaId: 'CALIDAD',
        categoriaNombre: 'Calidad',
        confianza: 91,
        explicacion: 'Incidente vinculado a especificaciones dimensionales o acabado geométrico.'
      };
    }

    if (t.includes('plano') || t.includes('ingenier') || t.includes('supervisor') || t.includes('duda') || 
        t.includes('instrucc') || t.includes('especifica') || t.includes('visto bueno')) {
      return {
        categoriaId: 'INSTRUCCION',
        categoriaNombre: 'Instrucción / Planos',
        confianza: 93,
        explicacion: 'Falta de información técnica, duda en cotas de plano o espera de validación técnica.'
      };
    }

    // Caso genérico fallback
    return {
      categoriaId: 'FALLA_MAQUINA',
      categoriaNombre: 'Falla Máquina',
      confianza: 75,
      explicacion: 'Clasificado preventivamente como Falla Máquina / Novedad operativa imprevista.'
    };
  },

  /**
   * Consulta al backend si una cédula corresponde a un operario registrado.
   * Usa SmartOpsModels para construir el payload y normaliza la respuesta.
   * @param {string} cedula - Número de cédula (solo dígitos)
   * @returns {Promise<{ success: boolean, operario?: { id, nombre, ctEmpleado }, mensaje?: string }>}
   */
  async verificarOperario(cedula) {
    try {
      const endpoint = SmartOpsConfig.ENDPOINT_APPS_SCRIPT;
      const payload = SmartOpsModels.verificarOperarioPayload(cedula);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await response.json();

      // Normalizar: el backend responde { status:"SUCCESS"|"ERROR", operario, mensaje }
      // El resto del frontend espera { success:true|false, operario, mensaje }
      if (data.status === 'SUCCESS' && data.operario) {
        return {
          success: true,
          operario: {
            id: String(cedula),                          // la DB no lo devuelve; usamos la cédula enviada
            nombre: data.operario.nombre || 'Operario',
            ctEmpleado: String(data.operario.ctEmpleado || '')
          }
        };
      }

      return {
        success: false,
        mensaje: data.mensaje || 'Operario no encontrado en la base de datos.'
      };

    } catch (err) {
      console.error('[API] Error al verificar operario:', err.message);
      return {
        success: false,
        mensaje: 'Error de conexión al verificar operario.'
      };
    }
  },

  /**
   * Despliega mensajes toast de alto contraste para el entorno industrial
   * @param {string} mensaje
   * @param {'success'|'warning'|'error'|'info'} tipo
   */
  mostrarNotificacion(mensaje, tipo = 'info') {
    if (window.SmartOpsToasts && typeof window.SmartOpsToasts.mostrarNotificacion === 'function') {
      window.SmartOpsToasts.mostrarNotificacion(mensaje, tipo);
      return;
    }

    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-industrial px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all duration-300 transform translate-y-2 opacity-0 mb-2 max-w-sm`;

    let bgColor = 'bg-white text-[#1F1B17] border-[#EAE1DA] shadow-lg';
    let iconName = 'info';

    if (tipo === 'success') {
      bgColor = 'bg-[#ECFDF5] text-[#065F46] border-[#6EE7B7] shadow-emerald-500/10';
      iconName = 'check-circle';
    } else if (tipo === 'warning') {
      bgColor = 'bg-[#FFFBEB] text-[#92400E] border-[#FCD34D] shadow-amber-500/10';
      iconName = 'alert-triangle';
    } else if (tipo === 'error') {
      bgColor = 'bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5] shadow-red-500/10';
      iconName = 'alert-octagon';
    }

    toast.classList.add(...bgColor.split(' '));
    toast.innerHTML = `
      <i data-lucide="${iconName}" class="w-5 h-5 flex-shrink-0"></i>
      <span class="flex-1">${mensaje}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Animación de entrada
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    });

    // Auto-cierre tras 3.5 segundos
    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 350);
    }, 3500);
  }
};

window.SmartOpsAPI = SmartOpsAPI;
