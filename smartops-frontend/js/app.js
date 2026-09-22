/**
 * SmartOps SuperBrix S.A. - Controlador Principal y Ciclo de Vida
 * Inicialización de UI, eventos táctiles, Service Worker y listeners de conectividad
 */

const SmartOpsApp = {
  audioCtx: null,

  /**
   * Punto de entrada de la aplicación al cargar el DOM
   */
  init() {
    console.log('[App] Inicializando SmartOps PWA SuperBrix v1.0.0...');

    // 1. Inicializar iconos de Lucide
    if (window.lucide) {
      window.lucide.createIcons();
    }

    // 2. Registrar Service Worker para soporte offline
    this.registrarServiceWorker();

    // 3. Inicializar selectores del Header
    this.inicializarSelectoresHeader();

    // 4. Inicializar la máquina de estados y recuperar sesión
    SmartOpsState.init();

    // 5. Enlazar eventos de botones masivos y modales
    this.enlazarEventosBotones();
    this.enlazarEventosModales();

    // 6. Monitorear estado de conexión de red
    this.configurarMonitoreoRed();

    // 7. Renderizar botones demo en el scanner
    SmartOpsScanner.renderizarBotonesDemo();

    // 8. Renderizar matriz de 6 causas en el modal de reporte rápido
    this.renderizarMatrizCausasRapidas();

    // 9. Actualizar badge de cola inicial
    SmartOpsStorage.actualizarBadgeOffline();

    console.log('[App] SmartOps listo para operar en taller.');
  },

  /**
   * Registra el Service Worker para caché offline
   */
  registrarServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((registration) => {
            console.log('[App] ServiceWorker registrado con alcance:', registration.scope);
          })
          .catch((error) => {
            console.warn('[App] Error al registrar ServiceWorker:', error);
          });
      });
    }
  },

  /**
   * Rellena las opciones de los selectores de CT y Operario
   */
  inicializarSelectoresHeader() {
    const ctSelect = document.getElementById('select-ct');
    const operarioSelect = document.getElementById('select-operario');

    if (ctSelect && SmartOpsConfig.CENTROS_DE_TRABAJO) {
      ctSelect.innerHTML = SmartOpsConfig.CENTROS_DE_TRABAJO.map(ct => `
        <option value="${ct.id}">${ct.id} - ${ct.nombre}</option>
      `).join('');
    }

    if (operarioSelect && SmartOpsConfig.OPERARIOS_CATALOGO) {
      operarioSelect.innerHTML = SmartOpsConfig.OPERARIOS_CATALOGO.map(op => `
        <option value="${op.nombre}">${op.nombre} (${op.id})</option>
      `).join('');
    }
  },

  /**
   * Enlaza los botones masivos principales (>72px)
   */
  enlazarEventosBotones() {
    const btnIniciar = document.getElementById('btn-iniciar');
    const btnPausar = document.getElementById('btn-pausar');
    const btnNovedad = document.getElementById('btn-novedad');
    const btnFinalizar = document.getElementById('btn-finalizar');

    // Botón Iniciar / Reanudar
    btnIniciar?.addEventListener('click', () => {
      this.darFeedbackTactil();
      this.emitirBeepIndustrial(520, 0.08);
      SmartOpsState.iniciarProduccion();
    });

    // Botón Pausar
    btnPausar?.addEventListener('click', () => {
      this.darFeedbackTactil();
      this.emitirBeepIndustrial(440, 0.08);
      this.abrirModalPausa();
    });

    // Botón Reportar Novedad
    btnNovedad?.addEventListener('click', () => {
      this.darFeedbackTactil();
      this.emitirBeepIndustrial(350, 0.1);
      this.abrirModalNovedad();
    });

    // Botón Finalizar OP
    btnFinalizar?.addEventListener('click', () => {
      this.darFeedbackTactil();
      this.emitirBeepIndustrial(300, 0.12);
      this.abrirModalFinalizar();
    });

    // Botón de escáner en tarjeta de OP
    const btnAbrirScanner = document.getElementById('btn-abrir-scanner');
    btnAbrirScanner?.addEventListener('click', () => {
      this.darFeedbackTactil();
      SmartOpsScanner.abrirModalScanner();
    });

    // Botón sincronizar manual en badge de red
    const badgeRed = document.getElementById('network-status-btn');
    badgeRed?.addEventListener('click', () => {
      this.darFeedbackTactil();
      this.abrirModalColaHistorial();
    });
  },

  /**
   * Enlaza la lógica de apertura y cierre de todos los modales
   */
  enlazarEventosModales() {
    // Cerrar modales con tecla Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.cerrarTodosLosModales();
      }
    });

    // Modal Scanner: Cerrar
    document.getElementById('btn-cerrar-scanner')?.addEventListener('click', () => {
      SmartOpsScanner.cerrarModalScanner();
    });

    // Modal Scanner: Ingreso manual
    document.getElementById('btn-confirmar-op-manual')?.addEventListener('click', () => {
      SmartOpsScanner.procesarIngresoManual();
    });
    document.getElementById('input-op-manual')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        SmartOpsScanner.procesarIngresoManual();
      }
    });

    // Modal Reporte Rápido: Cerrar
    document.getElementById('btn-cerrar-novedades')?.addEventListener('click', () => {
      this.cerrarModal('modal-novedades');
    });

    // Modal Asistido IA: Abrir desde modal de novedades
    document.getElementById('btn-abrir-ia-modal')?.addEventListener('click', () => {
      this.cerrarModal('modal-novedades');
      this.abrirModalIA();
    });

    // Modal Asistido IA: Cerrar
    document.getElementById('btn-cerrar-ia')?.addEventListener('click', () => {
      this.cerrarModal('modal-ia');
    });

    // Modal Asistido IA: Botón probar clasificación
    document.getElementById('btn-probar-ia')?.addEventListener('click', () => {
      this.procesarClasificacionIA();
    });

    // Modal Pausa: Botones de opciones
    document.querySelectorAll('.btn-opcion-pausa').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const motivo = e.currentTarget.dataset.motivo || 'Pausa Operativa';
        SmartOpsState.pausarLabor(motivo);
        this.cerrarModal('modal-pausa');
      });
    });
    document.getElementById('btn-cerrar-pausa')?.addEventListener('click', () => {
      this.cerrarModal('modal-pausa');
    });

    // Modal Finalizar: Confirmar cierre
    document.getElementById('btn-confirmar-finalizar')?.addEventListener('click', () => {
      SmartOpsState.finalizarOperacion();
      this.cerrarModal('modal-finalizar');
    });
    document.getElementById('btn-cancelar-finalizar')?.addEventListener('click', () => {
      this.cerrarModal('modal-finalizar');
    });

    // Modal Historial / Cola: Cerrar y Sincronizar
    document.getElementById('btn-cerrar-historial')?.addEventListener('click', () => {
      this.cerrarModal('modal-historial');
    });
    document.getElementById('btn-forzar-sync')?.addEventListener('click', () => {
      SmartOpsAPI.sincronizarCola();
    });
  },

  /**
   * Renderiza la cuadrícula de las 6 categorías oficiales de SuperBrix FO-A-MA-01
   */
  renderizarMatrizCausasRapidas() {
    const contenedor = document.getElementById('matriz-causas-rapidas');
    if (!contenedor) return;

    contenedor.innerHTML = SmartOpsConfig.CATEGORIAS_OFICIALES.map(cat => {
      // Filtrar causas rápidas asociadas a esta categoría
      const causas = SmartOpsConfig.CAUSAS_RAPIDAS.filter(c => c.categoriaId === cat.id);
      const causaPrincipal = causas[0] ? causas[0].titulo : cat.descripcion;
      const codigoCausa = causas[0] ? causas[0].codigo : 'PARO-GEN';

      return `
        <button 
          type="button"
          onclick="SmartOpsApp.seleccionarCausaParo('${cat.id}', '${causaPrincipal.replace(/'/g, "\\'")}', '${codigoCausa}')"
          class="btn-causa p-4 rounded-2xl flex flex-col justify-between text-left group">
          <div class="flex items-center justify-between w-full mb-2">
            <span class="text-xs font-mono font-bold px-2 py-0.5 rounded text-white shadow-sm" style="background-color: ${cat.color};">
              ${cat.id}
            </span>
            <i data-lucide="${cat.icono}" class="w-6 h-6 text-[#8C7164] group-hover:text-[#F97316] transition-colors"></i>
          </div>
          <div>
            <h4 class="font-extrabold text-[#1F1B17] text-base leading-tight">${cat.nombre}</h4>
            <p class="text-xs text-[#584237] mt-1 line-clamp-2">${causaPrincipal}</p>
          </div>
        </button>
      `;
    }).join('');

    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  /**
   * Ejecuta la selección de una causa directa de paro (en 1 toque)
   */
  seleccionarCausaParo(categoriaId, detalle, codigo) {
    this.darFeedbackTactil();
    this.emitirBeepIndustrial(300, 0.1);
    SmartOpsState.reportarNovedad(categoriaId, detalle, codigo);
    this.cerrarModal('modal-novedades');
  },

  /**
   * Procesa el análisis de texto con IA en el modal
   */
  procesarClasificacionIA() {
    const input = document.getElementById('textarea-ia-texto');
    const resultadoContainer = document.getElementById('ia-resultado-box');
    const categoriaTexto = document.getElementById('ia-categoria-resultado');
    const confianzaTexto = document.getElementById('ia-confianza-resultado');
    const explicacionTexto = document.getElementById('ia-explicacion-resultado');

    if (!input || !input.value.trim()) {
      SmartOpsAPI.mostrarNotificacion('Escriba una frase antes de analizar.', 'warning');
      return;
    }

    const texto = input.value.trim();
    const res = SmartOpsAPI.clasificarTextoConIA(texto);

    if (resultadoContainer) {
      resultadoContainer.classList.remove('hidden');
      if (categoriaTexto) categoriaTexto.textContent = `[${res.categoriaId}] ${res.categoriaNombre}`;
      if (confianzaTexto) confianzaTexto.textContent = `${res.confianza}%`;
      if (explicacionTexto) explicacionTexto.textContent = res.explicacion;
    }

    const btnAplicar = document.getElementById('btn-aplicar-ia');
    if (btnAplicar) {
      btnAplicar.onclick = () => {
        SmartOpsState.reportarNovedad(res.categoriaId, `[Asistido IA]: ${texto}`, 'IA-CLASIFICADO');
        this.cerrarModal('modal-ia');
        input.value = '';
        resultadoContainer?.classList.add('hidden');
      };
    }
  },

  /**
   * Configura listeners automáticos para online / offline
   */
  configurarMonitoreoRed() {
    const actualizarIndicador = () => {
      const isOnline = navigator.onLine;
      const dot = document.getElementById('network-led');
      const text = document.getElementById('network-status-label');

      if (isOnline) {
        if (dot) dot.className = 'w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981]';
        if (text) text.textContent = 'ONLINE';
      } else {
        if (dot) dot.className = 'w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_#EF4444] animate-pulse';
        if (text) text.textContent = 'OFFLINE';
      }
    };

    window.addEventListener('online', () => {
      console.log('[App] Conexión a internet reestablecida. Disparando sincronización de cola...');
      actualizarIndicador();
      SmartOpsAPI.mostrarNotificacion('Conexión reestablecida. Sincronizando eventos...', 'info');
      SmartOpsAPI.sincronizarCola();
    });

    window.addEventListener('offline', () => {
      console.warn('[App] Se perdió la conexión. Operando en modo Offline-First...');
      actualizarIndicador();
      SmartOpsAPI.mostrarNotificacion('Modo Offline: Los registros se guardarán en el terminal.', 'warning');
    });

    actualizarIndicador();
  },

  // Manejo de Modales
  abrirModalNovedad() {
    document.getElementById('modal-novedades')?.classList.remove('hidden');
  },
  abrirModalIA() {
    document.getElementById('modal-ia')?.classList.remove('hidden');
  },
  abrirModalPausa() {
    document.getElementById('modal-pausa')?.classList.remove('hidden');
  },
  abrirModalFinalizar() {
    const resTiempo = document.getElementById('resumen-tiempo-final');
    if (resTiempo) {
      resTiempo.textContent = SmartOpsState.formatearTiempo(SmartOpsState.tiempoTranscurridoSegundos);
    }
    document.getElementById('modal-finalizar')?.classList.remove('hidden');
  },
  abrirModalColaHistorial() {
    this.renderizarDetalleCola();
    document.getElementById('modal-historial')?.classList.remove('hidden');
  },
  cerrarModal(modalId) {
    document.getElementById(modalId)?.classList.add('hidden');
  },
  cerrarTodosLosModales() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
    SmartOpsScanner.detenerEscaner();
  },

  renderizarDetalleCola() {
    const colaList = document.getElementById('historial-cola-items');
    if (!colaList) return;

    const pendientes = SmartOpsStorage.obtenerColaPendiente();
    const historial = SmartOpsStorage.obtenerHistorial();

    if (pendientes.length === 0 && historial.length === 0) {
      colaList.innerHTML = `
        <div class="text-center py-8 text-[#8C7164]">
          <i data-lucide="inbox" class="w-10 h-10 mx-auto mb-2 text-[#C2410C]/40"></i>
          <p class="text-sm font-semibold">No hay eventos registrados en esta sesión.</p>
        </div>
      `;
    } else {
      let html = '';
      if (pendientes.length > 0) {
        html += `<div class="text-xs font-bold text-[#C2410C] uppercase tracking-wider mb-2">Pendientes de Sincronizar (${pendientes.length})</div>`;
        pendientes.forEach(p => {
          html += `
            <div class="p-3 mb-2 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs">
              <div class="flex justify-between font-mono font-bold text-[#92400E]">
                <span>${p.tipoEvento}</span>
                <span>${p.ordenProduccion}</span>
              </div>
              <div class="text-[#8C7164] mt-1 font-medium">${p.timestampISO ? new Date(p.timestampISO).toLocaleTimeString() : 'N/A'} - ${p.operario}</div>
            </div>
          `;
        });
      }

      if (historial.length > 0) {
        html += `<div class="text-xs font-bold text-[#8C7164] uppercase tracking-wider mt-4 mb-2">Últimos Eventos Locales</div>`;
        historial.slice(0, 10).forEach(h => {
          const syncColor = h.estadoSync === 'PENDIENTE' ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200';
          html += `
            <div class="p-2.5 mb-1.5 rounded-xl bg-[#FFF8F5] border border-[#EAE1DA] text-xs flex justify-between items-center">
              <div>
                <span class="font-extrabold text-[#1F1B17]">${h.tipoEvento}</span>
                <span class="text-[#8C7164] ml-2 font-mono">${h.ordenProduccion || ''}</span>
              </div>
              <span class="font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${syncColor}">${h.estadoSync || 'ENVIADO'}</span>
            </div>
          `;
        });
      }

      colaList.innerHTML = html;
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  // Feedback Sensorial
  darFeedbackTactil() {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(35);
      } catch (e) {
        // Ignorar si el navegador bloquea vibración
      }
    }
  },

  emitirBeepIndustrial(frecuencia = 440, duracion = 0.08) {
    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) this.audioCtx = new AudioContext();
      }
      if (!this.audioCtx) return;

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frecuencia, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duracion);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duracion);
    } catch (e) {
      // Ignorar si audio está silenciado por el navegador
    }
  }
};

window.SmartOpsApp = SmartOpsApp;

// Inicializar al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  SmartOpsApp.init();
});
