import { db, collection, onSnapshot, query, orderBy } from './firebase-init.js';

// Public read-side helpers only. Admin write operations (create/update/delete/reorder/
// feature/category management) live in assets/js/services/*.js, kept separate so the
// public site's dependency graph never pulls in write logic it doesn't need.

export const defaultCategoryNames = {
    'art-commissions': 'Art Commissions',
    'face-painting': 'Face Painting Works',
    'clay-accessories': 'Clay Accessories',
};

export const cloudinaryBaseUrl = 'https://res.cloudinary.com/drsvgxp3u/image/upload/';

/**
 * Turns any category name into a URL/folder-safe slug, so Cloudinary folders
 * are derived from the category rather than hardcoded per category.
 * e.g. "Face Painting" -> "face-painting", "Digital Art" -> "digital-art".
 */
export function slugify(text) {
    return (
        String(text || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'category'
    );
}

/** Cloudinary upload folder for a category, generated dynamically — never hardcoded per category. */
export function getCategoryCloudinaryFolder(categoryName) {
    return `gallery/${slugify(categoryName)}`;
}

export function getCloudinaryImageUrl(categoryName, filename) {
    return `${cloudinaryBaseUrl}${getCategoryCloudinaryFolder(categoryName)}/${filename}`;
}

const RESPONSIVE_WIDTHS = [400, 800, 1200, 1600];

/**
 * Applies Cloudinary automatic format + quality transformation, optionally at a target width.
 * Leaves non-Cloudinary URLs untouched.
 */
export function optimizeCloudinaryUrl(url, width) {
    if (!url || !url.includes('/upload/')) return url;
    const transform = width ? `f_auto,q_auto,w_${width}` : 'f_auto,q_auto';
    return url.replace('/upload/', `/upload/${transform}/`);
}

/**
 * Builds a responsive, lazy-load-ready set of image attributes (src/srcset/sizes) from a
 * single Cloudinary URL, so the browser fetches the smallest size that fits the layout.
 */
export function getResponsiveImageProps(url) {
    if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
        return { src: url, srcset: '', sizes: '' };
    }

    const srcset = RESPONSIVE_WIDTHS.map((width) => `${optimizeCloudinaryUrl(url, width)} ${width}w`).join(', ');
    return {
        src: optimizeCloudinaryUrl(url, 800),
        srcset,
        sizes: '(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw',
    };
}

export function generateRandomPublicId(title, category) {
    const safeTitle = String(title || 'artwork')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 30) || 'artwork';
    return `${category}-${safeTitle}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Local fallback data — only shown when Firestore has no artworks yet (first run) or is unreachable.
// This is never written back to Firestore automatically.
export const defaultGalleryData = [
    {
        category: 'art-commissions',
        title: 'Eternal Thread',
        medium: 'Hand-painted canvas & natural fibers',
        year: '2026',
        description: 'A wearable composition that balances warm tones and subtle movement.',
        image: getCloudinaryImageUrl('art-commissions', 'gallery-01.svg'),
        featured: true,
        sold: false,
        hidden: false,
        order: 1,
    },
    {
        category: 'art-commissions',
        title: 'Linen Reverie',
        medium: 'Mixed media on textile',
        year: '2025',
        description: 'An intimate portrait of texture, color, and quietly luminous form.',
        image: getCloudinaryImageUrl('art-commissions', 'gallery-02.svg'),
        featured: false,
        sold: false,
        hidden: false,
        order: 2,
    },
    {
        category: 'face-painting',
        title: 'Quiet Bloom',
        medium: 'Face painting palette & skin-safe pigments',
        year: '2025',
        description: 'Soft blooms designed for portraits, performance, and elegant movement.',
        image: getCloudinaryImageUrl('face-painting', 'gallery-03.svg'),
        featured: true,
        sold: false,
        hidden: false,
        order: 3,
    },
    {
        category: 'face-painting',
        title: 'Moon Touch',
        medium: 'Skin-safe pigment & soft shading',
        year: '2024',
        description: 'A refined face painting study built for editorial and performance.',
        image: getCloudinaryImageUrl('face-painting', 'gallery-04.svg'),
        featured: false,
        sold: false,
        hidden: false,
        order: 4,
    },
    {
        category: 'clay-accessories',
        title: 'Sunlit Pendant',
        medium: 'Handcrafted clay and gold leaf',
        year: '2026',
        description: 'A sculptural accessory with a delicate finish and museum-ready aura.',
        image: getCloudinaryImageUrl('clay-accessories', 'gallery-05.svg'),
        featured: true,
        sold: false,
        hidden: false,
        order: 5,
    },
    {
        category: 'clay-accessories',
        title: 'Pearl Loop',
        medium: 'Handcrafted clay with satin glaze',
        year: '2026',
        description: 'A subtle sculptural earring inspired by natural light and modern form.',
        image: getCloudinaryImageUrl('clay-accessories', 'gallery-06.svg'),
        featured: false,
        sold: false,
        hidden: false,
        order: 6,
    },
];

export const defaultCategoryData = Object.entries(defaultCategoryNames).map(([id, name], index) => ({
    id,
    name,
    description: '',
    coverImage: '',
    order: index,
}));

const artworksCollection = collection(db, 'artworks');
const categoriesCollection = collection(db, 'categories');

/**
 * Subscribes to live artwork updates from Firestore.
 * Falls back to local seed data if the collection is empty or unreachable,
 * so the site never renders blank while Firebase config is still a placeholder.
 * @param {(artworks: Array) => void} callback
 * @param {{ includeHidden?: boolean }} [options]
 * @returns {() => void} unsubscribe function
 */
export function subscribeArtworks(callback, options = {}) {
    const { includeHidden = false } = options;
    const artworksQuery = query(artworksCollection, orderBy('order', 'asc'));

    const unsubscribe = onSnapshot(
        artworksQuery,
        (snapshot) => {
            if (snapshot.empty) {
                callback(includeHidden ? defaultGalleryData : defaultGalleryData.filter((item) => !item.hidden));
                return;
            }

            const items = snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }));
            callback(includeHidden ? items : items.filter((item) => !item.hidden));
        },
        () => {
            callback(includeHidden ? defaultGalleryData : defaultGalleryData.filter((item) => !item.hidden));
        },
    );

    return unsubscribe;
}

/**
 * Subscribes to live category updates from Firestore, falling back to the default category map.
 * @param {(categories: Array) => void} callback
 * @returns {() => void} unsubscribe function
 */
export function subscribeCategories(callback) {
    const categoriesQuery = query(categoriesCollection, orderBy('order', 'asc'));

    const unsubscribe = onSnapshot(
        categoriesQuery,
        (snapshot) => {
            if (snapshot.empty) {
                callback(defaultCategoryData);
                return;
            }
            callback(snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() })));
        },
        () => {
            callback(defaultCategoryData);
        },
    );

    return unsubscribe;
}
