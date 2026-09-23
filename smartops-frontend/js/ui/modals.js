/**
 * Modales UI
 * Encapsula apertura/cierre y detalle de la cola para evitar lógica mezclada en app.js
 */

const SmartOpsModals = {
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
    document.querySelectorAll('.modal-backdrop').forEach((m) => m.classList.add('hidden'));
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
        pendientes.forEach((p) => {
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
        historial.slice(0, 10).forEach((h) => {
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
  }
};

window.SmartOpsModals = SmartOpsModals;
