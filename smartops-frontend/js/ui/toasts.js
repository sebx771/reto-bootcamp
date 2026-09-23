/**
 * Toast UI
 * Encapsula las notificaciones visuales del operario.
 */

const SmartOpsToasts = {
  mostrarNotificacion(mensaje, tipo = 'info') {
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
      iconName = 'x-circle';
    }

    toast.className += ` ${bgColor} border`;
    toast.innerHTML = `
      <i data-lucide="${iconName}" class="w-5 h-5"></i>
      <span>${mensaje}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 2200);
  }
};

window.SmartOpsToasts = SmartOpsToasts;
