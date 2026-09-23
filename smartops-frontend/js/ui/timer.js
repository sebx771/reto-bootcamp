/**
 * Timer UI helper
 * Centraliza el cronómetro y el formato de tiempo visual.
 */

const SmartOpsTimer = {
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
  }
};

window.SmartOpsTimer = SmartOpsTimer;
