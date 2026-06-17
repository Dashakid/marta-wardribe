// firebase.js — loaded as <script type="module"> in index.html
// CDN imports are mapped via the importmap in index.html.
// With a bundler, these resolve to the local npm package automatically.

import { initializeApp }                          from 'firebase/app';
import { getAuth, GoogleAuthProvider,
         signInWithPopup, onAuthStateChanged,
         signOut }                                from 'firebase/auth';
import { getFirestore }                           from 'firebase/firestore';
import { getStorage }                             from 'firebase/storage';
import { firebaseConfig }                         from './firebase-config.js';
import { t }                                      from './i18n.js';

// ─── Initialize services ───────────────────────────────────────────────────
const app = initializeApp(firebaseConfig);

export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);

export let currentUid = null;

// ─── Google provider ───────────────────────────────────────────────────────
const provider = new GoogleAuthProvider();
// Always show the account picker, even if only one account is logged in
provider.setCustomParameters({ prompt: 'select_account' });

// ─── DOM refs ──────────────────────────────────────────────────────────────
const loginScreen = document.getElementById('login-screen');
const appEl       = document.getElementById('app');
const signInBtn   = document.getElementById('sign-in-btn');
const signOutBtn  = document.getElementById('sign-out-btn');
const loginError  = document.getElementById('login-error');
const userNameEl  = document.getElementById('user-name');

// ─── Auth state listener ───────────────────────────────────────────────────
// Fires once immediately with the current user (or null), then on every change.
onAuthStateChanged(auth, user => {
  currentUid = user ? user.uid : null;
  if (user) {
    loginScreen.hidden = true;
    appEl.hidden       = false;
    if (userNameEl) {
      userNameEl.textContent = user.displayName?.split(' ')[0] ?? '';
    }
    window.dispatchEvent(new CustomEvent('pintona:auth', { detail: { uid: user.uid } }));
  } else {
    loginScreen.hidden = false;
    appEl.hidden       = true;
  }
});

// ─── Sign in ───────────────────────────────────────────────────────────────
signInBtn?.addEventListener('click', async () => {
  signInBtn.disabled = true;
  if (loginError) loginError.textContent = '';

  try {
    await signInWithPopup(auth, provider);
    // onAuthStateChanged handles the UI transition
  } catch (err) {
    // Ignore if user simply closed the popup
    if (err.code !== 'auth/popup-closed-by-user' &&
        err.code !== 'auth/cancelled-popup-request') {
      if (loginError) loginError.textContent = t('loginError');
    }
    signInBtn.disabled = false;
  }
});

// ─── Sign out ──────────────────────────────────────────────────────────────
signOutBtn?.addEventListener('click', () => signOut(auth));
