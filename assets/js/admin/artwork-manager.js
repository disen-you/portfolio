import {
    updateArtwork,
    deleteArtwork,
    duplicateArtwork,
    setFeaturedArtwork,
    unfeatureArtwork,
    changeArtworkCategory,
    reorderCategoryArtworks,
    bulkDelete,
    bulkSetHidden,
    bulkSetSold,
    bulkChangeCategory,
} from '../services/artworks-service.js';
import { confirmAction, isConfirmDialogOpen } from './confirm-dialog.js';
import { showErrorToast, showSuccessToast, showInfoToast } from './toast.js';

let artworks = [];
let categories = [];
let selectedIds = new Set();
let filters = { search: '', category: 'all', year: 'all', sold: 'all', hidden: 'all' };
let sortMode = 'manual';
let editingId = null;
let autosaveTimer = null;
let sortableInstance = null;

let elements = {};

function categoryName(categoryId) {
    return categories.find((category) => category.id === categoryId)?.name || categoryId;
}

function itemsInCategory(categoryId) {
    return artworks.filter((item) => item.category === categoryId);
}

function toMillis(timestamp) {
    return timestamp?.toMillis?.() ?? 0;
}

function getFilteredSortedArtworks() {
    const searchTerm = filters.search.trim().toLowerCase();

    let result = artworks.filter((item) => {
        if (searchTerm && !item.title.toLowerCase().includes(searchTerm)) return false;
        if (filters.category !== 'all' && item.category !== filters.category) return false;
        if (filters.year !== 'all' && String(item.year) !== filters.year) return false;
        if (filters.sold !== 'all' && String(item.sold) !== filters.sold) return false;
        if (filters.hidden !== 'all' && String(item.hidden) !== filters.hidden) return false;
        return true;
    });

    result = result.slice();
    switch (sortMode) {
        case 'newest':
            result.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
            break;
        case 'oldest':
            result.sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));
            break;
        case 'updated':
            result.sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));
            break;
        case 'alphabetical':
            result.sort((a, b) => a.title.localeCompare(b.title));
            break;
        default:
            result.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    return result;
}

function isDragReorderEnabled() {
    return sortMode === 'manual' && filters.category !== 'all' && !filters.search;
}

function renderYearFilterOptions() {
    if (!elements.yearFilter) return;
    const previousValue = elements.yearFilter.value;
    const years = [...new Set(artworks.map((item) => String(item.year)))].sort((a, b) => b.localeCompare(a));
    elements.yearFilter.innerHTML =
        '<option value="all">All years</option>' + years.map((year) => `<option value="${year}">${year}</option>`).join('');
    if (years.includes(previousValue)) elements.yearFilter.value = previousValue;
}

function renderCategoryFilterOptions() {
    [elements.categoryFilter, elements.bulkMoveSelect, elements.editCategorySelect].forEach((select) => {
        if (!select) return;
        const previousValue = select.value;
        const includeAll = select === elements.categoryFilter;
        select.innerHTML =
            (includeAll ? '<option value="all">All categories</option>' : '') +
            categories.map((category) => `<option value="${category.id}">${category.name}</option>`).join('');
        if ([...select.options].some((option) => option.value === previousValue)) {
            select.value = previousValue;
        }
    });
}

function renderBulkToolbar() {
    if (!elements.bulkToolbar) return;
    elements.bulkToolbar.classList.toggle('hidden', selectedIds.size === 0);
    if (elements.bulkCount) elements.bulkCount.textContent = `${selectedIds.size} selected`;
}

function renderTable() {
    if (!elements.tableBody) return;
    const visible = getFilteredSortedArtworks();

    if (artworks.length === 0) {
        elements.tableBody.innerHTML = '';
        elements.emptyState?.classList.remove('hidden');
        elements.emptyState.textContent = 'No artworks yet — upload your first piece to get started.';
        destroySortable();
        return;
    }

    if (visible.length === 0) {
        elements.tableBody.innerHTML = '';
        elements.emptyState?.classList.remove('hidden');
        elements.emptyState.textContent = 'No artworks match your search or filters.';
        destroySortable();
        return;
    }

    elements.emptyState?.classList.add('hidden');
    const dragEnabled = isDragReorderEnabled();

    elements.tableBody.innerHTML = visible
        .map((item) => {
            const badges = [
                item.featured ? '<span class="badge badge-featured">Featured</span>' : '',
                item.sold ? '<span class="badge badge-sold">Sold</span>' : '',
                item.hidden ? '<span class="badge badge-hidden">Hidden</span>' : '',
                item.resourceType === 'video' ? '<span class="badge badge-video">Video</span>' : '',
            ].join('');

            return `
                <tr data-id="${item.id}" class="${selectedIds.has(item.id) ? 'row-selected' : ''}">
                    <td class="cell-drag">${dragEnabled ? '<span class="drag-handle" title="Drag to reorder">⠿</span>' : ''}</td>
                    <td class="cell-select"><input type="checkbox" class="row-select" data-id="${item.id}" ${selectedIds.has(item.id) ? 'checked' : ''}></td>
                    <td class="cell-thumb"><img src="${item.image}" alt="" loading="lazy"></td>
                    <td class="cell-title">
                        <strong>${item.title}</strong>
                        <div class="cell-badges">${badges}</div>
                    </td>
                    <td>${categoryName(item.category)}</td>
                    <td>${item.year}</td>
                    <td class="cell-actions">
                        <button class="row-action" data-action="edit" data-id="${item.id}">Edit</button>
                        <button class="row-action" data-action="duplicate" data-id="${item.id}">Duplicate</button>
                        <button class="row-action" data-action="feature" data-id="${item.id}">${item.featured ? 'Unfeature' : 'Feature'}</button>
                        <button class="row-action" data-action="hidden" data-id="${item.id}">${item.hidden ? 'Publish' : 'Hide'}</button>
                        <button class="row-action" data-action="sold" data-id="${item.id}">${item.sold ? 'Remove sold' : 'Mark sold'}</button>
                        <button class="row-action row-action-danger" data-action="delete" data-id="${item.id}">Delete</button>
                    </td>
                </tr>
            `;
        })
        .join('');

    if (elements.selectAll) {
        const visibleIds = visible.map((item) => item.id);
        elements.selectAll.checked = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
    }

    setupSortable(dragEnabled);
}

function destroySortable() {
    sortableInstance?.destroy();
    sortableInstance = null;
}

function setupSortable(enabled) {
    destroySortable();
    if (!enabled || typeof window.Sortable === 'undefined' || !elements.tableBody) return;

    sortableInstance = new window.Sortable(elements.tableBody, {
        handle: '.drag-handle',
        animation: 150,
        onEnd: async () => {
            const orderedIds = [...elements.tableBody.querySelectorAll('tr')].map((row) => row.dataset.id);
            try {
                await reorderCategoryArtworks(orderedIds);
            } catch (error) {
                showErrorToast(`Couldn't save the new order: ${error.message}`);
            }
        },
    });
}

function renderAll() {
    renderYearFilterOptions();
    renderCategoryFilterOptions();
    renderBulkToolbar();
    renderTable();
}

// --- Edit modal -------------------------------------------------------

function openEditModal(id) {
    const item = artworks.find((entry) => entry.id === id);
    if (!item) return;
    editingId = id;

    elements.editTitle.value = item.title;
    elements.editMedium.value = item.medium || '';
    elements.editYear.value = item.year || '';
    elements.editDescription.value = item.description || '';
    elements.editCategorySelect.value = item.category;
    elements.editFeatured.checked = Boolean(item.featured);
    elements.editSaveStatus.textContent = '';

    elements.editModal.classList.remove('hidden');
    document.body.classList.add('no-scroll');
}

function closeEditModal() {
    editingId = null;
    clearTimeout(autosaveTimer);
    elements.editModal?.classList.add('hidden');
    document.body.classList.remove('no-scroll');
}

function scheduleAutosave() {
    if (!editingId) return;
    clearTimeout(autosaveTimer);
    elements.editSaveStatus.textContent = 'Saving…';
    autosaveTimer = setTimeout(() => flushAutosave(), 600);
}

async function flushAutosave() {
    if (!editingId) return;
    clearTimeout(autosaveTimer);
    const id = editingId;

    try {
        await updateArtwork(id, {
            title: elements.editTitle.value.trim() || 'Untitled artwork',
            medium: elements.editMedium.value.trim() || 'Unknown medium',
            year: elements.editYear.value.trim() || String(new Date().getFullYear()),
            description: elements.editDescription.value.trim(),
        });
        if (editingId === id) elements.editSaveStatus.textContent = 'Saved';
    } catch (error) {
        if (editingId === id) elements.editSaveStatus.textContent = `Save failed: ${error.message}`;
    }
}

async function handleEditCategoryChange() {
    if (!editingId) return;
    const newCategoryId = elements.editCategorySelect.value;
    try {
        await changeArtworkCategory(editingId, newCategoryId);
        elements.editFeatured.checked = false;
        showInfoToast('Category changed. The artwork is no longer featured (it moved out of its old category).');
    } catch (error) {
        showErrorToast(`Couldn't change category: ${error.message}`);
    }
}

async function handleEditFeaturedToggle() {
    if (!editingId) return;
    const item = artworks.find((entry) => entry.id === editingId);
    if (!item) return;

    try {
        if (elements.editFeatured.checked) {
            await setFeaturedArtwork(itemsInCategory(item.category), editingId);
            showSuccessToast('Set as the featured artwork for this category.');
        } else {
            await unfeatureArtwork(editingId);
        }
    } catch (error) {
        showErrorToast(`Couldn't update featured status: ${error.message}`);
    }
}

// --- Row + bulk actions -----------------------------------------------

async function handleRowAction(action, id) {
    const item = artworks.find((entry) => entry.id === id);
    if (!item) return;

    try {
        if (action === 'edit') {
            openEditModal(id);
        } else if (action === 'duplicate') {
            await duplicateArtwork(item);
            showSuccessToast(`Duplicated "${item.title}".`);
        } else if (action === 'feature') {
            if (item.featured) {
                await unfeatureArtwork(id);
            } else {
                await setFeaturedArtwork(itemsInCategory(item.category), id);
                showSuccessToast(`"${item.title}" is now featured in ${categoryName(item.category)}.`);
            }
        } else if (action === 'hidden') {
            await bulkSetHidden([id], !item.hidden);
        } else if (action === 'sold') {
            await bulkSetSold([id], !item.sold);
        } else if (action === 'delete') {
            const confirmed = await confirmAction({
                title: 'Delete artwork?',
                message: `"${item.title}" will be permanently deleted. This can't be undone.`,
                confirmLabel: 'Delete',
                danger: true,
            });
            if (confirmed) {
                await deleteArtwork(id);
                selectedIds.delete(id);
                showSuccessToast(`Deleted "${item.title}".`);
            }
        }
    } catch (error) {
        showErrorToast(error.message);
    }
}

async function handleBulkDelete() {
    const confirmed = await confirmAction({
        title: `Delete ${selectedIds.size} artworks?`,
        message: 'This will permanently delete every selected artwork. This can\'t be undone.',
        confirmLabel: 'Delete all',
        danger: true,
    });
    if (!confirmed) return;

    try {
        await bulkDelete([...selectedIds]);
        showSuccessToast(`Deleted ${selectedIds.size} artworks.`);
        selectedIds.clear();
        renderAll();
    } catch (error) {
        showErrorToast(error.message);
    }
}

async function handleBulkHide(hidden) {
    try {
        await bulkSetHidden([...selectedIds], hidden);
        showSuccessToast(hidden ? 'Selected artworks hidden.' : 'Selected artworks published.');
    } catch (error) {
        showErrorToast(error.message);
    }
}

async function handleBulkMove() {
    const targetCategory = elements.bulkMoveSelect?.value;
    if (!targetCategory) return;
    try {
        await bulkChangeCategory([...selectedIds], targetCategory);
        showSuccessToast(`Moved ${selectedIds.size} artworks to ${categoryName(targetCategory)}.`);
        selectedIds.clear();
        renderAll();
    } catch (error) {
        showErrorToast(error.message);
    }
}

// --- Keyboard shortcuts -------------------------------------------------

function isTypingInField() {
    const tag = document.activeElement?.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function handleKeydown(event) {
    if (event.key === '/' && !isTypingInField()) {
        event.preventDefault();
        elements.searchInput?.focus();
        return;
    }

    if (event.key === 'Escape' && !isConfirmDialogOpen() && editingId) {
        closeEditModal();
        return;
    }

    if ((event.key === 'Delete' || event.key === 'Backspace') && !isTypingInField() && selectedIds.size > 0 && !editingId) {
        event.preventDefault();
        handleBulkDelete();
        return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's' && editingId) {
        event.preventDefault();
        flushAutosave();
    }
}

// --- Public API ----------------------------------------------------------

export function updateArtworkManagerData(liveArtworks) {
    artworks = liveArtworks;
    selectedIds = new Set([...selectedIds].filter((id) => artworks.some((item) => item.id === id)));
    renderAll();
}

export function updateArtworkManagerCategories(liveCategories) {
    categories = liveCategories;
    renderAll();
}

export function initArtworkManager() {
    elements = {
        searchInput: document.getElementById('artworkSearch'),
        categoryFilter: document.getElementById('artworkFilterCategory'),
        yearFilter: document.getElementById('artworkFilterYear'),
        soldFilter: document.getElementById('artworkFilterSold'),
        hiddenFilter: document.getElementById('artworkFilterHidden'),
        sortSelect: document.getElementById('artworkSort'),
        tableBody: document.getElementById('artworkTableBody'),
        emptyState: document.getElementById('artworkEmptyState'),
        selectAll: document.getElementById('artworkSelectAll'),
        bulkToolbar: document.getElementById('bulkToolbar'),
        bulkCount: document.getElementById('bulkCount'),
        bulkMoveSelect: document.getElementById('bulkMoveSelect'),
        editModal: document.getElementById('artworkEditModal'),
        editTitle: document.getElementById('editTitle'),
        editMedium: document.getElementById('editMedium'),
        editYear: document.getElementById('editYear'),
        editDescription: document.getElementById('editDescription'),
        editCategorySelect: document.getElementById('editCategory'),
        editFeatured: document.getElementById('editFeatured'),
        editSaveStatus: document.getElementById('editSaveStatus'),
        editClose: document.getElementById('editClose'),
    };

    elements.searchInput?.addEventListener('input', (event) => {
        filters.search = event.target.value;
        renderTable();
    });
    elements.categoryFilter?.addEventListener('change', (event) => {
        filters.category = event.target.value;
        renderTable();
    });
    elements.yearFilter?.addEventListener('change', (event) => {
        filters.year = event.target.value;
        renderTable();
    });
    elements.soldFilter?.addEventListener('change', (event) => {
        filters.sold = event.target.value;
        renderTable();
    });
    elements.hiddenFilter?.addEventListener('change', (event) => {
        filters.hidden = event.target.value;
        renderTable();
    });
    elements.sortSelect?.addEventListener('change', (event) => {
        sortMode = event.target.value;
        renderTable();
    });

    elements.selectAll?.addEventListener('change', () => {
        const visibleIds = getFilteredSortedArtworks().map((item) => item.id);
        if (elements.selectAll.checked) {
            visibleIds.forEach((id) => selectedIds.add(id));
        } else {
            visibleIds.forEach((id) => selectedIds.delete(id));
        }
        renderAll();
    });

    elements.tableBody?.addEventListener('change', (event) => {
        if (!event.target.classList.contains('row-select')) return;
        const id = event.target.dataset.id;
        if (event.target.checked) selectedIds.add(id);
        else selectedIds.delete(id);
        renderBulkToolbar();
        renderTable();
    });

    elements.tableBody?.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        handleRowAction(button.dataset.action, button.dataset.id);
    });

    document.getElementById('bulkDelete')?.addEventListener('click', handleBulkDelete);
    document.getElementById('bulkHide')?.addEventListener('click', () => handleBulkHide(true));
    document.getElementById('bulkPublish')?.addEventListener('click', () => handleBulkHide(false));
    document.getElementById('bulkMoveButton')?.addEventListener('click', handleBulkMove);

    elements.editClose?.addEventListener('click', closeEditModal);
    elements.editModal?.addEventListener('click', (event) => {
        if (event.target === elements.editModal) closeEditModal();
    });
    [elements.editTitle, elements.editMedium, elements.editYear, elements.editDescription].forEach((field) => {
        field?.addEventListener('input', scheduleAutosave);
    });
    elements.editCategorySelect?.addEventListener('change', handleEditCategoryChange);
    elements.editFeatured?.addEventListener('change', handleEditFeaturedToggle);

    document.addEventListener('keydown', handleKeydown);

    renderAll();
}
