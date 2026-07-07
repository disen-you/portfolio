import { auth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from '../firebase-init.js';

let currentUser = null;
let dashboardReadyCallbacks = [];

/**
 * Registers a callback to run once the visitor is confirmed authenticated. If auth already
 * resolved by the time this is called, it fires immediately — so modules can call this during
 * their own setup without caring whether auth-guard has already resolved.
 */
export function onDashboardReady(callback) {
    if (currentUser) {
        callback(currentUser);
    } else {
        dashboardReadyCallbacks.push(callback);
    }
}

export function getCurrentUser() {
    return currentUser;
}

/**
 * Gates the whole admin page behind Firebase Auth. Nothing but a neutral loading state is shown
 * until the first onAuthStateChanged callback fires, so neither the login form nor any dashboard
 * content flashes before we actually know whether the visitor is signed in.
 */
export function initAuthGuard() {
    const loadingGate = document.getElementById('adminLoadingGate');
    const loginView = document.getElementById('adminLoginView');
    const dashboardView = document.getElementById('adminDashboardView');
    const loginForm = document.getElementById('adminLoginForm');
    const loginStatus = document.getElementById('adminLoginStatus');
    const logoutButton = document.getElementById('adminLogout');
    const userEmailLabel = document.getElementById('adminUserEmail');

    loginForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = document.getElementById('adminEmail').value.trim();
        const password = document.getElementById('adminPassword').value;
        const submitButton = loginForm.querySelector('button[type="submit"]');

        if (loginStatus) {
            loginStatus.textContent = 'Signing in…';
            loginStatus.style.color = 'var(--muted)';
        }
        if (submitButton) submitButton.disabled = true;

        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            if (loginStatus) {
                loginStatus.textContent = 'Invalid login. Please check your email and password.';
                loginStatus.style.color = '#d92f2f';
            }
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });

    logoutButton?.addEventListener('click', () => signOut(auth));

    onAuthStateChanged(auth, (user) => {
        loadingGate?.classList.add('hidden');

        if (user) {
            currentUser = user;
            loginView?.classList.add('hidden');
            dashboardView?.classList.remove('hidden');
            if (userEmailLabel) userEmailLabel.textContent = user.email;
            dashboardReadyCallbacks.forEach((callback) => callback(user));
            dashboardReadyCallbacks = [];
        } else {
            currentUser = null;
            loginView?.classList.remove('hidden');
            dashboardView?.classList.add('hidden');
            loginForm?.reset();
        }
    });
}
