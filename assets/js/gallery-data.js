const defaultCategoryNames = {
    'art-commissions': 'Art Commissions',
    'face-painting': 'Face Painting Works',
    'clay-accessories': 'Clay Accessories',
};

const cloudinaryBaseUrl = 'https://res.cloudinary.com/drsvgxp3u/image/upload/';

const cloudinaryCategoryFolders = {
    'art-commissions': 'gallery/painting',
    'face-painting': 'gallery/face-painting',
    'clay-accessories': 'gallery/clay',
};

function getCloudinaryImageUrl(category, filename) {
    return `${cloudinaryBaseUrl}${cloudinaryCategoryFolders[category]}/${filename}`;
}

function resolveArtworkImage(item) {
    if (!item.image?.startsWith('assets/images/gallery/')) {
        return item;
    }

    const filename = item.image.split('/').pop();
    return {
        ...item,
        image: getCloudinaryImageUrl(item.category, filename),
    };
}

const defaultGalleryData = [
    {
        category: 'art-commissions',
        title: 'Eternal Thread',
        medium: 'Hand-painted canvas & natural fibers',
        year: '2026',
        description: 'A wearable composition that balances warm tones and subtle movement.',
        image: getCloudinaryImageUrl('art-commissions', 'gallery-01.svg'),
    },
    {
        category: 'art-commissions',
        title: 'Linen Reverie',
        medium: 'Mixed media on textile',
        year: '2025',
        description: 'An intimate portrait of texture, color, and quietly luminous form.',
        image: getCloudinaryImageUrl('art-commissions', 'gallery-02.svg'),
    },
    {
        category: 'face-painting',
        title: 'Quiet Bloom',
        medium: 'Face painting palette & skin-safe pigments',
        year: '2025',
        description: 'Soft blooms designed for portraits, performance, and elegant movement.',
        image: getCloudinaryImageUrl('face-painting', 'gallery-03.svg'),
    },
    {
        category: 'face-painting',
        title: 'Moon Touch',
        medium: 'Skin-safe pigment & soft shading',
        year: '2024',
        description: 'A refined face painting study built for editorial and performance.',
        image: getCloudinaryImageUrl('face-painting', 'gallery-04.svg'),
    },
    {
        category: 'clay-accessories',
        title: 'Sunlit Pendant',
        medium: 'Handcrafted clay and gold leaf',
        year: '2026',
        description: 'A sculptural accessory with a delicate finish and museum-ready aura.',
        image: getCloudinaryImageUrl('clay-accessories', 'gallery-05.svg'),
    },
    {
        category: 'clay-accessories',
        title: 'Pearl Loop',
        medium: 'Handcrafted clay with satin glaze',
        year: '2026',
        description: 'A subtle sculptural earring inspired by natural light and modern form.',
        image: getCloudinaryImageUrl('clay-accessories', 'gallery-06.svg'),
    },
];

const defaultFeaturedIndex = 0;

const storageKey = 'disenYouGalleryData';
const featuredKey = 'disenYouFeaturedIndex';

function getSavedGalleryData() {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) {
        return defaultGalleryData.slice();
    }

    try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map(resolveArtworkImage);
        }
    } catch (error) {
        console.warn('Failed to parse gallery data from localStorage.', error);
    }

    return defaultGalleryData.slice();
}

function getSavedFeaturedIndex() {
    const saved = window.localStorage.getItem(featuredKey);
    const index = Number(saved);
    return Number.isInteger(index) && index >= 0 ? index : defaultFeaturedIndex;
}

function saveGalleryData(data) {
    window.localStorage.setItem(storageKey, JSON.stringify(data));
}

function saveFeaturedIndex(index) {
    window.localStorage.setItem(featuredKey, String(index));
}

function generateRandomPublicId(title, category) {
    const safeTitle = String(title || 'artwork')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 30) || 'artwork';
    return `${category}-${safeTitle}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

