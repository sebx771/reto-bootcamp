/**
 * SmartOps SuperBrix S.A. - Máquina de Estados Operativa FO-A-MA-01
 * Gestiona el ciclo de vida de producción, cronómetro digital gigante y generación de payloads
 */

const SmartOpsState = {
  // Variables reactivas de estado
  estadoActual: SmartOpsConfig.ESTADOS.INACTIVO,
  opActiva: null,
  ctActual: 'CT-TORNO-01',
  operarioActual: 'Carlos Mendoza',
  
  // Tiempos
  tiempoInicio: null,
  tiempoTranscurridoSegundos: 0,
  timerInterval: null,
  ultimoTimestampSegmento: null,
  
  // Novedad activa si está en PARO
  novedadActiva: null,
  motivoPausa: null,

  /**
   * Inicializa la máquina de estados y recupera sesión previa si existe
   */
  init() {
    // Escuchar cambios en los selectores de CT y Operario
    const ctSelect = document.getElementById('select-ct');
    const operarioSelect = document.getElementById('select-operario');

    if (ctSelect) {
      this.ctActual = ctSelect.value;
      ctSelect.addEventListener('change', (e) => {
        this.ctActual = e.target.value;
        this.guardarSesion();
      });
    }

    if (operarioSelect) {
      this.operarioActual = operarioSelect.value;
      operarioSelect.addEventListener('change', (e) => {
        this.operarioActual = e.target.value;
        this.guardarSesion();
      });
    }

    // Intentar restaurar sesión activa de localStorage
    const sesion = SmartOpsStorage.cargarEstadoSesion();
    if (sesion && sesion.opActiva) {
      this.restaurarSesion(sesion);
    } else {
      this.actualizarUI();
    }
  },

  /**
   * Asigna una nueva Orden de Producción activa
   * @param {Object|string} op - Objeto OP o código OP
   */
  asignarOP(op) {
    if (typeof op === 'string') {
      const encontrada = SmartOpsConfig.ORDENES_DEMO.find(o => o.codigo === op);
      this.opActiva = encontrada || { codigo: op, descripcion: 'Labor de Taller Especial' };
    } else {
      this.opActiva = op;
    }

    // Actualizar visualmente la tarjeta de OP
    const opCodigoEl = document.getElementById('op-codigo-display');
    const opDescEl = document.getElementById('op-descripcion-display');
    const opPlanoEl = document.getElementById('op-plano-badge');

    if (opCodigoEl) opCodigoEl.textContent = this.opActiva.codigo;
    if (opDescEl) opDescEl.textContent = this.opActiva.descripcion;
    if (opPlanoEl && this.opActiva.plano) {
      opPlanoEl.textContent = this.opActiva.plano;
      opPlanoEl.classList.remove('hidden');
    }

    this.actualizarUI();
    this.guardarSesion();
    SmartOpsAPI.mostrarNotificacion(`OP ${this.opActiva.codigo} seleccionada correctamente.`, 'info');
  },

  /**
   * Transición: Iniciar o Reanudar Producción
   */
  iniciarProduccion() {
    if (!this.opActiva) {
      SmartOpsAPI.mostrarNotificacion('Primero debe escanear o seleccionar una OP activa.', 'warning');
      document.getElementById('modal-scanner')?.classList.remove('hidden');
      return;
    }

    const ahora = new Date();
    const esReanudacion = this.estadoActual === SmartOpsConfig.ESTADOS.PAUSA || 
                          this.estadoActual === SmartOpsConfig.ESTADOS.PARO;

    if (!esReanudacion) {
      this.tiempoInicio = ahora.toISOString();
      this.tiempoTranscurridoSegundos = 0;
    }

    this.estadoActual = SmartOpsConfig.ESTADOS.PRODUCCION;
    this.novedadActiva = null;
    this.motivoPausa = null;
    this.ultimoTimestampSegmento = ahora.getTime();

    // Arrancar el cronómetro
    this.iniciarTicker();

    // Empaquetar y despachar payload industrial FO-A-MA-01
    const payload = this.crearPayload('INICIO_PRODUCCION', {
      esReanudacion,
      tiempoAcumuladoPrevioSegundos: this.tiempoTranscurridoSegundos
    });
    SmartOpsAPI.enviarEvento(payload);

    this.actualizarUI();
    this.guardarSesion();
  },

  /**
   * Transición: Pausar labor (ej. refrigerio, necesidades fisiológicas, cambio de turno)
   * @param {string} motivo
   */
  pausarLabor(motivo = 'Pausa Operativa Estándar') {
    if (this.estadoActual !== SmartOpsConfig.ESTADOS.PRODUCCION) {
      return;
    }

    this.detenerTicker();
    this.estadoActual = SmartOpsConfig.ESTADOS.PAUSA;
    this.motivoPausa = motivo;

    const payload = this.crearPayload('PAUSA_LABOR', {
      motivoPausa: motivo,
      tiempoProduccionSegundos: this.tiempoTranscurridoSegundos,
      tiempoProduccionFormato: this.formatearTiempo(this.tiempoTranscurridoSegundos)
    });
    SmartOpsAPI.enviarEvento(payload);

    this.actualizarUI();
    this.guardarSesion();
    SmartOpsAPI.mostrarNotificacion(`Labor en Pausa: ${motivo}`, 'info');
  },

  /**
   * Transición: Reportar Novedad / Paro de Máquina según las 6 categorías oficiales
   * @param {string} categoriaId - ID de la categoría (MATERIAL, HERRAMIENTA, etc.)
   * @param {string} detalleCausa - Motivo específico o frase explicativa
   * @param {string} codigoCausa - Código rápido opcional (ej. MAT-01)
   */
  reportarNovedad(categoriaId, detalleCausa, codigoCausa = 'NOV-GEN') {
    if (!this.opActiva) {
      SmartOpsAPI.mostrarNotificacion('Debe haber una OP cargada para registrar novedad.', 'warning');
      return;
    }

    this.detenerTicker();
    this.estadoActual = SmartOpsConfig.ESTADOS.PARO;
    this.novedadActiva = {
      categoriaId,
      codigoCausa,
      detalleCausa,
      horaInicioParo: new Date().toISOString()
    };

    const payload = this.crearPayload('PARO_NOVEDAD', {
      categoria: categoriaId,
      codigoCausa: codigoCausa,
      descripcionNovedad: detalleCausa,
      tiempoProduccionSegundos: this.tiempoTranscurridoSegundos,
      tiempoProduccionFormato: this.formatearTiempo(this.tiempoTranscurridoSegundos)
    });
    SmartOpsAPI.enviarEvento(payload);

    this.actualizarUI();
    this.guardarSesion();
    SmartOpsAPI.mostrarNotificacion(`PARO REGISTRADO: [${categoriaId}] ${detalleCausa}`, 'error');
  },

  /**
   * Transición asistida por IA: Clasifica imprevisto no estructurado y reporta paro
   * @param {string} textoLibre
   */
  reportarNovedadIA(textoLibre) {
    const clasificacion = SmartOpsAPI.clasificarTextoConIA(textoLibre);
    this.reportarNovedad(
      clasificacion.categoriaId,
      `[IA Assist - ${clasificacion.confianza}%]: ${textoLibre}`,
      'IA-CLASSIFIED'
    );
  },

  /**
   * Transición: Finalizar la Orden de Producción activa
   */
  finalizarOperacion() {
    if (!this.opActiva) return;

    this.detenerTicker();
    const duracionFinalSegundos = this.tiempoTranscurridoSegundos;
    const duracionFormateada = this.formatearTiempo(duracionFinalSegundos);

    // Payload de cierre
    const payload = this.crearPayload('CIERRE_OP', {
      tiempoTotalProduccionSegundos: duracionFinalSegundos,
      tiempoTotalFormato: duracionFormateada,
      novedadesRegistradas: this.novedadActiva ? [this.novedadActiva] : []
    });
    SmartOpsAPI.enviarEvento(payload);

    SmartOpsAPI.mostrarNotificacion(`OP ${this.opActiva.codigo} FINALIZADA (${duracionFormateada})`, 'success');

    // Reset de estado
    this.estadoActual = SmartOpsConfig.ESTADOS.INACTIVO;
    this.opActiva = null;
    this.tiempoInicio = null;
    this.tiempoTranscurridoSegundos = 0;
    this.novedadActiva = null;
    this.motivoPausa = null;

    SmartOpsStorage.limpiarEstadoSesion();

    // Reset visual de tarjeta de OP
    const opCodigoEl = document.getElementById('op-codigo-display');
    const opDescEl = document.getElementById('op-descripcion-display');
    const opPlanoEl = document.getElementById('op-plano-badge');
    if (opCodigoEl) opCodigoEl.textContent = 'SIN OP ASIGNADA';
    if (opDescEl) opDescEl.textContent = 'Escanee el código de barras o seleccione una orden de prueba.';
    if (opPlanoEl) opPlanoEl.classList.add('hidden');

    this.actualizarTimerDisplay(0);
    this.actualizarUI();
  },

  /**
   * Construye el payload estandarizado para el backend SuperBrix FO-A-MA-01
   */
  crearPayload(tipoEvento, dataAdicional = {}) {
    return {
      formato: 'FO-A-MA-01',
      version: '2026.1',
      tipoEvento: tipoEvento,
      timestampISO: new Date().toISOString(),
      centroTrabajo: this.ctActual,
      operario: this.operarioActual,
      ordenProduccion: this.opActiva ? this.opActiva.codigo : 'N/A',
      descripcionLabor: this.opActiva ? this.opActiva.descripcion : 'N/A',
      plano: this.opActiva?.plano || 'N/A',
      ...dataAdicional
    };
  },

  /**
   * Manejador del temporizador cada segundo
   */
  iniciarTicker() {
    this.detenerTicker();
    this.timerInterval = setInterval(() => {
      this.tiempoTranscurridoSegundos++;
      this.actualizarTimerDisplay(this.tiempoTranscurridoSegundos);
      
      // Persistir cada 15 segundos para no perder conteo
      if (this.tiempoTranscurridoSegundos % 15 === 0) {
        this.guardarSesion();
      }
    }, 1000);
  },

  detenerTicker() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  },

  /**
   * Formatea segundos a HH:MM:SS
   */
  formatearTiempo(totalSegundos) {
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;
    return [
      horas.toString().padStart(2, '0'),
      minutos.toString().padStart(2, '0'),
      segundos.toString().padStart(2, '0')
    ].join(':');
  },

  actualizarTimerDisplay(segundos) {
    const timerDisplay = document.getElementById('cronometro-display');
    if (timerDisplay) {
      timerDisplay.textContent = this.formatearTiempo(segundos);
    }
  },

  /**
   * Actualiza el árbol DOM reflejando el estado operativo
   */
  actualizarUI() {
    const statusTextEl = document.getElementById('status-text');
    const beaconEl = document.getElementById('status-beacon');
    const timerBox = document.getElementById('timer-box');
    const novedadBanner = document.getElementById('novedad-alert-banner');
    const novedadText = document.getElementById('novedad-banner-text');

    // Botones de la matriz 2x2
    const btnIniciar = document.getElementById('btn-iniciar');
    const btnPausar = document.getElementById('btn-pausar');
    const btnNovedad = document.getElementById('btn-novedad');
    const btnFinalizar = document.getElementById('btn-finalizar');

    // Resetear baliza
    if (beaconEl) {
      beaconEl.className = 'beacon-dot';
    }

    if (statusTextEl) {
      statusTextEl.textContent = this.estadoActual;
    }

    // Gestionar estados y estilos
    switch (this.estadoActual) {
      case SmartOpsConfig.ESTADOS.PRODUCCION:
        if (beaconEl) beaconEl.classList.add('beacon-producing');
        if (timerBox) {
          timerBox.style.borderColor = '#10B981';
          timerBox.style.boxShadow = '0 8px 24px -4px rgba(16, 185, 129, 0.25), 0 2px 8px rgba(0, 0, 0, 0.04)';
        }
        if (novedadBanner) novedadBanner.classList.add('hidden');
        
        if (btnIniciar) {
          btnIniciar.disabled = true;
          btnIniciar.innerHTML = '<i data-lucide="play-circle" class="w-7 h-7"></i><span>PRODUCIENDO...</span>';
        }
        if (btnPausar) btnPausar.disabled = false;
        if (btnNovedad) btnNovedad.disabled = false;
        if (btnFinalizar) btnFinalizar.disabled = false;
        break;

      case SmartOpsConfig.ESTADOS.PAUSA:
        if (beaconEl) beaconEl.classList.add('beacon-paused');
        if (timerBox) {
          timerBox.style.borderColor = '#F59E0B';
          timerBox.style.boxShadow = '0 8px 24px -4px rgba(245, 158, 11, 0.25), 0 2px 8px rgba(0, 0, 0, 0.04)';
        }
        if (novedadBanner) {
          novedadBanner.classList.remove('hidden');
          novedadBanner.className = 'bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] rounded-2xl p-3 flex items-center gap-3 mb-3 shadow-sm';
          if (novedadText) novedadText.innerHTML = `<strong>PAUSA ACTIVA:</strong> ${this.motivoPausa || 'Labor suspendida temporalmente'}`;
        }
        if (btnIniciar) {
          btnIniciar.disabled = false;
          btnIniciar.innerHTML = '<i data-lucide="play-circle" class="w-7 h-7"></i><span>REANUDAR LABOR</span>';
        }
        if (btnPausar) btnPausar.disabled = true;
        if (btnNovedad) btnNovedad.disabled = false;
        if (btnFinalizar) btnFinalizar.disabled = false;
        break;

      case SmartOpsConfig.ESTADOS.PARO:
        if (beaconEl) beaconEl.classList.add('beacon-paro');
        if (timerBox) {
          timerBox.style.borderColor = '#EF4444';
          timerBox.style.boxShadow = '0 8px 24px -4px rgba(239, 68, 68, 0.3), 0 2px 8px rgba(0, 0, 0, 0.04)';
        }
        if (novedadBanner) {
          novedadBanner.classList.remove('hidden');
          novedadBanner.className = 'bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded-2xl p-3 flex items-center gap-3 mb-3 shadow-sm animate-pulse';
          if (novedadText) {
            novedadText.innerHTML = `<strong>PARO [${this.novedadActiva?.categoriaId || 'NOVEDAD'}]:</strong> ${this.novedadActiva?.detalleCausa || 'Máquina detenida'}`;
          }
        }
        if (btnIniciar) {
          btnIniciar.disabled = false;
          btnIniciar.innerHTML = '<i data-lucide="play-circle" class="w-7 h-7"></i><span>REANUDAR TRAS PARO</span>';
        }
        if (btnPausar) btnPausar.disabled = true;
        if (btnNovedad) btnNovedad.disabled = false;
        if (btnFinalizar) btnFinalizar.disabled = false;
        break;

      default: // INACTIVO
        if (beaconEl) beaconEl.classList.add('beacon-idle');
        if (timerBox) {
          timerBox.style.borderColor = '#EAE1DA';
          timerBox.style.boxShadow = '0 4px 20px -4px rgba(249, 115, 22, 0.08), 0 2px 8px rgba(120, 113, 108, 0.04)';
        }
        if (novedadBanner) novedadBanner.classList.add('hidden');
        
        if (btnIniciar) {
          btnIniciar.disabled = !this.opActiva;
          btnIniciar.innerHTML = '<i data-lucide="play-circle" class="w-7 h-7"></i><span>INICIAR LABOR</span>';
        }
        if (btnPausar) btnPausar.disabled = true;
        if (btnNovedad) btnNovedad.disabled = !this.opActiva;
        if (btnFinalizar) btnFinalizar.disabled = true;
        break;
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  guardarSesion() {
    SmartOpsStorage.guardarEstadoSesion({
      estadoActual: this.estadoActual,
      opActiva: this.opActiva,
      ctActual: this.ctActual,
      operarioActual: this.operarioActual,
      tiempoInicio: this.tiempoInicio,
      tiempoTranscurridoSegundos: this.tiempoTranscurridoSegundos,
      novedadActiva: this.novedadActiva,
      motivoPausa: this.motivoPausa
    });
  },

  restaurarSesion(sesion) {
    this.estadoActual = sesion.estadoActual || SmartOpsConfig.ESTADOS.INACTIVO;
    this.ctActual = sesion.ctActual || 'CT-TORNO-01';
    this.operarioActual = sesion.operarioActual || 'Carlos Mendoza';
    this.tiempoInicio = sesion.tiempoInicio;
    this.tiempoTranscurridoSegundos = sesion.tiempoTranscurridoSegundos || 0;
    this.novedadActiva = sesion.novedadActiva;
    this.motivoPausa = sesion.motivoPausa;

    // Sincronizar selectores del DOM
    const ctSelect = document.getElementById('select-ct');
    const operarioSelect = document.getElementById('select-operario');
    if (ctSelect) ctSelect.value = this.ctActual;
    if (operarioSelect) operarioSelect.value = this.operarioActual;

    if (sesion.opActiva) {
      this.asignarOP(sesion.opActiva);
    }

    this.actualizarTimerDisplay(this.tiempoTranscurridoSegundos);

    // Si estaba produciendo, reanudar ticker
    if (this.estadoActual === SmartOpsConfig.ESTADOS.PRODUCCION) {
      this.iniciarTicker();
    }

    this.actualizarUI();
  }
};

window.SmartOpsState = SmartOpsState;
