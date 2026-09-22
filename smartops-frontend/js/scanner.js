/**
 * SmartOps SuperBrix S.A. - Módulo de Visión y Escáner QR / Código de Barras
 * Integración con html5-qrcode con detención limpia de cámara y fallback demo
 */

const SmartOpsScanner = {
  html5QrCodeInstance: null,
  isScanning: false,

  /**
   * Inicializa la cámara y el visor de escaneo
   * @param {string} elementId - ID del contenedor HTML para la vista previa de video
   */
  async iniciarEscaner(elementId = 'qr-reader-container') {
    const contenedor = document.getElementById(elementId);
    if (!contenedor) {
      console.error('[Scanner] No se encontró el contenedor de escaneo:', elementId);
      return;
    }

    // Verificar si la biblioteca html5-qrcode está disponible
    if (typeof Html5Qrcode === 'undefined') {
      console.warn('[Scanner] Librería html5-qrcode no cargada. Utilice la selección de OPs de prueba.');
      const aviso = document.getElementById('camera-fallback-notice');
      if (aviso) aviso.classList.remove('hidden');
      return;
    }

    try {
      if (this.isScanning) {
        await this.detenerEscaner();
      }

      this.html5QrCodeInstance = new Html5Qrcode(elementId);
      this.isScanning = true;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      // Preferir cámara trasera del dispositivo móvil / tablet
      await this.html5QrCodeInstance.start(
        { facingMode: 'environment' },
        config,
        (decodedText, decodedResult) => {
          this.onScanExitoso(decodedText, decodedResult);
        },
        (errorMessage) => {
          // Errores menores de enfoque por frame (ignorar para no saturar consola)
        }
      );

      console.log('[Scanner] Cámara iniciada correctamente.');
    } catch (error) {
      console.warn('[Scanner] No se pudo acceder a la cámara (permiso denegado o sin soporte):', error);
      this.isScanning = false;
      const aviso = document.getElementById('camera-fallback-notice');
      if (aviso) aviso.classList.remove('hidden');
    }
  },

  /**
   * Detiene el flujo de la cámara de manera limpia
   */
  async detenerEscaner() {
    if (this.html5QrCodeInstance && this.isScanning) {
      try {
        await this.html5QrCodeInstance.stop();
        this.html5QrCodeInstance.clear();
        this.isScanning = false;
        console.log('[Scanner] Cámara detenida y recursos liberados.');
      } catch (error) {
        console.error('[Scanner] Error al detener la cámara:', error);
      }
    }
  },

  /**
   * Callback ejecutado al decodificar un código QR o de barras
   */
  onScanExitoso(decodedText) {
    if (!decodedText) return;

    // Feedback sonoro y táctil inmediato
    if (window.SmartOpsApp) {
      window.SmartOpsApp.darFeedbackTactil();
      window.SmartOpsApp.emitirBeepIndustrial(880, 0.1);
    }

    // Normalizar formato de OP (ej. '60211' -> 'OP-60211')
    let codigoLimpio = decodedText.trim().toUpperCase();
    if (!codigoLimpio.startsWith('OP-') && /^\d+$/.test(codigoLimpio)) {
      codigoLimpio = `OP-${codigoLimpio}`;
    }

    // Asignar OP a la máquina de estados
    SmartOpsState.asignarOP(codigoLimpio);

    // Detener la cámara y cerrar modal
    this.detenerEscaner();
    this.cerrarModalScanner();
  },

  /**
   * Permite seleccionar una OP demo sin necesidad de usar la cámara
   * @param {string} codigo
   */
  seleccionarOPDemo(codigo) {
    const orden = SmartOpsConfig.ORDENES_DEMO.find(o => o.codigo === codigo);
    if (orden) {
      SmartOpsState.asignarOP(orden);
    } else {
      SmartOpsState.asignarOP(codigo);
    }

    if (window.SmartOpsApp) {
      window.SmartOpsApp.darFeedbackTactil();
      window.SmartOpsApp.emitirBeepIndustrial(650, 0.08);
    }

    this.detenerEscaner();
    this.cerrarModalScanner();
  },

  /**
   * Procesa el ingreso manual de número de OP
   */
  procesarIngresoManual() {
    const input = document.getElementById('input-op-manual');
    if (!input || !input.value.trim()) {
      SmartOpsAPI.mostrarNotificacion('Ingrese un código de orden válido.', 'warning');
      return;
    }

    let val = input.value.trim().toUpperCase();
    if (!val.startsWith('OP-') && /^\d+$/.test(val)) {
      val = `OP-${val}`;
    }

    this.seleccionarOPDemo(val);
    input.value = '';
  },

  /**
   * Abre el modal del escáner y activa la cámara
   */
  abrirModalScanner() {
    const modal = document.getElementById('modal-scanner');
    if (modal) {
      modal.classList.remove('hidden');
      this.iniciarEscaner('qr-reader-container');
    }
  },

  /**
   * Cierra el modal y apaga el sensor de video
   */
  cerrarModalScanner() {
    const modal = document.getElementById('modal-scanner');
    if (modal) {
      modal.classList.add('hidden');
    }
    this.detenerEscaner();
  },

  /**
   * Renderiza la botonera de órdenes demo en el modal
   */
  renderizarBotonesDemo() {
    const container = document.getElementById('demo-ops-list');
    if (!container) return;

    container.innerHTML = SmartOpsConfig.ORDENES_DEMO.map(op => `
      <button 
        type="button" 
        onclick="SmartOpsScanner.seleccionarOPDemo('${op.codigo}')"
        class="w-full text-left p-3 rounded-xl bg-[#FFF8F5] hover:bg-[#FFF2EB] border border-[#EAE1DA] hover:border-[#F97316] transition-all flex items-center justify-between group active:scale-98">
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-[#C2410C] font-mono text-base">${op.codigo}</span>
            <span class="text-xs px-2 py-0.5 rounded font-mono font-bold bg-[#FFF2EB] text-[#C2410C] border border-[#FDBA74]">${op.plano}</span>
          </div>
          <p class="text-xs text-[#584237] mt-1 line-clamp-1">${op.descripcion}</p>
        </div>
        <i data-lucide="chevron-right" class="w-5 h-5 text-[#8C7164] group-hover:text-[#F97316] transition-colors"></i>
      </button>
    `).join('');

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }
};

window.SmartOpsScanner = SmartOpsScanner;
