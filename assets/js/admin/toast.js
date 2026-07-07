let container = null;

function ensureContainer() {
    if (!container) {
        container = document.getElementById('toastContainer');
    }
    return container;
}

export function showToast(message, { type = 'info', duration = 4000 } = {}) {
    const host = ensureContainer();
    if (!host) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    host.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('toast-visible'));

    const remove = () => {
        toast.classList.remove('toast-visible');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    };

    const timer = setTimeout(remove, duration);
    toast.addEventListener('click', () => {
        clearTimeout(timer);
        remove();
    });
}

export function showSuccessToast(message) {
    showToast(message, { type: 'success' });
}

export function showErrorToast(message) {
    showToast(message, { type: 'error', duration: 6000 });
}

export function showInfoToast(message) {
    showToast(message, { type: 'info' });
}
