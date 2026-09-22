/**
 * SmartOps SuperBrix S.A. - Módulo de Persistencia y Soporte Offline
 * Gestiona el almacenamiento local, la cola de sincronización y el estado de sesión
 */

const STORAGE_KEYS = {
  COLA: 'smartops_cola_eventos',
  HISTORIAL: 'smartops_historial_eventos',
  ESTADO_SESION: 'smartops_estado_sesion'
};

const SmartOpsStorage = {
  /**
   * Guarda un nuevo evento en la cola offline de localStorage
   * @param {Object} evento - Payload estructurado del evento FO-A-MA-01
   * @returns {Object} El evento con ID local generado
   */
  guardarEventoEnCola(evento) {
    try {
      const cola = this.obtenerColaPendiente();
      const nuevoEvento = {
        ...evento,
        idLocal: `local_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        creadoEn: new Date().toISOString(),
        estadoSync: 'PENDIENTE'
      };

      cola.push(nuevoEvento);
      localStorage.setItem(STORAGE_KEYS.COLA, JSON.stringify(cola));
      
      // Registrar también en el historial local para trazabilidad del operario
      this.registrarEnHistorial(nuevoEvento);
      
      // Actualizar el indicador visual en el header
      this.actualizarBadgeOffline();

      console.log(`[Storage] Evento encolado en espera de señal (${cola.length} pendientes):`, nuevoEvento);
      return nuevoEvento;
    } catch (error) {
      console.error('[Storage] Error al guardar en cola local:', error);
      return evento;
    }
  },

  /**
   * Obtiene todos los eventos pendientes de sincronizar
   * @returns {Array} Lista de eventos en cola
   */
  obtenerColaPendiente() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.COLA);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[Storage] Error al leer la cola:', error);
      return [];
    }
  },

  /**
   * Elimina un evento específico de la cola por su idLocal
   * @param {string} idLocal
   */
  eliminarEventoDeCola(idLocal) {
    try {
      const cola = this.obtenerColaPendiente();
      const filtrada = cola.filter(item => item.idLocal !== idLocal);
      localStorage.setItem(STORAGE_KEYS.COLA, JSON.stringify(filtrada));
      this.actualizarBadgeOffline();
    } catch (error) {
      console.error('[Storage] Error al eliminar evento de la cola:', error);
    }
  },

  /**
   * Vacía completamente la cola de pendientes
   */
  limpiarCola() {
    try {
      localStorage.removeItem(STORAGE_KEYS.COLA);
      this.actualizarBadgeOffline();
      console.log('[Storage] Cola de eventos sincronizados vaciada correctamente.');
    } catch (error) {
      console.error('[Storage] Error al limpiar la cola:', error);
    }
  },

  /**
   * Actualiza el badge visual en el header con la cantidad de eventos pendientes
   */
  actualizarBadgeOffline() {
    const cola = this.obtenerColaPendiente();
    const count = cola.length;
    const badgeElement = document.getElementById('offline-queue-badge');
    const badgeCountElement = document.getElementById('queue-count-number');
    const syncStatusText = document.getElementById('sync-status-text');

    if (badgeElement) {
      if (count > 0) {
        badgeElement.classList.remove('hidden');
        if (badgeCountElement) badgeCountElement.textContent = count;
        if (syncStatusText) syncStatusText.textContent = `${count} pendientes`;
      } else {
        badgeElement.classList.add('hidden');
        if (syncStatusText) syncStatusText.textContent = 'Al día';
      }
    }
  },

  /**
   * Guarda el estado actual de la sesión (OP activa, tiempos, estado) para tolerancia a recarga
   * @param {Object} estado
   */
  guardarEstadoSesion(estado) {
    try {
      localStorage.setItem(STORAGE_KEYS.ESTADO_SESION, JSON.stringify(estado));
    } catch (error) {
      console.error('[Storage] Error al guardar estado de sesión:', error);
    }
  },

  /**
   * Recupera el estado de sesión previamente almacenado
   * @returns {Object|null}
   */
  cargarEstadoSesion() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ESTADO_SESION);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('[Storage] Error al cargar estado de sesión:', error);
      return null;
    }
  },

  /**
   * Limpia el estado de la sesión activa al finalizar la OP
   */
  limpiarEstadoSesion() {
    try {
      localStorage.removeItem(STORAGE_KEYS.ESTADO_SESION);
    } catch (error) {
      console.error('[Storage] Error al limpiar sesión:', error);
    }
  },

  /**
   * Agrega un evento al historial de bitácora local (máximo 30 eventos)
   * @param {Object} evento
   */
  registrarEnHistorial(evento) {
    try {
      const historial = this.obtenerHistorial();
      historial.unshift({
        ...evento,
        horaRegistro: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
      // Mantener únicamente los últimos 30 eventos para no sobrecargar el almacenamiento
      const recortado = historial.slice(0, 30);
      localStorage.setItem(STORAGE_KEYS.HISTORIAL, JSON.stringify(recortado));
    } catch (error) {
      console.error('[Storage] Error al registrar historial:', error);
    }
  },

  /**
   * Retorna los eventos del historial local
   * @returns {Array}
   */
  obtenerHistorial() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORIAL);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[Storage] Error al leer historial:', error);
      return [];
    }
  }
};

window.SmartOpsStorage = SmartOpsStorage;
