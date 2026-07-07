# Disen.You — Backend Setup (Firebase + Cloudinary)

This project reads and writes real gallery data through Firebase (Auth + Firestore) and Cloudinary. Firebase and Cloudinary credentials are already filled in at [`assets/js/firebase-config.js`](assets/js/firebase-config.js).

## 1. Firebase project

Project `disen-you` is already created, with the web app config in [`assets/js/firebase-config.js`](assets/js/firebase-config.js). Make sure these are done in the [Firebase console](https://console.firebase.google.com/project/disen-you):

1. **Build → Authentication → Sign-in method**: the **Email/Password** provider is enabled.
2. **Build → Authentication → Users**: Katrina's login email + password is added. This is the only account that can access `/admin/`.
3. **Build → Firestore Database**: a database exists (Production mode).
4. **Firestore → Rules** contains:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /artworks/{id} {
         allow read: if true;
         allow write: if request.auth != null;
       }
       match /categories/{id} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```
   This lets anyone view the gallery, but only a signed-in account (i.e. Katrina) can add, edit, or delete artwork.

## 2. Cloudinary unsigned upload preset

Cloud name `drsvgxp3u` and upload preset `disenyou_unsigned` are already set in `assets/js/firebase-config.js`. Confirm in the [Cloudinary console](https://cloudinary.com/console) under **Settings → Upload → Upload presets** that `disenyou_unsigned` exists with **Signing mode: Unsigned** (required for browser uploads without exposing your API secret).

Uploads are organized automatically by category: the folder is generated from the category name at upload time (`gallery/<slugified-category-name>`, e.g. "Face Painting Works" → `gallery/face-painting-works`). There's no hardcoded folder list — any category the dashboard creates later gets its own folder automatically. See `slugify` / `getCategoryCloudinaryFolder` in `assets/js/gallery-data.js`.

## 3. Using the dashboard

- Visit `/admin/` (not linked anywhere on the public site — bookmark it). Log in with the email/password created in step 1.3.
- Upload an image or video, fill in the details, and save — it appears on the public site immediately for every visitor, no redeploy needed.
- "Feature" marks that artwork as the one shown per category; "Hide" removes it from the public site without deleting it; "Mark sold" adds a Sold badge.

## What's not built yet (later phases)

Drag-and-drop reorder, multi-file upload with progress bars, category creation/renaming from the UI, and the stats panel are follow-up work on top of this foundation — see the roadmap discussed with your developer.
