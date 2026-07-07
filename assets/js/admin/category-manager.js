import { createCategory, renameCategory, deleteCategory, reorderCategories, resolveCloudinaryFolder } from '../services/categories-service.js';
import { confirmAction } from './confirm-dialog.js';
import { showErrorToast, showSuccessToast } from './toast.js';

let categories = [];
let artworks = [];
let sortableInstance = null;
let elements = {};

function artworkCountFor(categoryId) {
    return artworks.filter((item) => item.category === categoryId).length;
}

function render() {
    if (!elements.list) return;

    if (categories.length === 0) {
        elements.list.innerHTML = '';
        elements.emptyState?.classList.remove('hidden');
        return;
    }
    elements.emptyState?.classList.add('hidden');

    elements.list.innerHTML = categories
        .map(
            (category) => `
        <article class="category-row" data-id="${category.id}">
            <span class="drag-handle" title="Drag to reorder">⠿</span>
            <input type="text" class="category-name-input" data-id="${category.id}" value="${category.name}">
            <span class="category-meta">${artworkCountFor(category.id)} artwork${artworkCountFor(category.id) === 1 ? '' : 's'} · ${resolveCloudinaryFolder(category)}</span>
            <button class="button button-secondary category-delete" data-id="${category.id}">Delete</button>
        </article>
    `,
        )
        .join('');

    setupSortable();
}

function setupSortable() {
    sortableInstance?.destroy();
    sortableInstance = null;
    if (typeof window.Sortable === 'undefined' || !elements.list) return;

    sortableInstance = new window.Sortable(elements.list, {
        handle: '.drag-handle',
        animation: 150,
        onEnd: async () => {
            const orderedIds = [...elements.list.querySelectorAll('.category-row')].map((row) => row.dataset.id);
            try {
                await reorderCategories(orderedIds);
            } catch (error) {
                showErrorToast(`Couldn't save category order: ${error.message}`);
            }
        },
    });
}

async function handleCreate(event) {
    event.preventDefault();
    const name = elements.newNameInput.value.trim();
    if (!name) return;

    try {
        await createCategory(name, categories);
        showSuccessToast(`Category "${name}" created.`);
        elements.newNameInput.value = '';
    } catch (error) {
        showErrorToast(error.message);
    }
}

async function handleRename(id, newName) {
    const category = categories.find((entry) => entry.id === id);
    if (!category || category.name === newName.trim() || !newName.trim()) return;

    try {
        await renameCategory(id, newName);
        showSuccessToast('Category renamed.');
    } catch (error) {
        showErrorToast(error.message);
        render();
    }
}

async function handleDelete(id) {
    const category = categories.find((entry) => entry.id === id);
    if (!category) return;

    const count = artworkCountFor(id);
    if (count > 0) {
        showErrorToast(`"${category.name}" still has ${count} artwork${count === 1 ? '' : 's'}. Move or delete them first.`);
        return;
    }

    const confirmed = await confirmAction({
        title: 'Delete category?',
        message: `"${category.name}" will be permanently deleted.`,
        confirmLabel: 'Delete',
        danger: true,
    });
    if (!confirmed) return;

    try {
        await deleteCategory(id, artworks);
        showSuccessToast(`Deleted "${category.name}".`);
    } catch (error) {
        showErrorToast(error.message);
    }
}

export function updateCategoryManagerData(liveCategories) {
    categories = liveCategories;
    render();
}

export function updateCategoryManagerArtworks(liveArtworks) {
    artworks = liveArtworks;
    render();
}

export function initCategoryManager() {
    elements = {
        list: document.getElementById('categoryList'),
        emptyState: document.getElementById('categoryEmptyState'),
        createForm: document.getElementById('categoryCreateForm'),
        newNameInput: document.getElementById('categoryNewName'),
    };

    elements.createForm?.addEventListener('submit', handleCreate);

    elements.list?.addEventListener('click', (event) => {
        const button = event.target.closest('.category-delete');
        if (button) handleDelete(button.dataset.id);
    });

    elements.list?.addEventListener('change', (event) => {
        if (!event.target.classList.contains('category-name-input')) return;
        handleRename(event.target.dataset.id, event.target.value);
    });

    render();
}
