// app.js — zero-404, compat SDK, Firestore batch writer

(async function () {
  // ---------- 0) Utilities ----------
  const VERSION = '10.12.5';
  const SDKS = [
    `https://www.gstatic.com/firebasejs/${VERSION}/firebase-app-compat.js`,
    `https://www.gstatic.com/firebasejs/${VERSION}/firebase-auth-compat.js`,
    `https://www.gstatic.com/firebasejs/${VERSION}/firebase-firestore-compat.js`,
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });
  }

  function setStatus(el, msg) { if (el) el.textContent = msg; }

  // Prevent ANY form from causing navigation (Enter key or implicit submit)
  function blockFormSubmissions() {
    document.querySelectorAll('form').forEach(f => {
      f.addEventListener('submit', e => e.preventDefault());
      f.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
    });
    // Also coerce all buttons to non-submit if author forgot type="button"
    document.querySelectorAll('form button').forEach(btn => {
      if (!btn.getAttribute('type')) btn.setAttribute('type', 'button');
    });
  }

  // Robust CSV line parser: supports quoted fields, commas-in-quotes, double-quotes escaping
  function parseCSV(text) {
    const clean = (text || '').replace(/^\uFEFF/, '').trim();
    if (!clean) return [];
    const lines = clean.split(/\r?\n/);

    const parseLine = (s) =>
      (s.match(/("([^"\\]|\\.|"")*"|[^,]*)(?=,|$)/g) || [])
        .map((c) => c.replace(/^"|"$/g, '').replace(/""/g, '"').trim());

    const headers = parseLine(lines.shift()).map(h => h.toLowerCase());
    if (!headers.length) return [];

    return lines
      .filter(Boolean)
      .map(line => {
        const cols = parseLine(line);
        const obj = {};
        headers.forEach((h, i) => (obj[h] = cols[i] ?? ''));

        return {
          title: obj.title,
          description: obj.description,
          price: parseFloat(obj.price) || 0,
          tags: obj.tags ? obj.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          image1: obj.image1,
          variation: {
            type: obj['variation 1 type'] || '',
            name: obj['variation 1 name'] || '',
            values: obj['variation 1 values']
              ? obj['variation 1 values'].split(',').map(v => v.trim()).filter(Boolean)
              : [],
          },
        };
      })
      .filter(e => e.title);
  }

  // ---------- 1) Load Firebase SDKs (compat to avoid ESM/CORS issues) ----------
  try {
    for (const url of SDKS) await loadScript(url);
  } catch (e) {
    console.error(e);
    alert('Failed to load Firebase SDKs. Check your network and CSP.');
    return;
  }

  // ---------- 2) Firebase init ----------
  // Your config (from your message)
  const firebaseConfig = {
    apiKey: "AIzaSyAaKun3buWr3xXH7DTC1aAMz2NMu4QxA1c",
    authDomain: "testerboys-31725.firebaseapp.com",
    projectId: "testerboys-31725",
    storageBucket: "testerboys-31725.firebasestorage.app",
    messagingSenderId: "486443361948",
    appId: "1:486443361948:web:99d07e60a4fcef240caf59"
  };

  try {
    firebase.initializeApp(firebaseConfig);
  } catch (_) { /* ignore "already exists" in HMR */ }

  const auth = firebase.auth();
  const db   = firebase.firestore();

  // Optional: enable offline persistence (ignore if multi-tab)
  try { await db.enablePersistence?.(); } catch (_) {}

  // Anonymous sign-in (required by the rules snippet)
  try {
    await auth.signInAnonymously();
  } catch (err) {
    console.error('Anon sign-in failed:', err);
    alert('Firebase auth failed: ' + (err?.message || err));
    // Don’t return; Firestore may still work if rules allow public writes (not recommended).
  }

  // ---------- 3) Firestore writer ----------
  async function writeProducts(entries) {
    const batch = db.batch();
    const now = firebase.firestore.FieldValue.serverTimestamp();

    entries.forEach(e => {
      const ref = db.collection('products').doc(); // random ID
      batch.set(ref, { ...e, createdAt: now, updatedAt: now });
    });

    await batch.commit();
  }

  // ---------- 4) Hook up UI ----------
  blockFormSubmissions();

  const singleFile   = document.getElementById('singleFile');
  const singleText   = document.getElementById('singleText');
  const bulkFile     = document.getElementById('bulkFile');
  const bulkText     = document.getElementById('bulkText');

  const singleStatus = document.getElementById('singleStatus');
  const bulkStatus   = document.getElementById('bulkStatus');

  const singleBtn    = document.getElementById('singleUpload');
  const bulkBtn      = document.getElementById('bulkUpload');

  if (!singleBtn || !bulkBtn) {
    console.warn('Upload buttons not found. Check element IDs.');
  }

  singleBtn?.addEventListener('click', async () => {
    try {
      if (!firebase?.apps?.length) throw new Error('Firebase not loaded');
      setStatus(singleStatus, '');
      const file = singleFile?.files?.[0];
      const csv = file ? await file.text() : (singleText?.value || '');
      const entries = parseCSV(csv);
      if (!entries.length) { alert('No valid rows found.'); return; }

      setStatus(singleStatus, 'Uploading to Firestore…');
      await writeProducts([entries[0]]);
      setStatus(singleStatus, 'Product uploaded!');
      document.getElementById('singleForm')?.reset();
    } catch (e) {
      console.error(e);
      alert('Upload failed: ' + (e.message || e));
      setStatus(singleStatus, 'Upload failed.');
    }
  });

  bulkBtn?.addEventListener('click', async () => {
    try {
      if (!firebase?.apps?.length) throw new Error('Firebase not loaded');
      setStatus(bulkStatus, '');
      const file = bulkFile?.files?.[0];
      const csv = file ? await file.text() : (bulkText?.value || '');
      const entries = parseCSV(csv);
      if (!entries.length) { alert('No valid rows found.'); return; }

      setStatus(bulkStatus, 'Uploading to Firestore…');
      await writeProducts(entries);
      setStatus(bulkStatus, 'Products uploaded!');
      document.getElementById('bulkForm')?.reset();
    } catch (e) {
      console.error(e);
      alert('Upload failed: ' + (e.message || e));
      setStatus(bulkStatus, 'Upload failed.');
    }
  });

  // ---------- 5) Optional: iOS-like back swipe ----------
  let startX = 0;
  document.addEventListener('touchstart', e => (startX = e.changedTouches[0].screenX));
  document.addEventListener('touchend', e => {
    if (e.changedTouches[0].screenX - startX > 80) {
      if (history.length > 1) history.back();
      else location.href = './index.html';
    }
  });
})();
