import { uploadToCloudinary, isCloudinaryConfigured, UploadAbortedError } from '../services/cloudinary-service.js';
import { createArtwork } from '../services/artworks-service.js';
import { resolveCloudinaryFolder } from '../services/categories-service.js';
import { showErrorToast, showSuccessToast } from './toast.js';

let queue = [];
let categories = [];
let dropzone;
let fileInput;
let queueList;
let sharedCategorySelect;
let clearCompletedButton;

function titleFromFilename(filename) {
    const withoutExt = filename.replace(/\.[^./]+$/, '');
    const spaced = withoutExt.replace(/[-_]+/g, ' ').trim();
    const titled = spaced.replace(/\b\w/g, (char) => char.toUpperCase());
    return titled || 'Untitled artwork';
}

function renderQueue() {
    if (!queueList) return;

    if (queue.length === 0) {
        queueList.innerHTML = '<p class="empty-state-inline">No files queued. Drag images or videos here, or use the file picker.</p>';
        clearCompletedButton?.classList.add('hidden');
        return;
    }

    clearCompletedButton?.classList.toggle('hidden', !queue.some((item) => item.status === 'success'));

    queueList.innerHTML = queue
        .map((item) => {
            const preview =
                item.resourceType === 'video'
                    ? `<video class="upload-preview" src="${item.previewUrl}" muted playsinline></video>`
                    : `<img class="upload-preview" src="${item.previewUrl}" alt="">`;

            const categoryOptions = categories
                .map((category) => `<option value="${category.id}" ${category.id === item.category ? 'selected' : ''}>${category.name}</option>`)
                .join('');

            const statusLabel = {
                queued: 'Queued',
                uploading: `Uploading… ${item.progress}%`,
                success: 'Uploaded',
                error: `Failed: ${item.errorMessage || 'Unknown error'}`,
                cancelled: 'Cancelled',
            }[item.status];

            const actions = [];
            if (item.status === 'queued') {
                actions.push(`<button class="button button-secondary upload-start" data-id="${item.id}">Upload</button>`);
                actions.push(`<button class="button button-secondary upload-remove" data-id="${item.id}">Remove</button>`);
            } else if (item.status === 'uploading') {
                actions.push(`<button class="button button-secondary upload-cancel" data-id="${item.id}">Cancel</button>`);
            } else if (item.status === 'error' || item.status === 'cancelled') {
                actions.push(`<button class="button button-secondary upload-retry" data-id="${item.id}">Retry</button>`);
                actions.push(`<button class="button button-secondary upload-remove" data-id="${item.id}">Remove</button>`);
            } else if (item.status === 'success') {
                actions.push(`<button class="button button-secondary upload-remove" data-id="${item.id}">Clear</button>`);
            }

            return `
                <article class="upload-queue-item upload-status-${item.status}" data-id="${item.id}">
                    ${preview}
                    <div class="upload-queue-meta">
                        <input type="text" class="upload-title-input" data-id="${item.id}" value="${item.title}" ${item.status !== 'queued' ? 'disabled' : ''}>
                        <select class="upload-category-select" data-id="${item.id}" ${item.status !== 'queued' ? 'disabled' : ''}>${categoryOptions}</select>
                        <div class="upload-progress-track"><div class="upload-progress-fill" style="width:${item.progress}%"></div></div>
                        <p class="upload-status-label">${statusLabel}</p>
                    </div>
                    <div class="upload-queue-actions">${actions.join('')}</div>
                </article>
            `;
        })
        .join('');
}

function addFiles(fileList) {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'));
    if (files.length === 0) return;

    const defaultCategory = sharedCategorySelect?.value || categories[0]?.id || '';

    files.forEach((file) => {
        queue.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            file,
            title: titleFromFilename(file.name),
            category: defaultCategory,
            resourceType: file.type.startsWith('video/') ? 'video' : 'image',
            previewUrl: URL.createObjectURL(file),
            status: 'queued',
            progress: 0,
            errorMessage: null,
            xhrCancel: null,
        });
    });

    renderQueue();
}

async function startUpload(item) {
    if (!isCloudinaryConfigured()) {
        showErrorToast('Cloudinary upload preset is not configured yet.');
        return;
    }

    const category = categories.find((entry) => entry.id === item.category);
    if (!category) {
        showErrorToast('Choose a category before uploading.');
        return;
    }

    item.status = 'uploading';
    item.progress = 0;
    renderQueue();

    const folder = resolveCloudinaryFolder(category);
    const { promise, cancel } = uploadToCloudinary({
        file: item.file,
        folder,
        title: item.title,
        category: item.category,
        resourceType: item.resourceType,
        onProgress: (progress) => {
            item.progress = progress;
            renderQueue();
        },
    });
    item.xhrCancel = cancel;

    try {
        const result = await promise;
        await createArtwork({
            category: item.category,
            title: item.title,
            medium: 'Unknown medium',
            year: String(new Date().getFullYear()),
            description: 'New artwork entry — edit details in the Artworks table.',
            image: result.secureUrl,
            resourceType: result.resourceType,
            publicId: result.publicId,
            featured: false,
            sold: false,
            hidden: false,
        });
        item.status = 'success';
        showSuccessToast(`"${item.title}" uploaded and published.`);
    } catch (error) {
        item.status = error instanceof UploadAbortedError ? 'cancelled' : 'error';
        item.errorMessage = error instanceof UploadAbortedError ? null : error.message;
        if (item.status === 'error') showErrorToast(`Upload failed for "${item.title}": ${error.message}`);
    } finally {
        item.xhrCancel = null;
        renderQueue();
    }
}

function removeItem(id) {
    const item = queue.find((entry) => entry.id === id);
    if (item) URL.revokeObjectURL(item.previewUrl);
    queue = queue.filter((entry) => entry.id !== id);
    renderQueue();
}

export function updateUploadManagerCategories(liveCategories) {
    categories = liveCategories;
    if (sharedCategorySelect) {
        const previousValue = sharedCategorySelect.value;
        sharedCategorySelect.innerHTML = categories.map((category) => `<option value="${category.id}">${category.name}</option>`).join('');
        if (categories.some((category) => category.id === previousValue)) {
            sharedCategorySelect.value = previousValue;
        }
    }
    renderQueue();
}

export function initUploadManager() {
    dropzone = document.getElementById('uploadDropzone');
    fileInput = document.getElementById('uploadFileInput');
    queueList = document.getElementById('uploadQueue');
    sharedCategorySelect = document.getElementById('uploadDefaultCategory');
    clearCompletedButton = document.getElementById('uploadClearCompleted');

    dropzone?.addEventListener('click', () => fileInput?.click());
    dropzone?.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropzone.classList.add('dropzone-active');
    });
    dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dropzone-active'));
    dropzone?.addEventListener('drop', (event) => {
        event.preventDefault();
        dropzone.classList.remove('dropzone-active');
        addFiles(event.dataTransfer.files);
    });

    fileInput?.addEventListener('change', () => {
        addFiles(fileInput.files);
        fileInput.value = '';
    });

    clearCompletedButton?.addEventListener('click', () => {
        queue.filter((item) => item.status === 'success').forEach((item) => URL.revokeObjectURL(item.previewUrl));
        queue = queue.filter((item) => item.status !== 'success');
        renderQueue();
    });

    queueList?.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        const id = button.dataset.id;
        const item = queue.find((entry) => entry.id === id);
        if (!item) return;

        if (button.classList.contains('upload-start')) startUpload(item);
        else if (button.classList.contains('upload-cancel')) item.xhrCancel?.();
        else if (button.classList.contains('upload-retry')) startUpload(item);
        else if (button.classList.contains('upload-remove')) removeItem(id);
    });

    queueList?.addEventListener('input', (event) => {
        const id = event.target.dataset.id;
        const item = queue.find((entry) => entry.id === id);
        if (!item) return;

        if (event.target.classList.contains('upload-title-input')) item.title = event.target.value;
        else if (event.target.classList.contains('upload-category-select')) item.category = event.target.value;
    });

    renderQueue();
}
