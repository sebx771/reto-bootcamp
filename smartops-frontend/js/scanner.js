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

  _procesandoScan: false,

  /**
   * Callback al decodificar QR: extrae cédula del carné del operario
   */
  async onScanExitoso(decodedText) {
    if (!decodedText || this._procesandoScan) return;
    this._procesandoScan = true;

    // Intentar parsear JSON del carné { cedula, nombre, ct } o usar el texto directamente
    let cedula = decodedText.trim();
    try {
      const parsed = JSON.parse(cedula);
      cedula = String(parsed.cedula || parsed.id || parsed.operarioId || cedula);
    } catch (e) {}
    
    // Dejar solo los números de la cadena leída (limpiando caracteres invisibles o basura)
    cedula = cedula.replace(/\D/g, '');

    // Validar tamaño mínimo de la cédula
    if (!cedula || cedula.length < 5) {
      console.warn('[Scanner] Código inválido o ilegible:', decodedText);
      if (window.SmartOpsAPI && window.SmartOpsAPI.mostrarNotificacion) {
        window.SmartOpsAPI.mostrarNotificacion(`QR leído pero ignorado: "${decodedText}". No contiene una cédula válida.`, 'warning');
      }
      this._procesandoScan = false;
      return;
    }

    if (window.SmartOpsApp) {
      window.SmartOpsApp.darFeedbackTactil();
      window.SmartOpsApp.emitirBeepIndustrial(880, 0.1);
    }

    await this.detenerEscaner();
    
    // Llamar al endpoint
    await this._identificarOperarioPorCedula(cedula);
    
    this._procesandoScan = false;
  },

  /**
   * seleccionarOPDemo eliminado: el dropdown de OPs demo fue removido.
   * Las OPs se asignan exclusivamente mediante QR del taller.
   */
  seleccionarOPDemo(codigo) {
    console.warn('[Scanner] seleccionarOPDemo() ya no está disponible. Use el QR de taller.');
  },

  /**
   * Procesa el ingreso manual de cédula del operario
   */
  procesarIngresoManual() {
    const input = document.getElementById('input-op-manual');
    const cedula = input ? input.value.trim().replace(/\D/g, '') : '';
    if (!cedula || cedula.length < 5) {
      SmartOpsAPI.mostrarNotificacion('Ingrese un número de cédula válido (mín. 5 dígitos).', 'warning');
      return;
    }
    this._identificarOperarioPorCedula(cedula);
  },

  /**
   * Llama al API para verificar la cédula e identifica al operario en el estado
   */
  async _identificarOperarioPorCedula(cedula) {
    const banner = document.getElementById('scanner-resultado');
    const btnBuscar = document.getElementById('btn-confirmar-op-manual');
    if (banner) { banner.className = 'p-3 rounded-xl border text-xs mb-2 bg-[#FFF8F5] border-[#EAE1DA] text-[#584237]'; banner.textContent = 'Buscando operario...'; banner.classList.remove('hidden'); }
    if (btnBuscar) btnBuscar.disabled = true;

    try {
      const res = await SmartOpsAPI.verificarOperario(cedula);
      if (res && res.success && res.operario) {
        const op = res.operario;
        SmartOpsState.setOperarioActual({
          id: String(op.id || cedula),
          nombre: op.nombre,
          ctEmpleado: String(op.ctEmpleado || '')
        });
        if (banner) {
          banner.className = 'p-3 rounded-xl border text-xs mb-2 bg-emerald-50 border-emerald-300 text-emerald-800';
          banner.innerHTML = `✓ <strong>${op.nombre}</strong> (CC ${cedula}) identificado correctamente.`;
        }
        SmartOpsAPI.mostrarNotificacion(`Bienvenido, ${op.nombre}`, 'success');
        if (window.SmartOpsApp) window.SmartOpsApp.darFeedbackTactil();
        setTimeout(() => {
          this.cerrarModalScanner();
          // Si no hay CT-Operación seleccionado, indicarlo
          const ctSelect = document.getElementById('select-ct');
          if (ctSelect && !ctSelect.value) {
            SmartOpsAPI.mostrarNotificacion('Seleccione el CT-Operación y la OP para continuar.', 'info');
          }
        }, 1200);
      } else {
        const msg = (res && res.mensaje) ? res.mensaje : `Cédula ${cedula} no encontrada en la base de datos.`;
        if (banner) { banner.className = 'p-3 rounded-xl border text-xs mb-2 bg-red-50 border-red-300 text-red-700'; banner.textContent = msg; }
        SmartOpsAPI.mostrarNotificacion(msg, 'error');
      }
    } catch (err) {
      const msg = 'Error de conexión al verificar operario.';
      if (banner) { banner.className = 'p-3 rounded-xl border text-xs mb-2 bg-red-50 border-red-300 text-red-700'; banner.textContent = msg; }
      SmartOpsAPI.mostrarNotificacion(msg, 'error');
    } finally {
      if (btnBuscar) btnBuscar.disabled = false;
    }
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
   * renderizarBotonesDemo ya no aplica (OP se elige con dropdown externo)
   * Se mantiene para compatibilidad con app.js que lo llama en init.
   */
  renderizarBotonesDemo() {
    // no-op: el modal ahora pide al operario, no las OPs
  }
};

window.SmartOpsScanner = SmartOpsScanner;
