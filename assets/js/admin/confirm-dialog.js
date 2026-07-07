let backdrop = null;
let titleEl = null;
let messageEl = null;
let confirmBtn = null;
let cancelBtn = null;

function ensureElements() {
    if (backdrop) return;
    backdrop = document.getElementById('confirmDialog');
    titleEl = document.getElementById('confirmDialogTitle');
    messageEl = document.getElementById('confirmDialogMessage');
    confirmBtn = document.getElementById('confirmDialogConfirm');
    cancelBtn = document.getElementById('confirmDialogCancel');
}

export function isConfirmDialogOpen() {
    return Boolean(backdrop && !backdrop.classList.contains('hidden'));
}

/**
 * Shows a confirmation modal and resolves true/false with the user's choice.
 * Falls back to window.confirm if the dialog markup isn't present (defensive only).
 */
export function confirmAction({ title = 'Are you sure?', message = '', confirmLabel = 'Confirm', danger = false } = {}) {
    ensureElements();
    if (!backdrop) {
        return Promise.resolve(window.confirm(message || title));
    }

    return new Promise((resolve) => {
        titleEl.textContent = title;
        messageEl.textContent = message;
        confirmBtn.textContent = confirmLabel;
        confirmBtn.classList.toggle('button-danger', danger);
        backdrop.classList.remove('hidden');
        document.body.classList.add('no-scroll');

        const cleanup = (result) => {
            backdrop.classList.add('hidden');
            document.body.classList.remove('no-scroll');
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
            backdrop.removeEventListener('click', onBackdropClick);
            document.removeEventListener('keydown', onKeydown);
            resolve(result);
        };

        const onConfirm = () => cleanup(true);
        const onCancel = () => cleanup(false);
        const onBackdropClick = (event) => {
            if (event.target === backdrop) cleanup(false);
        };
        const onKeydown = (event) => {
            if (event.key === 'Escape') cleanup(false);
        };

        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
        backdrop.addEventListener('click', onBackdropClick);
        document.addEventListener('keydown', onKeydown);
    });
}
