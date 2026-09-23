/**
 * SmartOps SuperBrix S.A. - Máquina de Estados Operativa FO-A-MA-01
 * Gestiona el ciclo de vida de producción, cronómetro digital gigante y generación de payloads
 */

const SmartOpsState = {
  state: {
    estadoActual: SmartOpsConfig.ESTADOS.INACTIVO,
    opActiva: null,
    ctActual: 'CT-TORNO-01',
    ctEmpleado: null,          // se puebla desde la DB al verificar al operario
    operarioActual: null,      // se puebla desde la DB al verificar al operario
    operarioId: null,          // cédula real; null hasta que el operario se identifique
    tiempoInicio: null,
    tiempoTranscurridoSegundos: 0,
    timerInterval: null,
    ultimoTimestampSegmento: null,
    novedadActiva: null,
    motivoPausa: null,
    tiempoInicioPausa: null,
    tiempoPausaAcumuladoSegundos: 0,
    sesionesActivas: {}
  },

  listeners: [],

  subscribe(fn) {
    this.listeners.push(fn);
  },

  getSnapshot() {
    return { ...this.state };
  },

  notify() {
    this.listeners.forEach((fn) => fn(this.getSnapshot()));
  },

  setState(patch) {
    this.state = { ...this.state, ...patch };
    this.notify();
  },

  get estadoActual() { return this.state.estadoActual; },
  set estadoActual(value) { this.state.estadoActual = value; },
  get opActiva() { return this.state.opActiva; },
  set opActiva(value) { this.state.opActiva = value; },
  get ctActual() { return this.state.ctActual; },
  set ctActual(value) { this.state.ctActual = value; },
  get ctEmpleado() { return this.state.ctEmpleado; },
  set ctEmpleado(value) { this.state.ctEmpleado = value; },
  get operarioActual() { return this.state.operarioActual; },
  set operarioActual(value) { this.state.operarioActual = value; },
  get operarioId() { return this.state.operarioId; },
  set operarioId(value) { this.state.operarioId = value; },
  get tiempoInicio() { return this.state.tiempoInicio; },
  set tiempoInicio(value) { this.state.tiempoInicio = value; },
  get tiempoTranscurridoSegundos() { return this.state.tiempoTranscurridoSegundos; },
  set tiempoTranscurridoSegundos(value) { this.state.tiempoTranscurridoSegundos = value; },
  get timerInterval() { return this.state.timerInterval; },
  set timerInterval(value) { this.state.timerInterval = value; },
  get ultimoTimestampSegmento() { return this.state.ultimoTimestampSegmento; },
  set ultimoTimestampSegmento(value) { this.state.ultimoTimestampSegmento = value; },
  get novedadActiva() { return this.state.novedadActiva; },
  set novedadActiva(value) { this.state.novedadActiva = value; },
  get motivoPausa() { return this.state.motivoPausa; },
  set motivoPausa(value) { this.state.motivoPausa = value; },
  get tiempoInicioPausa() { return this.state.tiempoInicioPausa; },
  set tiempoInicioPausa(value) { this.state.tiempoInicioPausa = value; },
  get tiempoPausaAcumuladoSegundos() { return this.state.tiempoPausaAcumuladoSegundos; },
  set tiempoPausaAcumuladoSegundos(value) { this.state.tiempoPausaAcumuladoSegundos = value; },
  get sesionesActivas() { return this.state.sesionesActivas; },
  set sesionesActivas(value) { this.state.sesionesActivas = value; },

  setOperarioActual({ id, nombre, ctEmpleado }) {
    const nuevoId = String(id);
    
    // Si ya hay un operario y es diferente al nuevo, guardar su sesión
    if (this.operarioId && this.operarioId !== nuevoId) {
      if (this.estadoActual === SmartOpsConfig.ESTADOS.PRODUCCION) {
        this.pausarLabor('Cambio de Operario (Multi-sesión)');
      }
      this.state.sesionesActivas[this.operarioId] = {
        estadoActual: this.estadoActual,
        opActiva: this.opActiva,
        ctActual: this.ctActual,
        tiempoInicio: this.tiempoInicio,
        tiempoTranscurridoSegundos: this.tiempoTranscurridoSegundos,
        novedadActiva: this.novedadActiva,
        motivoPausa: this.motivoPausa,
        tiempoInicioPausa: this.tiempoInicioPausa,
        tiempoPausaAcumuladoSegundos: this.tiempoPausaAcumuladoSegundos,
        operarioActual: this.operarioActual,
        ctEmpleado: this.ctEmpleado
      };
    }

    let newState = {
      operarioId: nuevoId,
      operarioActual: nombre || 'Sin nombre',
      ctEmpleado: ctEmpleado || ''
    };

    // Restaurar si existe sesión para el nuevo operario
    if (this.operarioId !== nuevoId && this.state.sesionesActivas[nuevoId]) {
      newState = { ...newState, ...this.state.sesionesActivas[nuevoId] };
    } else if (this.operarioId !== nuevoId) {
      // Resetear variables operativas para operario nuevo
      newState.estadoActual = SmartOpsConfig.ESTADOS.INACTIVO;
      newState.opActiva = null;
      newState.tiempoInicio = null;
      newState.tiempoTranscurridoSegundos = 0;
      newState.novedadActiva = null;
      newState.motivoPausa = null;
      newState.tiempoInicioPausa = null;
      newState.tiempoPausaAcumuladoSegundos = 0;
    }

    this.setState(newState);

    // Actualizar select del operario y UI
    if (window.SmartOpsApp) {
      window.SmartOpsApp.actualizarDisplayOperario({ id: this.operarioId, nombre: this.operarioActual });
    }
    
    this.actualizarUI();
    this.guardarSesion();
  },

  /**
   * Inicializa la máquina de estados y recupera sesión previa si existe
   */
  init() {
    // CT-Operación: app.js registra el listener del select-ct.
    // Operario: ya NO se asigna por dropdown; se identifica exclusivamente por scanner.
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

    this.actualizarUI();
    this.guardarSesion();
    this.notify();
    SmartOpsAPI.mostrarNotificacion(`OP ${this.opActiva.codigo} seleccionada correctamente.`, 'info');
  },

  /**
   * Transición: Iniciar o Reanudar Producción
   */
  iniciarProduccion() {
    if (!this.opActiva) {
      SmartOpsAPI.mostrarNotificacion('Primero debe seleccionar una Orden de Producción.', 'warning');
      return;
    }

    if (!this.operarioId) {
      SmartOpsAPI.mostrarNotificacion('Debe identificarse con su cédula antes de iniciar.', 'warning');
      document.getElementById('modal-scanner')?.classList.remove('hidden');
      SmartOpsScanner.iniciarEscaner('qr-reader-container');
      return;
    }

    const ctSelect = document.getElementById('select-ct');
    if (!ctSelect || !ctSelect.value) {
      SmartOpsAPI.mostrarNotificacion('Debe seleccionar el CT-Operación antes de iniciar.', 'warning');
      return;
    }

    const ahora = new Date();
    const esReanudacion = this.estadoActual === SmartOpsConfig.ESTADOS.PAUSA ||
      this.estadoActual === SmartOpsConfig.ESTADOS.PARO;

    let duracionInterrupcionSegundos = 0;
    if (esReanudacion && this.tiempoInicioPausa) {
      duracionInterrupcionSegundos = Math.floor((ahora.getTime() - this.tiempoInicioPausa) / 1000);
      this.tiempoPausaAcumuladoSegundos += duracionInterrupcionSegundos;
      
      const duracionMinutos = Math.round((duracionInterrupcionSegundos / 60) * 10) / 10;
      
      if (this.estadoActual === SmartOpsConfig.ESTADOS.PAUSA) {
         const payload = this.crearPayload('PAUSA_LABOR', {
           motivoPausa: this.motivoPausa,
           duracionMinutos: duracionMinutos
         });
         SmartOpsAPI.enviarEvento(payload);
      } else if (this.estadoActual === SmartOpsConfig.ESTADOS.PARO) {
         const payload = this.crearPayload('PARO_NOVEDAD', {
           categoriaDirecta: this.novedadActiva?.categoriaId,
           codigoCausa: this.novedadActiva?.codigoCausa,
           textoNovedad: this.novedadActiva?.detalleCausa,
           duracionMinutos: duracionMinutos
         });
         SmartOpsAPI.enviarEvento(payload);
      }
    }

    if (!esReanudacion) {
      this.tiempoInicio = ahora.toISOString();
      this.tiempoTranscurridoSegundos = 0;
      this.tiempoPausaAcumuladoSegundos = 0;
    }

    this.estadoActual = SmartOpsConfig.ESTADOS.PRODUCCION;
    this.novedadActiva = null;
    this.motivoPausa = null;
    this.tiempoInicioPausa = null;
    this.ultimoTimestampSegmento = ahora.getTime();

    this.iniciarTicker();

    const payload = this.crearPayload('INICIO_PRODUCCION', {
      esReanudacion,
      tiempoAcumuladoPrevioSegundos: this.tiempoTranscurridoSegundos,
      duracionInterrupcionSegundos
    });
    SmartOpsAPI.enviarEvento(payload);

    this.actualizarUI();
    this.guardarSesion();
    this.notify();
  },

  /**
   * Transición: Pausar labor (ej. refrigerio, necesidades fisiológicas, cambio de turno)
   * @param {string} motivo
   */
  pausarLabor(motivo = 'Pausa Operativa Estándar') {
    if (this.estadoActual !== SmartOpsConfig.ESTADOS.PRODUCCION) {
      return;
    }

    this.estadoActual = SmartOpsConfig.ESTADOS.PAUSA;
    this.motivoPausa = motivo;
    this.tiempoInicioPausa = Date.now();

    this.actualizarUI();
    this.guardarSesion();
    this.notify();
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

    this.estadoActual = SmartOpsConfig.ESTADOS.PARO;
    this.tiempoInicioPausa = Date.now();
    this.novedadActiva = {
      categoriaId,
      codigoCausa,
      detalleCausa,
      horaInicioParo: new Date().toISOString()
    };

    this.actualizarUI();
    this.guardarSesion();
    this.notify();
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

    const payload = this.crearPayload('CIERRE_OP', {
      tiempoTotalProduccionSegundos: duracionFinalSegundos,
      tiempoTotalFormato: duracionFormateada,
      tiempoPausaAcumuladoSegundos: this.tiempoPausaAcumuladoSegundos,
      duracionMinutos: Math.round((this.tiempoTranscurridoSegundos / 60) * 10) / 10,
      novedadesRegistradas: this.novedadActiva ? [this.novedadActiva] : []
    });
    SmartOpsAPI.enviarEvento(payload);
    SmartOpsAPI.mostrarNotificacion(`OP ${this.opActiva.codigo} FINALIZADA (${duracionFormateada})`, 'success');

    this.estadoActual = SmartOpsConfig.ESTADOS.INACTIVO;
    this.opActiva = null;
    this.tiempoInicio = null;
    this.tiempoTranscurridoSegundos = 0;
    this.novedadActiva = null;
    this.motivoPausa = null;
    this.tiempoInicioPausa = null;
    this.tiempoPausaAcumuladoSegundos = 0;

    // Limpiar sesión del operario finalizado
    if (this.operarioId && this.state.sesionesActivas[this.operarioId]) {
      delete this.state.sesionesActivas[this.operarioId];
    }

    SmartOpsStorage.limpiarEstadoSesion();
    this.actualizarTimerDisplay(0);
    this.actualizarUI();
    this.notify();
  },

  /**
   * Construye el payload estandarizado delegando en SmartOpsModels.
   * Centraliza el contexto del estado y lo pasa al builder correspondiente.
   * @param {string} tipoEvento
   * @param {Object} dataAdicional
   */
  crearPayload(tipoEvento, dataAdicional = {}) {
    const contexto = {
      op: this.opActiva ? this.opActiva.codigo : 'N/A',
      descripcionLabor: this.opActiva ? this.opActiva.descripcion : 'N/A',
      plano: this.opActiva?.plano || 'N/A',
      operarioId: this.operarioId,
      nombreOperario: this.operarioActual,
      ctEmpleado: this.ctEmpleado,
      ctOperacion: this.ctActual
    };

    switch (tipoEvento) {
      case 'INICIO_PRODUCCION':
        return SmartOpsModels.inicioProduccion(contexto, dataAdicional);
      case 'PAUSA_LABOR':
        return SmartOpsModels.pausaLabor(contexto, dataAdicional);
      case 'PARO_NOVEDAD':
        // dataAdicional trae categoriaDirecta (ID interno) → models lo traduce
        return SmartOpsModels.paroNovedad(contexto, {
          categoriaId: dataAdicional.categoriaDirecta,
          codigoCausa: dataAdicional.codigoCausa,
          textoNovedad: dataAdicional.textoNovedad,
          duracionMinutos: dataAdicional.duracionMinutos
        });
      case 'CIERRE_OP':
        return SmartOpsModels.cierreOP(contexto, dataAdicional);
      default:
        return SmartOpsModels.eventoPayload(tipoEvento, contexto, dataAdicional);
    }
  },

  /**
   * Manejador del temporizador cada segundo
   */
  iniciarTicker() {
    this.detenerTicker();
    this.ultimoTimestampSegmento = Date.now();
    this.timerInterval = setInterval(() => {
      const ahora = Date.now();
      const delta = Math.floor((ahora - this.ultimoTimestampSegmento) / 1000);
      if (delta > 0) {
        this.ultimoTimestampSegmento = ahora;
        
        if (this.estadoActual === SmartOpsConfig.ESTADOS.PRODUCCION) {
          this.tiempoTranscurridoSegundos += delta;
          this.actualizarTimerDisplay(this.tiempoTranscurridoSegundos);
        } else if (this.estadoActual === SmartOpsConfig.ESTADOS.PAUSA || this.estadoActual === SmartOpsConfig.ESTADOS.PARO) {
          if (this.tiempoInicioPausa) {
            const pausaSegundos = Math.floor((ahora - this.tiempoInicioPausa) / 1000);
            this.actualizarPausaDisplay(pausaSegundos);
          }
        }
      }
    }, 1000);
  },

  actualizarPausaDisplay(segundos) {
    const timeFormatted = this.formatearTiempo(segundos);
    const counterSpan = document.getElementById('pausa-cronometro-display');
    if (counterSpan) {
       counterSpan.textContent = timeFormatted;
    }
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
    if (window.SmartOpsTimer && typeof window.SmartOpsTimer.actualizarTimerDisplay === 'function') {
      window.SmartOpsTimer.actualizarTimerDisplay(segundos);
      return;
    }

    const timerDisplay = document.getElementById('cronometro-display');
    if (timerDisplay) {
      timerDisplay.textContent = this.formatearTiempo(segundos);
    }
  },

  /**
   * Actualiza el árbol DOM reflejando el estado operativo
   */
  actualizarUI() {
    if (window.SmartOpsUI && typeof window.SmartOpsUI.render === 'function') {
      window.SmartOpsUI.render(this.getSnapshot());
      return;
    }

    const statusTextEl = document.getElementById('status-text');
    const beaconEl = document.getElementById('status-beacon');
    const timerBox = document.getElementById('timer-box');
    const novedadBanner = document.getElementById('novedad-alert-banner');
    const novedadText = document.getElementById('novedad-banner-text');

    const btnIniciar = document.getElementById('btn-iniciar');
    const btnPausar = document.getElementById('btn-pausar');
    const btnNovedad = document.getElementById('btn-novedad');
    const btnFinalizar = document.getElementById('btn-finalizar');

    if (beaconEl) {
      beaconEl.className = 'beacon-dot';
    }

    if (statusTextEl) {
      statusTextEl.textContent = this.estadoActual;
    }

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
          novedadBanner.className = 'bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] rounded-2xl p-3 flex flex-col justify-center gap-1 mb-3 shadow-sm text-center';
          if (novedadText) novedadText.innerHTML = `<div class="text-xs"><strong>PAUSA ACTIVA:</strong> ${this.motivoPausa || 'Labor suspendida temporalmente'}</div><div id="pausa-cronometro-display" class="font-mono font-black text-3xl mt-1 text-[#D97706]">00:00:00</div>`;
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
          novedadBanner.className = 'bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded-2xl p-3 flex flex-col justify-center gap-1 mb-3 shadow-sm animate-pulse text-center';
          if (novedadText) {
            novedadText.innerHTML = `<div class="text-xs"><strong>PARO [${this.novedadActiva?.categoriaId || 'NOVEDAD'}]:</strong> ${this.novedadActiva?.detalleCausa || 'Máquina detenida'}</div><div id="pausa-cronometro-display" class="font-mono font-black text-3xl mt-1 text-[#DC2626]">00:00:00</div>`;
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

      default:
        if (beaconEl) beaconEl.classList.add('beacon-idle');
        if (timerBox) {
          timerBox.style.borderColor = '#EAE1DA';
          timerBox.style.boxShadow = '0 4px 20px -4px rgba(249, 115, 22, 0.08), 0 2px 8px rgba(120, 113, 108, 0.04)';
        }
        if (novedadBanner) novedadBanner.classList.add('hidden');
        if (btnIniciar) {
          btnIniciar.disabled = !this.opActiva || !this.operarioId;
          btnIniciar.innerHTML = '<i data-lucide="play-circle" class="w-7 h-7"></i><span>INICIAR LABOR</span>';
        }
        if (btnPausar) btnPausar.disabled = true;
        if (btnNovedad) btnNovedad.disabled = !this.opActiva || !this.operarioId;
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
      motivoPausa: this.motivoPausa,
      tiempoInicioPausa: this.tiempoInicioPausa,
      tiempoPausaAcumuladoSegundos: this.tiempoPausaAcumuladoSegundos,
      sesionesActivas: this.state.sesionesActivas
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
    this.tiempoInicioPausa = sesion.tiempoInicioPausa || null;
    this.tiempoPausaAcumuladoSegundos = sesion.tiempoPausaAcumuladoSegundos || 0;
    
    if (sesion.sesionesActivas) {
      this.state.sesionesActivas = sesion.sesionesActivas;
    }

    const ctSelect = document.getElementById('select-ct');
    const operarioSelect = document.getElementById('select-operario');
    if (ctSelect) ctSelect.value = this.ctActual;
    if (operarioSelect) operarioSelect.value = this.operarioActual;

    if (sesion.opActiva) {
      this.asignarOP(sesion.opActiva);
    }

    this.actualizarTimerDisplay(this.tiempoTranscurridoSegundos);

    if (this.estadoActual === SmartOpsConfig.ESTADOS.PRODUCCION || this.estadoActual === SmartOpsConfig.ESTADOS.PAUSA || this.estadoActual === SmartOpsConfig.ESTADOS.PARO) {
      this.iniciarTicker();
    }

    this.actualizarUI();
  }
};

window.SmartOpsState = SmartOpsState;
