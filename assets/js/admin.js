import { initAuthGuard, onDashboardReady } from './admin/auth-guard.js';
import { subscribeCategories } from './gallery-data.js';
import { subscribeAllArtworksForAdmin } from './services/artworks-service.js';
import { renderDashboardStatsSkeleton, renderDashboardStats } from './admin/dashboard-stats.js';
import { initUploadManager, updateUploadManagerCategories } from './admin/upload-manager.js';
import { initArtworkManager, updateArtworkManagerData, updateArtworkManagerCategories } from './admin/artwork-manager.js';
import { initCategoryManager, updateCategoryManagerData, updateCategoryManagerArtworks } from './admin/category-manager.js';

const state = { artworks: [], categories: [], artworksLoaded: false, categoriesLoaded: false };

function maybeRenderStats() {
    if (state.artworksLoaded && state.categoriesLoaded) {
        renderDashboardStats(state);
    }
}

function initTabs() {
    const tabButtons = document.querySelectorAll('.admin-tab-button');
    tabButtons.forEach((button) => {
        button.addEventListener('click', () => {
            tabButtons.forEach((entry) => entry.classList.remove('active'));
            button.classList.add('active');
            document.querySelectorAll('.admin-tab-panel').forEach((panel) => {
                panel.classList.toggle('hidden', panel.id !== `tab-${button.dataset.tab}`);
            });
        });
    });
}

initAuthGuard();
initTabs();

onDashboardReady(() => {
    renderDashboardStatsSkeleton();
    initUploadManager();
    initArtworkManager();
    initCategoryManager();

    subscribeAllArtworksForAdmin((artworks) => {
        state.artworks = artworks;
        state.artworksLoaded = true;
        updateArtworkManagerData(artworks);
        updateCategoryManagerArtworks(artworks);
        maybeRenderStats();
    });

    subscribeCategories((categories) => {
        state.categories = categories;
        state.categoriesLoaded = true;
        updateArtworkManagerCategories(categories);
        updateCategoryManagerData(categories);
        updateUploadManagerCategories(categories);
        maybeRenderStats();
    });
});
