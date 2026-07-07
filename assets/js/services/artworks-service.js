import {
    db,
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
} from '../firebase-init.js';

const artworksCollection = collection(db, 'artworks');

/**
 * Subscribes to every artwork (including hidden), for the admin dashboard.
 * The public site uses gallery-data.js's subscribeArtworks instead, which filters hidden items
 * and falls back to local seed data — the admin view has no such fallback since it requires auth.
 * @param {(artworks: Array) => void} callback
 * @returns {() => void} unsubscribe function
 */
export function subscribeAllArtworksForAdmin(callback) {
    const artworksQuery = query(artworksCollection, orderBy('order', 'asc'));
    return onSnapshot(artworksQuery, (snapshot) => {
        callback(snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() })));
    });
}

export async function createArtwork(data) {
    return addDoc(artworksCollection, {
        ...data,
        sold: Boolean(data.sold),
        hidden: Boolean(data.hidden),
        featured: Boolean(data.featured),
        order: data.order ?? Date.now(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

export async function updateArtwork(id, data) {
    return updateDoc(doc(db, 'artworks', id), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteArtwork(id) {
    return deleteDoc(doc(db, 'artworks', id));
}

/** Creates a copy of an artwork (same media, new doc), appended to the end of its category. */
export async function duplicateArtwork(artwork) {
    const { id, createdAt, updatedAt, ...rest } = artwork;
    return createArtwork({
        ...rest,
        title: `${artwork.title} (Copy)`,
        featured: false,
        order: Date.now(),
    });
}

/**
 * Marks a single artwork as featured within its category, unsetting any previous
 * featured artwork in that same category so exactly one stays featured per category.
 * @param {Array} artworksInCategory - current in-memory artworks already filtered to the target category
 * @param {string} targetId
 */
export async function setFeaturedArtwork(artworksInCategory, targetId) {
    const updates = artworksInCategory
        .filter((item) => item.id !== targetId && item.featured)
        .map((item) => updateArtwork(item.id, { featured: false }));

    updates.push(updateArtwork(targetId, { featured: true }));
    return Promise.all(updates);
}

export async function unfeatureArtwork(id) {
    return updateArtwork(id, { featured: false });
}

/** Moves an artwork to a different category, appending it to the end and clearing `featured` (it can't stay featured in a category it no longer belongs to, and re-featuring in the new category is a deliberate follow-up action). */
export async function changeArtworkCategory(id, newCategoryId) {
    return updateArtwork(id, { category: newCategoryId, featured: false, order: Date.now() });
}

/**
 * Persists a full drag-and-drop reorder of one category's artworks.
 * @param {string[]} orderedIds - artwork ids in their new visual order
 */
export async function reorderCategoryArtworks(orderedIds) {
    return Promise.all(orderedIds.map((id, index) => updateArtwork(id, { order: index })));
}

export async function bulkDelete(ids) {
    return Promise.all(ids.map((id) => deleteArtwork(id)));
}

export async function bulkSetHidden(ids, hidden) {
    return Promise.all(ids.map((id) => updateArtwork(id, { hidden })));
}

export async function bulkSetSold(ids, sold) {
    return Promise.all(ids.map((id) => updateArtwork(id, { sold })));
}

export async function bulkChangeCategory(ids, newCategoryId) {
    return Promise.all(ids.map((id) => updateArtwork(id, { category: newCategoryId, featured: false, order: Date.now() })));
}

/** Pure aggregation over an already-loaded artwork list — no extra Firestore reads needed. */
export function computeArtworkStats(artworks) {
    const stats = {
        totalArtworks: artworks.length,
        totalVideos: 0,
        totalFeatured: 0,
        totalHidden: 0,
        totalSold: 0,
        lastUploadAt: null,
    };

    artworks.forEach((item) => {
        if (item.resourceType === 'video') stats.totalVideos += 1;
        if (item.featured) stats.totalFeatured += 1;
        if (item.hidden) stats.totalHidden += 1;
        if (item.sold) stats.totalSold += 1;

        const createdMs = item.createdAt?.toMillis?.();
        if (createdMs && (!stats.lastUploadAt || createdMs > stats.lastUploadAt)) {
            stats.lastUploadAt = createdMs;
        }
    });

    return stats;
}
