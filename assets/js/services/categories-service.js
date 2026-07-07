import { db, collection, doc, getDoc, setDoc, updateDoc, deleteDoc } from '../firebase-init.js';
import { slugify, getCategoryCloudinaryFolder } from '../gallery-data.js';

const categoriesCollection = collection(db, 'categories');

/**
 * Cloudinary folder for a category. Prefers the folder stored at creation time (stable across
 * renames); falls back to slugifying the current name only for categories that predate this field
 * (the hardcoded default categories used before any real category doc existed).
 */
export function resolveCloudinaryFolder(category) {
    return category?.cloudinaryFolder || getCategoryCloudinaryFolder(category?.name || category);
}

/**
 * Creates a category with a stable, human-readable doc ID (the slug), so creating the same
 * name twice fails loudly instead of silently creating a duplicate. The Cloudinary folder is
 * computed once here and stored — it never changes even if the category is renamed later.
 * @param {string} name
 * @param {Array} existingCategories - current in-memory categories, used to compute the append order
 */
export async function createCategory(name, existingCategories = []) {
    const trimmedName = String(name || '').trim();
    if (!trimmedName) {
        throw new Error('Category name is required.');
    }

    const slug = slugify(trimmedName);
    const categoryRef = doc(db, 'categories', slug);
    const existingDoc = await getDoc(categoryRef);
    if (existingDoc.exists()) {
        throw new Error(`A category named "${trimmedName}" already exists.`);
    }

    const nextOrder = existingCategories.length
        ? Math.max(...existingCategories.map((category) => category.order ?? 0)) + 1
        : 0;

    await setDoc(categoryRef, {
        name: trimmedName,
        description: '',
        coverImage: '',
        cloudinaryFolder: `gallery/${slug}`,
        order: nextOrder,
    });

    return slug;
}

/** Renames a category. The Cloudinary folder is intentionally left untouched — see resolveCloudinaryFolder. */
export async function renameCategory(id, newName) {
    const trimmedName = String(newName || '').trim();
    if (!trimmedName) {
        throw new Error('Category name is required.');
    }
    return updateDoc(doc(db, 'categories', id), { name: trimmedName });
}

/**
 * Deletes a category, refusing if it still has artworks in it (no cascade delete —
 * the artist must move or delete those artworks first).
 * @param {string} id
 * @param {Array} allArtworks - current in-memory artworks, used to check for members of this category
 */
export async function deleteCategory(id, allArtworks) {
    const artworkCount = allArtworks.filter((item) => item.category === id).length;
    if (artworkCount > 0) {
        throw new Error(
            `This category still has ${artworkCount} artwork${artworkCount === 1 ? '' : 's'}. Move or delete them first.`,
        );
    }
    return deleteDoc(doc(db, 'categories', id));
}

/**
 * Persists a full drag-and-drop reorder of the category list.
 * @param {string[]} orderedIds - category ids in their new visual order
 */
export async function reorderCategories(orderedIds) {
    return Promise.all(orderedIds.map((id, index) => updateDoc(doc(db, 'categories', id), { order: index })));
}
