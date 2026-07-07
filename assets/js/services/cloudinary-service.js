import { cloudinaryConfig } from '../firebase-config.js';
import { generateRandomPublicId } from '../gallery-data.js';

export class UploadAbortedError extends Error {
    constructor() {
        super('Upload cancelled.');
        this.name = 'UploadAbortedError';
    }
}

export function isCloudinaryConfigured() {
    return Boolean(cloudinaryConfig.uploadPreset) && !cloudinaryConfig.uploadPreset.startsWith('REPLACE_WITH');
}

function parseCloudinaryError(responseText) {
    try {
        const parsed = JSON.parse(responseText);
        return parsed?.error?.message || null;
    } catch {
        return null;
    }
}

/**
 * Uploads a single file to Cloudinary. Uses XMLHttpRequest rather than fetch specifically
 * because fetch has no upload-progress event — XHR's `upload.onprogress` is what drives the
 * per-file progress bar in the admin upload queue.
 *
 * @returns {{ promise: Promise<{secureUrl: string, publicId: string, resourceType: string}>, cancel: () => void }}
 */
export function uploadToCloudinary({ file, folder, title, category, resourceType, onProgress }) {
    const xhr = new XMLHttpRequest();
    const publicId = generateRandomPublicId(title, category);
    const endpoint = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/${resourceType}/upload`;

    // Note: `unique_filename` is rejected by Cloudinary's unsigned-upload endpoint (it's not in
    // the allowed parameter list for unsigned requests). Not needed anyway — generateRandomPublicId
    // already guarantees a unique public_id per upload.
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    formData.append('public_id', publicId);
    formData.append('folder', folder);

    const promise = new Promise((resolve, reject) => {
        xhr.open('POST', endpoint);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                onProgress(Math.round((event.loaded / event.total) * 100));
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const result = JSON.parse(xhr.responseText);
                    if (!result.secure_url) throw new Error('Cloudinary did not return a media URL.');
                    resolve({ secureUrl: result.secure_url, publicId: result.public_id || publicId, resourceType });
                } catch (error) {
                    reject(error);
                }
            } else {
                reject(new Error(parseCloudinaryError(xhr.responseText) || `Upload failed (status ${xhr.status}).`));
            }
        };

        xhr.onerror = () => reject(new Error('Network error during upload.'));
        xhr.onabort = () => reject(new UploadAbortedError());

        xhr.send(formData);
    });

    return { promise, cancel: () => xhr.abort() };
}
