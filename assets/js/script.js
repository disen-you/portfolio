import {
    subscribeArtworks,
    subscribeCategories,
    defaultCategoryNames,
    optimizeCloudinaryUrl,
    getResponsiveImageProps,
} from './gallery-data.js';

function applyResponsiveImage(imgElement, url) {
    if (!imgElement) return;
    const { src, srcset, sizes } = getResponsiveImageProps(url);
    imgElement.src = src;
    if (srcset) imgElement.srcset = srcset;
    if (sizes) imgElement.sizes = sizes;
    imgElement.loading = 'lazy';
    imgElement.decoding = 'async';
}

let galleryData = [];
let categories = [];
let currentIndex = 0;

function getCategoryName(categoryId) {
    const match = categories.find((category) => category.id === categoryId);
    return match?.name || defaultCategoryNames[categoryId] || 'Gallery';
}

document.addEventListener('DOMContentLoaded', () => {
    const collectionCards = document.querySelectorAll('.collection-card');
    const collectionButtons = document.querySelectorAll('.collection-button');
    const viewer = document.getElementById('artworkViewer');
    const viewerBackdrop = viewer?.querySelector('.viewer-backdrop');
    const viewerClose = document.getElementById('viewerClose');
    const viewerPrev = document.getElementById('viewerPrev');
    const viewerNext = document.getElementById('viewerNext');
    const viewerImg = viewer?.querySelector('.viewer-media img');
    const viewerTitle = viewer?.querySelector('.viewer-title');
    const viewerMedium = viewer?.querySelector('.viewer-medium');
    const viewerYear = viewer?.querySelector('.viewer-year');
    const viewerDescription = viewer?.querySelector('.viewer-description');
    const featuredView = document.querySelector('[data-view-index]');
    const contactForm = document.getElementById('contactForm');
    const contactStatus = document.getElementById('contactStatus');
    const galleryModal = document.getElementById('galleryModal');
    const galleryModalClose = document.getElementById('galleryModalClose');
    const galleryModalTitle = document.getElementById('galleryModalTitle');
    const galleryModalGrid = document.getElementById('galleryModalGrid');

    const renderFeaturedCard = () => {
        const item = galleryData.find((entry) => entry.featured) || galleryData[0];
        if (!item) return;

        const featuredImg = document.querySelector('.about-feature-card img');
        const featuredTitle = document.querySelector('.feature-overlay h3');
        const featuredMeta = document.querySelector('.feature-meta');
        const featureButton = document.querySelector('.feature-overlay button');
        const itemIndex = galleryData.indexOf(item);

        if (featuredImg) {
            applyResponsiveImage(featuredImg, item.image);
            featuredImg.alt = item.title;
        }
        if (featuredTitle) featuredTitle.textContent = item.title;
        if (featuredMeta) featuredMeta.textContent = `${item.medium} · ${item.year}`;
        if (featureButton) featureButton.dataset.viewIndex = String(itemIndex);
    };

    const renderCollectionCovers = () => {
        collectionCards.forEach((card) => {
            const category = card.dataset.category;
            const categoryMeta = categories.find((entry) => entry.id === category);
            const coverFromCategory = categoryMeta?.coverImage;
            const firstArtwork = galleryData.find((entry) => entry.category === category);
            const coverImage = coverFromCategory || firstArtwork?.image;
            if (coverImage) {
                const optimized = optimizeCloudinaryUrl(coverImage, 800);
                card.style.backgroundImage = `linear-gradient(180deg, rgba(21,21,21,0.08), rgba(21,21,21,0.45)), url('${optimized}')`;
            }
        });
    };

    const openViewer = (index) => {
        const item = galleryData[index];
        if (!item || !viewer) return;
        currentIndex = index;
        if (viewerImg) {
            applyResponsiveImage(viewerImg, item.image);
            viewerImg.alt = item.title;
        }
        if (viewerTitle) viewerTitle.textContent = item.sold ? `${item.title} (Sold)` : item.title;
        if (viewerMedium) viewerMedium.textContent = item.medium;
        if (viewerYear) viewerYear.textContent = item.year;
        if (viewerDescription) viewerDescription.textContent = item.description;
        viewer.classList.remove('hidden');
        viewer.setAttribute('aria-hidden', 'false');
        document.body.classList.add('no-scroll');
    };

    const closeViewer = () => {
        if (!viewer) return;
        viewer.classList.add('hidden');
        viewer.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('no-scroll');
    };

    const showNext = () => {
        if (galleryData.length === 0) return;
        openViewer((currentIndex + 1) % galleryData.length);
    };

    const showPrev = () => {
        if (galleryData.length === 0) return;
        openViewer((currentIndex - 1 + galleryData.length) % galleryData.length);
    };

    const buildGalleryModal = (category) => {
        if (!galleryModalGrid || !galleryModalTitle || !galleryModal) return;
        galleryModalTitle.textContent = getCategoryName(category);

        galleryModalGrid.innerHTML = galleryData
            .map((item, globalIndex) => ({ item, globalIndex }))
            .filter((entry) => entry.item.category === category)
            .map(({ item, globalIndex }) => {
                const { src, srcset, sizes } = getResponsiveImageProps(item.image);
                return `
                <article class="gallery-modal-item" data-index="${globalIndex}">
                    <img src="${src}" ${srcset ? `srcset="${srcset}" sizes="${sizes}"` : ''} alt="${item.title}" loading="lazy" decoding="async">
                    ${item.sold ? '<span class="sold-badge">Sold</span>' : ''}
                    <div class="gallery-modal-caption">
                        <h3>${item.title}</h3>
                        <p>${item.medium}</p>
                    </div>
                </article>
            `;
            })
            .join('');

        galleryModalGrid.querySelectorAll('.gallery-modal-item').forEach((element) => {
            const itemIndex = Number(element.dataset.index);
            element.addEventListener('click', () => {
                closeGalleryModal();
                openViewer(itemIndex);
            });
        });
    };

    const openGalleryModal = (category) => {
        if (!galleryModal) return;
        buildGalleryModal(category);
        galleryModal.classList.remove('hidden');
        galleryModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('no-scroll');
    };

    const closeGalleryModal = () => {
        if (!galleryModal) return;
        galleryModal.classList.add('hidden');
        galleryModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('no-scroll');
    };

    collectionButtons.forEach((button) => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            openGalleryModal(button.dataset.category || 'art-commissions');
        });
    });

    featuredView?.addEventListener('click', () => {
        openViewer(Number(featuredView.dataset.viewIndex) || 0);
    });

    galleryModalClose?.addEventListener('click', closeGalleryModal);
    galleryModal?.addEventListener('click', (event) => {
        if (event.target === galleryModal) closeGalleryModal();
    });

    viewerClose?.addEventListener('click', closeViewer);
    viewerBackdrop?.addEventListener('click', closeViewer);
    viewerNext?.addEventListener('click', showNext);
    viewerPrev?.addEventListener('click', showPrev);

    document.addEventListener('keydown', (event) => {
        if (viewer && !viewer.classList.contains('hidden')) {
            if (event.key === 'Escape') closeViewer();
            if (event.key === 'ArrowRight') showNext();
            if (event.key === 'ArrowLeft') showPrev();
        }
        if (galleryModal && !galleryModal.classList.contains('hidden')) {
            if (event.key === 'Escape') closeGalleryModal();
        }
    });

    contactForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        contactStatus.textContent = 'Thank you. Your inquiry is ready to send.';
        const royalColor = getComputedStyle(document.documentElement).getPropertyValue('--royal') || '#183A67';
        contactStatus.style.color = royalColor.trim();
        contactForm.reset();
    });

    subscribeCategories((liveCategories) => {
        categories = liveCategories;
        renderCollectionCovers();
    });

    subscribeArtworks((liveArtworks) => {
        galleryData = liveArtworks;
        renderFeaturedCard();
        renderCollectionCovers();
    });
});
