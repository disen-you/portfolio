// Firebase project config for Disen.You.
//
// Get these values from the Firebase console:
// Project settings (gear icon) -> General -> "Your apps" -> Web app -> SDK setup and configuration.
// These values are safe to expose in client-side code; access is controlled by Firestore/Auth security rules,
// not by keeping this object secret.
//
// Replace every placeholder below with the real values, then the admin login and live gallery data will work.
export const firebaseConfig = {
    apiKey: 'AIzaSyA3viQwMKkjomBBM2R3VCL40MAzrWd_5NQ',
    authDomain: 'disen-you.firebaseapp.com',
    projectId: 'disen-you',
    storageBucket: 'disen-you.firebasestorage.app',
    messagingSenderId: '462585997961',
    appId: '1:462585997961:web:474f0d9c43f0ea46053458',
    measurementId: 'G-RD9E54TF1L',
};

// Cloudinary unsigned-upload settings.
export const cloudinaryConfig = {
    cloudName: 'drsvgxp3u',
    uploadPreset: 'disenyou_unsigned',
};
