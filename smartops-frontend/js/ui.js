/**
 * SmartOps UI Renderer
 * Responsabilidad: renderizar el estado de la aplicación en el DOM.
 * No debe manejar lógica de negocio ni sincronización.
 */

const SmartOpsUI = {
  render(snapshot) {
    const statusTextEl = document.getElementById('status-text');
    const beaconEl = document.getElementById('status-beacon');
    const timerBox = document.getElementById('timer-box');
    const novedadBanner = document.getElementById('novedad-alert-banner');
    const novedadText = document.getElementById('novedad-banner-text');
    const btnIniciar = document.getElementById('btn-iniciar');
    const btnPausar = document.getElementById('btn-pausar');
    const btnNovedad = document.getElementById('btn-novedad');
    const btnFinalizar = document.getElementById('btn-finalizar');
    const timerDisplay = document.getElementById('cronometro-display');
    const opCodigoEl = document.getElementById('op-codigo-display');
    const opDescEl = document.getElementById('op-descripcion-display');
    const opPlanoEl = document.getElementById('op-plano-badge');

    if (beaconEl) beaconEl.className = 'beacon-dot';
    if (statusTextEl) statusTextEl.textContent = snapshot.estadoActual;

    if (snapshot.opActiva) {
      if (opCodigoEl) opCodigoEl.textContent = snapshot.opActiva.codigo;
      if (opDescEl) opDescEl.textContent = snapshot.opActiva.descripcion;
      if (opPlanoEl) {
        opPlanoEl.textContent = snapshot.opActiva.plano || '';
        opPlanoEl.classList.toggle('hidden', !snapshot.opActiva.plano);
      }
    } else {
      if (opCodigoEl) opCodigoEl.textContent = 'SIN OP ASIGNADA';
      if (opDescEl) opDescEl.textContent = 'Escanee el código de barras o seleccione una orden de prueba.';
      if (opPlanoEl) opPlanoEl.classList.add('hidden');
    }

    if (timerDisplay) {
      timerDisplay.textContent = SmartOpsState.formatearTiempo(snapshot.tiempoTranscurridoSegundos);
    }

    // Actualizar display del operario en el header (de solo lectura)
    if (window.SmartOpsApp && typeof window.SmartOpsApp.actualizarDisplayOperario === 'function') {
      window.SmartOpsApp.actualizarDisplayOperario(
        snapshot.operarioId
          ? { nombre: snapshot.operarioActual, id: snapshot.operarioId }
          : null
      );
    }

    switch (snapshot.estadoActual) {
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
          if (novedadText) novedadText.innerHTML = `<div class="text-xs"><strong>PAUSA ACTIVA:</strong> ${snapshot.motivoPausa || 'Labor suspendida temporalmente'}</div><div id="pausa-cronometro-display" class="font-mono font-black text-3xl mt-1 text-[#D97706]">00:00:00</div>`;
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
            novedadText.innerHTML = `<div class="text-xs"><strong>PARO [${snapshot.novedadActiva?.categoriaId || 'NOVEDAD'}]:</strong> ${snapshot.novedadActiva?.detalleCausa || 'Máquina detenida'}</div><div id="pausa-cronometro-display" class="font-mono font-black text-3xl mt-1 text-[#DC2626]">00:00:00</div>`;
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
        // Requiere OP + operario verificado + CT seleccionado para habilitar
        const puedeIniciar = !!snapshot.opActiva && !!snapshot.operarioId;
        if (btnIniciar) {
          btnIniciar.disabled = !puedeIniciar;
          btnIniciar.innerHTML = '<i data-lucide="play-circle" class="w-7 h-7"></i><span>INICIAR LABOR</span>';
        }
        if (btnPausar) btnPausar.disabled = true;
        if (btnNovedad) btnNovedad.disabled = !snapshot.opActiva;
        if (btnFinalizar) btnFinalizar.disabled = true;
        break;
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }
};

window.SmartOpsUI = SmartOpsUI;
