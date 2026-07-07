import { computeArtworkStats } from '../services/artworks-service.js';

const STAT_CARDS = [
    { key: 'totalArtworks', label: 'Total Artworks' },
    { key: 'totalVideos', label: 'Total Videos' },
    { key: 'totalFeatured', label: 'Featured Artworks' },
    { key: 'totalHidden', label: 'Hidden Artworks' },
    { key: 'totalSold', label: 'Sold Artworks' },
    { key: 'totalCategories', label: 'Categories' },
    { key: 'lastUpload', label: 'Last Upload' },
];

function formatLastUpload(ms) {
    if (!ms) return '—';
    const diffMinutes = Math.round((Date.now() - ms) / 60000);
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.round(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return new Date(ms).toLocaleDateString();
}

export function renderDashboardStatsSkeleton() {
    const grid = document.getElementById('dashboardStats');
    if (!grid) return;
    grid.innerHTML = STAT_CARDS.map(
        () => `
        <article class="stat-card stat-card-skeleton">
            <div class="skeleton-line skeleton-line-sm"></div>
            <div class="skeleton-line skeleton-line-lg"></div>
        </article>
    `,
    ).join('');
}

export function renderDashboardStats({ artworks, categories }) {
    const grid = document.getElementById('dashboardStats');
    if (!grid) return;

    const stats = computeArtworkStats(artworks);
    const values = {
        totalArtworks: stats.totalArtworks,
        totalVideos: stats.totalVideos,
        totalFeatured: stats.totalFeatured,
        totalHidden: stats.totalHidden,
        totalSold: stats.totalSold,
        totalCategories: categories.length,
        lastUpload: formatLastUpload(stats.lastUploadAt),
    };

    grid.innerHTML = STAT_CARDS.map(
        ({ key, label }) => `
        <article class="stat-card">
            <p class="stat-card-label">${label}</p>
            <p class="stat-card-value">${values[key]}</p>
        </article>
    `,
    ).join('');
}
