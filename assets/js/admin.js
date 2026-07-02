const adminStorageKey = storageKey;
const adminFeaturedKey = featuredKey;
let galleryData = getSavedGalleryData();
let featuredIndex = getSavedFeaturedIndex();
let activeCategory = Object.keys(defaultCategoryNames)[0];

const adminCategorySelect = document.getElementById('adminCategory');
const adminManageCategory = document.getElementById('adminManageCategory');
const adminArtworkList = document.getElementById('adminArtworkList');
const adminFeaturedSelect = document.getElementById('adminFeaturedSelect');
const adminSetFeatured = document.getElementById('adminSetFeatured');
const adminUploadButton = document.getElementById('adminSave');
const adminUploadStatus = document.getElementById('adminUploadStatus');
const adminCloudName = document.getElementById('adminCloudName');
const adminUploadPreset = document.getElementById('adminUploadPreset');
const adminImageFile = document.getElementById('adminImageFile');
const adminCloudUpload = document.getElementById('adminCloudUpload');
const adminCloudUploadStatus = document.getElementById('adminCloudUploadStatus');
const adminManageStatus = document.getElementById('adminManageStatus');

let cloudinaryImageUrl = '';

function renderCategoryOptions() {
    const categoryKeys = Object.keys(defaultCategoryNames);
    categoryKeys.forEach((key) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = defaultCategoryNames[key];
        adminCategorySelect.appendChild(option);
    });
}

function renderManageCategoryOptions() {
    const categoryKeys = Object.keys(defaultCategoryNames);
    categoryKeys.forEach((key) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = defaultCategoryNames[key];
        adminManageCategory.appendChild(option);
    });
}

function renderFeaturedOptions() {
    adminFeaturedSelect.innerHTML = '';
    galleryData.forEach((item, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = `${item.title} (${defaultCategoryNames[item.category]})`;
        if (index === featuredIndex) option.selected = true;
        adminFeaturedSelect.appendChild(option);
    });
}

function getItemsForCategory(category) {
    return galleryData
        .map((item, index) => ({ item, index }))
        .filter((entry) => entry.item.category === category);
}

function renderArtworkList(category) {
    adminArtworkList.innerHTML = '';
    const items = getItemsForCategory(category);
    if (items.length === 0) {
        adminArtworkList.innerHTML = '<p class="form-note">No artwork currently in this category.</p>';
        return;
    }

    items.forEach(({ item, index }, position) => {
        const row = document.createElement('div');
        row.className = 'admin-item-row';
        row.innerHTML = `
            <div class="admin-item-meta">
                <strong>${item.title}</strong>
                <span>${item.medium} · ${item.year}</span>
                <small>${item.image}</small>
                ${index === featuredIndex ? '<span class="admin-featured-label">Featured</span>' : ''}
            </div>
            <div class="admin-item-actions">
                <button class="button button-secondary admin-delete" data-index="${index}">Delete</button>
                <button class="button button-secondary admin-move-up" data-index="${index}" ${position === 0 ? 'disabled' : ''}>Up</button>
                <button class="button button-secondary admin-move-down" data-index="${index}" ${position === items.length - 1 ? 'disabled' : ''}>Down</button>
                <button class="button button-secondary admin-feature" data-index="${index}">Feature</button>
            </div>
        `;
        adminArtworkList.appendChild(row);
    });
}

function setFeatured(index) {
    if (!Number.isInteger(index) || index < 0 || index >= galleryData.length) {
        return;
    }
    featuredIndex = index;
    saveGalleryData(galleryData);
    saveFeaturedIndex(featuredIndex);
    renderFeaturedOptions();
    renderArtworkList(activeCategory);
    adminManageStatus.textContent = 'Featured artwork updated.';
    adminManageStatus.style.color = 'var(--royal)';
}

function moveArtwork(index, direction) {
    const category = galleryData[index].category;
    const categoryItems = getItemsForCategory(category).map((entry) => entry.index);
    const position = categoryItems.indexOf(index);
    const swapPosition = position + direction;
    if (swapPosition < 0 || swapPosition >= categoryItems.length) return;
    const targetIndex = categoryItems[swapPosition];

    [galleryData[index], galleryData[targetIndex]] = [galleryData[targetIndex], galleryData[index]];
    saveGalleryData(galleryData);
    renderArtworkList(activeCategory);
    adminManageStatus.textContent = 'Artwork order updated.';
    adminManageStatus.style.color = 'var(--royal)';
}

function deleteArtwork(index) {
    const wasFeatured = index === featuredIndex;
    galleryData.splice(index, 1);
    if (wasFeatured) {
        featuredIndex = 0;
    } else if (featuredIndex > index) {
        featuredIndex -= 1;
    }
    saveGalleryData(galleryData);
    saveFeaturedIndex(featuredIndex);
    renderFeaturedOptions();
    renderArtworkList(activeCategory);
    adminManageStatus.textContent = 'Artwork removed from category.';
    adminManageStatus.style.color = 'var(--royal)';
}

function addArtwork() {
    const title = document.getElementById('adminTitle').value.trim();
    const imageUrl = (cloudinaryImageUrl || document.getElementById('adminImageUrl').value.trim());
    const category = document.getElementById('adminCategory').value;
    const medium = document.getElementById('adminMedium').value.trim() || 'Unknown medium';
    const year = document.getElementById('adminYear').value.trim() || new Date().getFullYear();
    const description = document.getElementById('adminDescription').value.trim() || 'New artwork entry.';

    if (!title || !imageUrl) {
        adminUploadStatus.textContent = 'Title and image URL are required for upload.';
        adminUploadStatus.style.color = '#d92f2f';
        return;
    }

    const publicId = generateRandomPublicId(title, category);
    galleryData.push({
        category,
        title,
        medium,
        year,
        description,
        image: imageUrl,
        publicId,
    });

    saveGalleryData(galleryData);
    renderFeaturedOptions();
    renderArtworkList(activeCategory);

    adminUploadStatus.textContent = 'Artwork saved. Gallery will update automatically.';
    adminUploadStatus.style.color = 'var(--royal)';
    document.getElementById('adminTitle').value = '';
    document.getElementById('adminImageUrl').value = '';
    if (adminCloudName) adminCloudName.value = '';
    if (adminUploadPreset) adminUploadPreset.value = '';
    if (adminImageFile) adminImageFile.value = '';
    if (adminCloudUploadStatus) adminCloudUploadStatus.textContent = '';
    cloudinaryImageUrl = '';
    if (adminMedium) adminMedium.value = '';
    if (adminYear) adminYear.value = '';
    if (adminDescription) adminDescription.value = '';
}

async function uploadImageToCloudinary() {
    if (!adminCloudName?.value.trim() || !adminUploadPreset?.value.trim()) {
        if (adminCloudUploadStatus) {
            adminCloudUploadStatus.textContent = 'Please enter Cloudinary cloud name and upload preset.';
            adminCloudUploadStatus.style.color = '#d92f2f';
        }
        return;
    }

    const file = adminImageFile?.files?.[0];
    if (!file) {
        if (adminCloudUploadStatus) {
            adminCloudUploadStatus.textContent = 'Please select an image file to upload.';
            adminCloudUploadStatus.style.color = '#d92f2f';
        }
        return;
    }

    if (adminCloudUploadStatus) {
        adminCloudUploadStatus.textContent = 'Uploading image to Cloudinary...';
        adminCloudUploadStatus.style.color = 'var(--text)';
    }

    const url = `https://api.cloudinary.com/v1_1/${adminCloudName.value.trim()}/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', adminUploadPreset.value.trim());
    formData.append('public_id', generateRandomPublicId(document.getElementById('adminTitle').value.trim() || 'artwork', adminCategorySelect.value));
    formData.append('folder', cloudinaryCategoryFolders[adminCategorySelect.value] || adminCategorySelect.value);
    formData.append('unique_filename', 'true');

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Upload failed');
        }

        const result = await response.json();
        if (result.secure_url) {
            cloudinaryImageUrl = result.secure_url;
            if (document.getElementById('adminImageUrl')) {
                document.getElementById('adminImageUrl').value = result.secure_url;
            }
            if (adminCloudUploadStatus) {
                adminCloudUploadStatus.textContent = 'Upload complete. You can now save the artwork.';
                adminCloudUploadStatus.style.color = 'var(--royal)';
            }
        } else {
            throw new Error('Cloudinary did not return an image URL.');
        }
    } catch (error) {
        if (adminCloudUploadStatus) {
            adminCloudUploadStatus.textContent = `Upload failed: ${error.message}`;
            adminCloudUploadStatus.style.color = '#d92f2f';
        }
    }
}

function syncFromStorage(event) {
    if (!event.key) return;
    if (event.key === adminStorageKey) {
        galleryData = getSavedGalleryData();
        renderFeaturedOptions();
        renderArtworkList(activeCategory);
    }
    if (event.key === adminFeaturedKey) {
        featuredIndex = getSavedFeaturedIndex();
        renderFeaturedOptions();
    }
}

function initAdminPage() {
    renderCategoryOptions();
    renderManageCategoryOptions();
    renderFeaturedOptions();
    renderArtworkList(activeCategory);

    adminManageCategory.addEventListener('change', (event) => {
        activeCategory = event.target.value;
        renderArtworkList(activeCategory);
    });

    adminFeaturedSelect.addEventListener('change', (event) => {
        setFeatured(Number(event.target.value));
    });

    adminSetFeatured.addEventListener('click', () => {
        setFeatured(Number(adminFeaturedSelect.value));
    });

    adminUploadButton.addEventListener('click', () => {
        addArtwork();
    });

    adminCloudUpload?.addEventListener('click', (event) => {
        event.preventDefault();
        uploadImageToCloudinary();
    });

    adminArtworkList.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        const index = Number(button.dataset.index);
        if (button.classList.contains('admin-delete')) {
            deleteArtwork(index);
        } else if (button.classList.contains('admin-move-up')) {
            moveArtwork(index, -1);
        } else if (button.classList.contains('admin-move-down')) {
            moveArtwork(index, 1);
        } else if (button.classList.contains('admin-feature')) {
            setFeatured(index);
        }
    });

    window.addEventListener('storage', syncFromStorage);
}

window.addEventListener('DOMContentLoaded', initAdminPage);
